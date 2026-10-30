import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, Radio, Archive, CalendarDays } from 'lucide-react';
import { supabase, type Session, type Grade, GRADE_LABELS, STATUS_LABELS } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { logAction, formatDate } from '@/lib/helpers';
import PageHeader from '@/components/PageHeader';
import { Loading, EmptyState } from '@/components/Loading';
import { Modal } from '@/screens/StudentsScreen';

const GRADES: Grade[] = [1, 2, 3, 4];

export default function SessionsScreen() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (error) toast.push('error', 'تعذّر تحميل الجلسات.');
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: {
    title: string; grade: Grade; wifi_ssid: string; wifi_password: string;
    require_code: boolean; qr_interval_sec: number;
  }) {
    const { error } = await supabase.from('sessions').insert({ ...data, status: 'draft' });
    if (error) return toast.push('error', 'تعذّر إنشاء الجلسة.');
    toast.push('success', 'تم إنشاء الجلسة.');
    logAction('إنشاء جلسة', `${data.title || 'بدون عنوان'} - ${GRADE_LABELS[data.grade]}`);
    setShowForm(false);
    load();
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-500/15 text-slate-300',
    active: 'bg-success-500/15 text-success-500',
    ended: 'bg-amber-500/15 text-amber-400',
    closed: 'bg-danger-500/15 text-danger-400',
  };

  return (
    <div>
      <PageHeader
        title="جلسات الحضور"
        subtitle={`${sessions.length} جلسة`}
        icon={<ClipboardList className="w-6 h-6" />}
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> جلسة جديدة
          </button>
        }
      />

      {loading ? (
        <Loading />
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="لا توجد جلسات بعد" hint="أنشئ جلسة حضور جديدة لبدء التسجيل." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <Link key={s.id} to={`/sessions/${s.id}`} className="card p-5 hover:border-brand-400/30 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
                  {s.status === 'active' ? <Radio className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                </div>
                <span className={`chip ${statusColor[s.status]}`}>{STATUS_LABELS[s.status]}</span>
              </div>
              <p className="font-bold text-white group-hover:text-brand-200">{s.title || 'جلسة بدون عنوان'}</p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-400">
                <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {formatDate(s.created_at)}</p>
                <p>{GRADE_LABELS[s.grade]}</p>
                <p dir="ltr" className="text-right">SSID: {s.wifi_ssid || '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <SessionForm onClose={() => setShowForm(false)} onSave={handleCreate} />}
    </div>
  );
}

function SessionForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: {
    title: string; grade: Grade; wifi_ssid: string; wifi_password: string;
    require_code: boolean; qr_interval_sec: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState<Grade>(1);
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');
  const [requireCode, setRequireCode] = useState(true);
  const [interval, setInterval] = useState(15);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ title: title.trim(), grade, wifi_ssid: ssid.trim(), wifi_password: pass, require_code: requireCode, qr_interval_sec: interval });
    setSaving(false);
  }

  return (
    <Modal title="إنشاء جلسة حضور" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">عنوان الجلسة</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="محاضرة الأسبوع 3" autoFocus />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">الفرقة</label>
            <select className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value) as Grade)}>
              {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">فترة تغيير QR (ثانية)</label>
            <input type="number" min={5} max={300} className="input" value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">اسم شبكة Wi-Fi (SSID)</label>
            <input className="input" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Univ-Lab" dir="ltr" />
          </div>
          <div>
            <label className="label">كلمة مرور Wi-Fi</label>
            <input className="input" value={pass} onChange={(e) => setPass(e.target.value)} dir="ltr" />
          </div>
        </div>
        <label className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50 cursor-pointer">
          <input type="checkbox" checked={requireCode} onChange={(e) => setRequireCode(e.target.checked)} className="w-5 h-5 accent-brand-500" />
          <div>
            <p className="text-sm font-medium text-white">اشتراط الكود الجامعي</p>
            <p className="text-xs text-slate-400">يُلزم الطلاب بإدخال الكود عند التسجيل</p>
          </div>
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'جارٍ الإنشاء...' : 'إنشاء الجلسة'}</button>
        </div>
      </form>
    </Modal>
  );
}
