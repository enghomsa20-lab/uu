import { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Upload, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase, type Student, type Session, type AttendanceRecord, type AuditEntry } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { logAction, formatDate } from '@/lib/helpers';
import PageHeader from '@/components/PageHeader';
import { Loading } from '@/components/Loading';

interface BackupData {
  exported_at: string;
  students: Student[];
  sessions: Session[];
  attendance_records: AttendanceRecord[];
  audit_log: AuditEntry[];
}

export default function BackupScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [counts, setCounts] = useState({ students: 0, sessions: 0, records: 0 });

  async function loadCounts() {
    setLoading(true);
    const [s, sess, r] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }),
    ]);
    setCounts({ students: s.count ?? 0, sessions: sess.count ?? 0, records: r.count ?? 0 });
    setLastBackup(localStorage.getItem('last-backup'));
    setLoading(false);
  }

  useEffect(() => { loadCounts(); }, []);

  async function doExport() {
    setExporting(true);
    try {
      const [s, sess, r, a] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('attendance_records').select('*'),
        supabase.from('audit_log').select('*'),
      ]);
      const data: BackupData = {
        exported_at: new Date().toISOString(),
        students: (s.data as Student[]) ?? [],
        sessions: (sess.data as Session[]) ?? [],
        attendance_records: (r.data as AttendanceRecord[]) ?? [],
        audit_log: (a.data as AuditEntry[]) ?? [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hudour-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      const now = new Date().toISOString();
      localStorage.setItem('last-backup', now);
      setLastBackup(now);
      toast.push('success', `تم إنشاء نسخة احتياطية (${data.students.length} طالب، ${data.attendance_records.length} سجل).`);
      logAction('نسخة احتياطية', `تصدير ${data.students.length} طالب و${data.attendance_records.length} سجل`);
    } catch {
      toast.push('error', 'فشل التصدير.');
    }
    setExporting(false);
  }

  async function doImport(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<BackupData>;
      if (!data.exported_at) throw new Error('ملف غير صالح');
      let restored = 0;
      if (Array.isArray(data.students) && data.students.length) {
        const rows = data.students.map(({ id, ...rest }) => rest);
        const { error } = await supabase.from('students').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        restored += rows.length;
      }
      if (Array.isArray(data.sessions) && data.sessions.length) {
        const rows = data.sessions.map(({ id, ...rest }) => rest);
        const { error } = await supabase.from('sessions').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        restored += rows.length;
      }
      toast.push('success', `تمت استعادة ${restored} سجل.`);
      logAction('استعادة نسخة', `${restored} عنصر`);
      loadCounts();
    } catch (e) {
      toast.push('error', 'فشل الاستيراد: ' + (e as Error).message);
    }
    setImporting(false);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="النسخ الاحتياطي"
        subtitle="حماية واستعادة بيانات النظام"
        icon={<DatabaseBackup className="w-6 h-6" />}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat label="الطلاب" value={counts.students} />
        <Stat label="الجلسات" value={counts.sessions} />
        <Stat label="سجلات الحضور" value={counts.records} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="w-12 h-12 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-4">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-white text-lg mb-2">إنشاء نسخة احتياطية</h2>
          <p className="text-sm text-slate-400 mb-4">يصدّر جميع الطلاب والجلسات والسجلات إلى ملف JSON يمكن حفظه محليًا.</p>
          <button onClick={doExport} disabled={exporting} className="btn-primary w-full">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'جارٍ التصدير...' : 'تصدير نسخة احتياطية'}
          </button>
          {lastBackup && (
            <p className="text-xs text-slate-500 mt-3 text-center">آخر نسخة: {formatDate(lastBackup)}</p>
          )}
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-white text-lg mb-2">استعادة البيانات</h2>
          <p className="text-sm text-slate-400 mb-4">يستورد بيانات من ملف نسخة احتياطية سابق. لن يحذف البيانات الحالية.</p>
          <label className="btn-outline w-full cursor-pointer">
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'جارٍ الاستيراد...' : 'اختيار ملف للاستعادة'}
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); }} />
          </label>
        </div>
      </div>

      <div className="card p-5 mt-5">
        <h3 className="font-bold text-white flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-success-500" /> سلامة البيانات</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-500" /> البيانات مخزّنة في قاعدة بيانات Postgres محمية بنظام صلاحيات RLS.</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-500" /> كل دكتور يرى بياناته فقط.</li>
          <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> يُنصح بإنشاء نسخة احتياطية أسبوعيًا على الأقل.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}
