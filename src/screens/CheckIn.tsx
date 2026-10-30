import { useEffect, useState, useCallback } from 'react';
import { GraduationCap, CheckCircle2, Loader2, Wifi, AlertTriangle, QrCode, User, Hash } from 'lucide-react';
import { supabase, GRADE_LABELS } from '@/lib/supabase';

type Phase = 'loading' | 'form' | 'submitting' | 'success' | 'error';
interface SessionInfo { title: string; grade: number; require_code: boolean; status: string; }

export default function CheckIn() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [token, setToken] = useState('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [recordedAt, setRecordedAt] = useState('');

  const fetchSession = useCallback(async (t: string) => {
    const { data, error } = await supabase.rpc('get_session_by_token', { p_token: t });
    if (error || !data || !(data as { ok?: boolean }).ok) {
      setError('الرمز غير صالح أو منتهي الصلاحية. امسح الرمز الحالي مرة أخرى.');
      setPhase('error');
      return;
    }
    const info = data as { ok: boolean; title: string; grade: number; require_code: boolean; status: string };
    if (info.status !== 'active') {
      setError('انتهت الجلسة. راجع الدكتور.');
      setPhase('error');
      return;
    }
    setSessionInfo({ title: info.title, grade: info.grade, require_code: info.require_code, status: info.status });
    setPhase('form');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (!t) {
      setError('لا يوجد رمز تسجيل. امسح QR من شاشة الدكتور.');
      setPhase('error');
      return;
    }
    setToken(t);
    fetchSession(t);
  }, [fetchSession]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('الرجاء إدخال الاسم الرباعي.');
      return;
    }
    if (sessionInfo?.require_code && !code.trim()) {
      setError('الكود الجامعي مطلوب لهذه الجلسة.');
      return;
    }
    setPhase('submitting');
    setError('');
    const { data, error } = await supabase.rpc('submit_attendance', {
      p_token: token,
      p_name: name.trim(),
      p_code: code.trim(),
    });
    if (error) {
      setError('حدث خطأ في الاتصال. حاول مرة أخرى.');
      setPhase('form');
      return;
    }
    const result = data as { ok: boolean; error?: string; recorded_at?: string };
    if (!result.ok) {
      const map: Record<string, string> = {
        name_required: 'الاسم مطلوب.',
        code_required: 'الكود مطلوب لهذه الجلسة.',
        invalid_or_expired_token: 'انتهت صلاحية الرمز. امسح QR الجديد.',
        session_not_active: 'انتهت الجلسة.',
        already_checked_in: 'تم تسجيل حضورك مسبقًا في هذه الجلسة.',
      };
      setError(map[result.error || ''] || 'تعذّر التسجيل.');
      setPhase('form');
      return;
    }
    setRecordedAt(result.recorded_at || new Date().toISOString());
    setPhase('success');
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
        <p className="text-slate-300 mt-4">جارٍ التحقق من الجلسة...</p>
      </Shell>
    );
  }

  if (phase === 'success') {
    return (
      <Shell>
        <div className="w-20 h-20 rounded-full bg-success-500/20 flex items-center justify-center mb-5 animate-pulseGlow">
          <CheckCircle2 className="w-12 h-12 text-success-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">تم تسجيل حضورك</h1>
        <p className="text-slate-400 mt-2 text-center">سُجّلت في «{sessionInfo?.title}»</p>
        <p className="text-sm text-slate-500 mt-3">وقت التسجيل: {new Date(recordedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
      </Shell>
    );
  }

  if (phase === 'error') {
    return (
      <Shell>
        <div className="w-20 h-20 rounded-full bg-danger-500/20 flex items-center justify-center mb-5">
          <AlertTriangle className="w-11 h-11 text-danger-400" />
        </div>
        <h1 className="text-xl font-bold text-white">تعذّر التسجيل</h1>
        <p className="text-slate-400 mt-2 text-center max-w-xs">{error}</p>
      </Shell>
    );
  }

  if (phase === 'submitting') {
    return (
      <Shell>
        <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
        <p className="text-slate-300 mt-4">جارٍ تسجيل الحضور...</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow mb-3">
            <GraduationCap className="w-8 h-8 text-ink-950" />
          </div>
          <h1 className="text-xl font-bold text-white text-center">{sessionInfo?.title || 'تسجيل الحضور'}</h1>
          {sessionInfo && <p className="text-sm text-slate-400 mt-1">{GRADE_LABELS[sessionInfo.grade as 1 | 2 | 3 | 4]}</p>}
        </div>

        <div className="card p-6">
          {sessionInfo?.require_code && (
            <div className="flex items-center gap-2 text-xs text-brand-300 bg-brand-500/10 rounded-lg p-2.5 mb-4">
              <Wifi className="w-4 h-4" />
              تأكد من اتصالك بشبكة الجامعة قبل التسجيل.
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">الاسم الرباعي</label>
              <div className="relative">
                <User className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pr-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك الكامل" autoFocus />
              </div>
            </div>
            {sessionInfo?.require_code && (
              <div>
                <label className="label">الكود الجامعي</label>
                <div className="relative">
                  <Hash className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input pr-11" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" placeholder="20210001" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-danger-400 bg-danger-500/10 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full">
              <CheckCircle2 className="w-5 h-5" /> تسجيل الحضور
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          <QrCode className="w-3.5 h-3.5 inline ml-1" />
          نظام الحضور الجامعي — آمن ومحمي
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="flex flex-col items-center animate-fadeIn">{children}</div>
    </div>
  );
}
