import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Radio, Play, Square, StopCircle, Lock, Unlock, Plus, Wifi, KeyRound,
  QrCode, RefreshCw, CheckCircle2, Clock, User, Search, ArrowRight,
} from 'lucide-react';
import { supabase, type Session, type AttendanceRecord, type Student, GRADE_LABELS, STATUS_LABELS } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { logAction, formatTime } from '@/lib/helpers';
import { makeQrDataUrl } from '@/lib/qr';
import { Loading } from '@/components/Loading';
import { Modal } from '@/screens/StudentsScreen';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [currentToken, setCurrentToken] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = `${window.location.origin}/checkin`;

  const loadSession = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.push('error', error?.message || 'تعذّر تحميل الجلسة.');
      navigate('/sessions');
      return;
    }
    setSession(data as Session);
    setLoading(false);
  }, [id, navigate, toast]);

  const loadRecords = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', id)
      .order('recorded_at', { ascending: false });
    setRecords((data as AttendanceRecord[]) ?? []);
  }, [id]);

  useEffect(() => {
    loadSession();
    loadRecords();
    const sub = supabase
      .channel(`attendance-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${id}` }, (payload) => {
        setRecords((r) => [payload.new as AttendanceRecord, ...r]);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [id, loadSession, loadRecords]);

  const rotateToken = useCallback(async () => {
    if (!session || session.status !== 'active') return;
    const { data, error } = await supabase.rpc('rotate_session_token', { p_session_id: session.id });
    if (error || typeof data !== 'string' || data.length === 0) {
      toast.push('error', error?.message || 'تعذّر توليد رمز جديد. حاول إعادة تشغيل الجلسة.');
      return;
    }
    const token = data as string;
    setCurrentToken(token);
    setSecondsLeft(session.qr_interval_sec);
    const payload = `${baseUrl}?t=${token}`;
    const url = await makeQrDataUrl(payload);
    setQrUrl(url);
  }, [session, baseUrl, toast]);

  // Start rotation when session becomes active
  useEffect(() => {
    if (session?.status === 'active') {
      rotateToken();
      rotationTimer.current = setInterval(rotateToken, session.qr_interval_sec * 1000);
      countdownTimer.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    } else {
      setQrUrl('');
      setCurrentToken('');
      setSecondsLeft(0);
    }
    return () => {
      if (rotationTimer.current) clearInterval(rotationTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [session?.status, session?.qr_interval_sec, rotateToken]);

  async function updateStatus(status: Session['status']) {
    if (!session) return;
    const patch: Partial<Session> = { status };
    if (status === 'active' && !session.started_at) patch.started_at = new Date().toISOString();
    if (status === 'ended') patch.ended_at = new Date().toISOString();
    const { error } = await supabase.from('sessions').update(patch).eq('id', session.id);
    if (error) return toast.push('error', 'تعذّر تحديث حالة الجلسة.');
    setSession({ ...session, ...patch });
    toast.push('success', `تم ${STATUS_LABELS[status]} الجلسة.`);
    logAction('تحديث حالة الجلسة', `${session.title} → ${STATUS_LABELS[status]}`);
  }

  async function addManual(name: string, code: string) {
    if (!session) return;
    const { error } = await supabase.from('attendance_records').insert({
      session_id: session.id,
      student_name: name.trim(),
      student_code: code.trim(),
      manual: true,
    });
    if (error) return toast.push('error', 'تعذّر التسجيل اليدوي.');
    toast.push('success', 'تم تسجيل الحضور يدويًا.');
    logAction('تسجيل يدوي', `${name} (${code})`);
    setShowManual(false);
    loadRecords();
  }

  if (loading || !session) return <Loading />;

  const active = session.status === 'active';
  const progress = active ? Math.round(((session.qr_interval_sec - secondsLeft) / session.qr_interval_sec) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <button onClick={() => navigate('/sessions')} className="hover:text-slate-200 flex items-center gap-1">
          الجلسات <ArrowRight className="w-4 h-4" />
        </button>
        <span>/</span>
        <span className="text-slate-200">{session.title || 'جلسة'}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* QR Panel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-400" /> رمز الحضور
            </h2>
            <span className={`chip ${active ? 'bg-success-500/15 text-success-500' : 'bg-slate-500/15 text-slate-400'}`}>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />}
              {STATUS_LABELS[session.status]}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 mx-auto w-full max-w-[320px] aspect-square flex items-center justify-center relative overflow-hidden">
            {active && qrUrl ? (
              <img src={qrUrl} alt="QR" className="w-full h-full object-contain animate-fadeIn" key={currentToken} />
            ) : (
              <div className="text-center text-slate-400">
                <QrCode className="w-16 h-16 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{active ? 'جارٍ توليد الرمز...' : 'ابدأ الجلسة لعرض الرمز'}</p>
              </div>
            )}
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
                <div className="h-full bg-brand-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {active && (
            <p className="text-center text-sm text-slate-400 mt-4 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> يتغيّر خلال {secondsLeft} ثانية
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-ink-800/50 p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> الشبكة</p>
              <p className="text-sm text-white font-medium mt-1 truncate" dir="ltr">{session.wifi_ssid || '—'}</p>
            </div>
            <div className="rounded-xl bg-ink-800/50 p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> كلمة المرور</p>
              <p className="text-sm text-white font-medium mt-1 truncate" dir="ltr">{session.wifi_password || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {!active && session.status === 'draft' && (
              <button onClick={() => updateStatus('active')} className="btn-primary flex-1">
                <Play className="w-4 h-4" /> بدء الجلسة
              </button>
            )}
            {active && (
              <>
                <button onClick={() => updateStatus('ended')} className="btn-outline flex-1">
                  <Square className="w-4 h-4" /> إيقاف
                </button>
                <button onClick={() => updateStatus('closed')} className="btn-danger flex-1">
                  <Lock className="w-4 h-4" /> إنهاء وإغلاق
                </button>
              </>
            )}
            {session.status === 'ended' && (
              <button onClick={() => updateStatus('active')} className="btn-outline flex-1">
                <Unlock className="w-4 h-4" /> إعادة فتح
              </button>
            )}
            {session.status === 'closed' && (
              <button onClick={() => updateStatus('active')} className="btn-outline flex-1">
                <Unlock className="w-4 h-4" /> إعادة فتح
              </button>
            )}
          </div>
        </div>

        {/* Attendance Panel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-400" /> التسجيلات المباشرة
            </h2>
            <div className="flex items-center gap-2">
              <span className="chip bg-brand-500/15 text-brand-300">{records.length} مسجّل</span>
              {active && (
                <button onClick={() => setShowManual(true)} className="btn-ghost text-sm py-1.5 px-3">
                  <Plus className="w-4 h-4" /> تسجيل يدوي
                </button>
              )}
            </div>
          </div>

          {records.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              لا توجد تسجيلات بعد. سيظهر الطلاب هنا فور تسجيلهم.
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-none">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-ink-800/40 p-3 border border-white/5 animate-fadeIn">
                  <div className="w-9 h-9 rounded-full bg-brand-500/15 text-brand-300 flex items-center justify-center text-sm font-bold shrink-0">
                    {r.student_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{r.student_name}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{r.student_code || 'بدون كود'}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(r.recorded_at)}</p>
                    {r.manual && <span className="chip bg-amber-500/15 text-amber-400 text-[10px] px-2 py-0.5 mt-0.5">يدوي</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showManual && (
        <ManualRecordModal studentsGrade={session.grade} onClose={() => setShowManual(false)} onSave={addManual} />
      )}
    </div>
  );
}

function ManualRecordModal({ studentsGrade, onClose, onSave }: { studentsGrade: number; onClose: () => void; onSave: (n: string, c: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (query.trim().length < 2) { setMatches([]); return; }
      const q = query.trim();
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('grade', studentsGrade)
        .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
        .limit(6);
      setMatches((data as Student[]) ?? []);
    })();
  }, [query, studentsGrade]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return;
    setSaving(true);
    await onSave(name, code);
    setSaving(false);
  }

  return (
    <Modal title="تسجيل حضور يدوي" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">بحث عن طالب (اختياري)</label>
          <div className="relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pr-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود..." />
          </div>
          {matches.length > 0 && (
            <div className="mt-2 space-y-1">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setName(m.name); setCode(m.code); setQuery(''); setMatches([]); }}
                  className="w-full text-right rounded-lg bg-ink-800/50 hover:bg-white/5 p-2.5 text-sm flex justify-between items-center"
                >
                  <span className="text-white">{m.name}</span>
                  <span className="text-slate-400" dir="ltr">{m.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label">الاسم</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الرباعي" />
        </div>
        <div>
          <label className="label">الكود</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'جارٍ الحفظ...' : 'تسجيل'}</button>
        </div>
      </form>
    </Modal>
  );
}
