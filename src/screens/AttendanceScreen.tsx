import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, CalendarDays, Search, Pencil, FileDown, Clock, ChevronLeft,
  Users, Archive,
} from 'lucide-react';
import { supabase, type Session, type AttendanceRecord, GRADE_LABELS, STATUS_LABELS } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { logAction, formatDate, formatTime, dateKey } from '@/lib/helpers';
import PageHeader from '@/components/PageHeader';
import { Loading, EmptyState } from '@/components/Loading';
import { Modal } from '@/screens/StudentsScreen';

export default function AttendanceScreen() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: sess }, { data: rec }] = await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('attendance_records').select('*').order('recorded_at', { ascending: false }),
    ]);
    setSessions((sess as Session[]) ?? []);
    setRecords((rec as AttendanceRecord[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      const key = dateKey(r.recorded_at);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [records]);

  const sessionMap = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const sessionDates = useMemo(() => {
    const set = new Set(sessions.map((s) => dateKey(s.created_at)));
    return set;
  }, [sessions]);

  const filteredRecords = useMemo(() => {
    let r = records;
    if (selectedSession) r = r.filter((x) => x.session_id === selectedSession);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((x) => x.student_name.toLowerCase().includes(q) || x.student_code.toLowerCase().includes(q));
    }
    return r;
  }, [records, selectedSession, query]);

  async function exportCsv() {
    const rows = filteredRecords;
    if (rows.length === 0) return toast.push('error', 'لا توجد بيانات للتصدير.');
    const lines = ['\uFEFFالاسم,الكود,الجلسة,وقت التسجيل,نوع'];
    for (const r of rows) {
      const s = sessionMap.get(r.session_id);
      const cells = [r.student_name, r.student_code, s?.title || '', formatTime(r.recorded_at), r.manual ? 'يدوي' : 'QR'].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateKey(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push('success', 'تم تصدير الملف.');
    logAction('تصدير حضور', `${rows.length} سجل`);
  }

  async function saveEdit(id: string, name: string, code: string, reason: string) {
    if (reason.trim().length < 3) return toast.push('error', 'سبب التعديل مطلوب (3 أحرف على الأقل).');
    const { error } = await supabase.from('attendance_records').update({
      student_name: name.trim(),
      student_code: code.trim(),
      edit_reason: reason.trim(),
      edited_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return toast.push('error', 'تعذّر حفظ التعديل.');
    toast.push('success', 'تم تعديل السجل.');
    logAction('تعديل سجل حضور', `${name} — ${reason}`);
    setEditing(null);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="الحضور والغياب"
        subtitle="أرشيف جلسات التسجيل"
        icon={<CalendarCheck className="w-6 h-6" />}
        action={
          <button onClick={exportCsv} className="btn-outline">
            <FileDown className="w-4 h-4" /> تصدير CSV
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar / sessions */}
        <div className="card p-5">
          <h2 className="font-bold text-white flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-brand-400" /> الجلسات
          </h2>
          <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-none">
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">لا توجد جلسات</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(selectedSession === s.id ? '' : s.id)}
                  className={`w-full text-right rounded-xl p-3 border transition ${
                    selectedSession === s.id ? 'bg-brand-500/15 border-brand-400/30' : 'bg-ink-800/40 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{s.title || 'جلسة'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{formatDate(s.created_at)}</span>
                    <span className="text-xs text-slate-500">{GRADE_LABELS[s.grade]}</span>
                  </div>
                  <span className={`chip mt-2 text-[10px] ${s.status === 'active' ? 'bg-success-500/15 text-success-500' : 'bg-slate-500/15 text-slate-400'}`}>{STATUS_LABELS[s.status]}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Records */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-brand-400" /> السجلات
              <span className="chip bg-brand-500/15 text-brand-300 mr-2">{filteredRecords.length}</span>
            </h2>
            <div className="relative w-40">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pr-9 py-2 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..." />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="لا توجد سجلات" hint="اختر جلسة أو عدّل البحث." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-400 border-b border-white/10">
                    <th className="px-3 py-2 font-medium">الاسم</th>
                    <th className="px-3 py-2 font-medium">الكود</th>
                    <th className="px-3 py-2 font-medium">الوقت</th>
                    <th className="px-3 py-2 font-medium">الجلسة</th>
                    <th className="px-3 py-2 font-medium text-left">تعديل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 100).map((r) => {
                    const s = sessionMap.get(r.session_id);
                    return (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2.5 text-white font-medium">{r.student_name}</td>
                        <td className="px-3 py-2.5 text-slate-300" dir="ltr">{r.student_code || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(r.recorded_at)}</td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs truncate max-w-[120px]">{s?.title || '—'}</td>
                        <td className="px-3 py-2.5 text-left">
                          <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-brand-300">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditRecordModal record={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </div>
  );
}

function EditRecordModal({ record, onClose, onSave }: { record: AttendanceRecord; onClose: () => void; onSave: (id: string, n: string, c: string, r: string) => Promise<void> }) {
  const [name, setName] = useState(record.student_name);
  const [code, setCode] = useState(record.student_code);
  const [reason, setReason] = useState(record.edit_reason);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(record.id, name, code, reason);
    setSaving(false);
  }

  return (
    <Modal title="تعديل سجل حضور" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">الاسم</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">الكود</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
        </div>
        <div>
          <label className="label">سبب التعديل</label>
          <textarea className="input min-h-[70px] resize-none" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تصحيح خطأ إملائي في الاسم" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}</button>
        </div>
      </form>
    </Modal>
  );
}
