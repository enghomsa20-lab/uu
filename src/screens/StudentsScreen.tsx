import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Plus, Search, Pencil, Trash2, Upload, X, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Filter,
} from 'lucide-react';
import { supabase, type Student, type Grade, GRADE_LABELS } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { logAction } from '@/lib/helpers';
import PageHeader from '@/components/PageHeader';
import { Loading, EmptyState } from '@/components/Loading';

const GRADES: Grade[] = [1, 2, 3, 4];

export default function StudentsScreen() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | 0>(0);
  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('students').select('*').order('grade').order('name');
    if (error) toast.push('error', 'تعذّر تحميل الطلاب.');
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('import') === '1') setShowImport(true);
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, query, gradeFilter]);

  async function handleSave(data: { name: string; code: string; grade: Grade; notes: string }) {
    if (editing) {
      const { error } = await supabase.from('students').update(data).eq('id', editing.id);
      if (error) return toast.push('error', 'تعذّر حفظ التعديلات.');
      toast.push('success', 'تم تعديل بيانات الطالب.');
      logAction('تعديل طالب', `${data.name} (${data.code})`);
    } else {
      const { error } = await supabase.from('students').insert(data);
      if (error) return toast.push('error', 'تعذّر إضافة الطالب.');
      toast.push('success', 'تمت إضافة الطالب.');
      logAction('إضافة طالب', `${data.name} (${data.code})`);
    }
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function handleDelete(s: Student) {
    if (!confirm(`حذف الطالب "${s.name}"؟ لا يمكن التراجع.`)) return;
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) return toast.push('error', 'تعذّر الحذف.');
    toast.push('success', 'تم حذف الطالب.');
    logAction('حذف طالب', `${s.name} (${s.code})`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="إدارة الطلاب"
        subtitle={`${students.length} طالب مسجّل`}
        icon={<Users className="w-6 h-6" />}
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-outline">
              <Upload className="w-4 h-4" /> استيراد Excel
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> إضافة طالب
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pr-11"
              placeholder="ابحث بالاسم أو الكود..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <button onClick={() => setGradeFilter(0)} className={`chip ${gradeFilter === 0 ? 'bg-brand-500 text-ink-950' : 'bg-white/5 text-slate-300'}`}>الكل</button>
            {GRADES.map((g) => (
              <button key={g} onClick={() => setGradeFilter(g)} className={`chip ${gradeFilter === g ? 'bg-brand-500 text-ink-950' : 'bg-white/5 text-slate-300'}`}>
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="w-8 h-8" />} title="لا يوجد طلاب" hint="أضف طلابًا يدويًا أو استورد قائمة Excel." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-white/10">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">الاسم</th>
                  <th className="px-5 py-3 font-medium">الكود</th>
                  <th className="px-5 py-3 font-medium">الفرقة</th>
                  <th className="px-5 py-3 font-medium">ملاحظات</th>
                  <th className="px-5 py-3 font-medium text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-5 py-3 text-white font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-slate-300" dir="ltr">{s.code || '—'}</td>
                    <td className="px-5 py-3"><span className="chip bg-indigo-500/15 text-indigo-300">{GRADE_LABELS[s.grade]}</span></td>
                    <td className="px-5 py-3 text-slate-400 max-w-[200px] truncate">{s.notes || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditing(s); setShowForm(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-brand-300" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-2 rounded-lg text-slate-400 hover:bg-danger-500/15 hover:text-danger-400" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StudentForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {showImport && (
        <ImportModal
          existing={students}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}

function StudentForm({
  initial, onClose, onSave,
}: {
  initial: Student | null;
  onClose: () => void;
  onSave: (d: { name: string; code: string; grade: Grade; notes: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return;
    setSaving(true);
    await onSave({ name: name.trim(), code: code.trim(), grade, notes: notes.trim() });
    setSaving(false);
  }

  return (
    <Modal title={initial ? 'تعديل طالب' : 'إضافة طالب'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">الاسم</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الرباعي" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">الكود الجامعي</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="label">الفرقة</label>
            <select className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value) as Grade)}>
              {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">ملاحظات</label>
          <textarea className="input min-h-[80px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  );
}

interface ParsedRow { name: string; code: string; grade: Grade; notes: string; dup: boolean; }

function ImportModal({ existing, onClose, onDone }: { existing: Student[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCsv(text: string): ParsedRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const result: ParsedRow[] = [];
    const existingCodes = new Set(existing.map((s) => s.code).filter(Boolean));
    const seenCodes = new Set<string>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // skip a header row if it contains arabic letters "الاسم" or "name"
      if (i === 0 && /الاسم|name|code/i.test(line)) continue;
      const cols = line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      const name = cols[0];
      const code = cols[1] ?? '';
      const gradeNum = Number(cols[2] ?? 1);
      const grade = (gradeNum >= 1 && gradeNum <= 4 ? gradeNum : 1) as Grade;
      const notes = cols[3] ?? '';
      if (!name) continue;
      const dup = (code !== '' && (existingCodes.has(code) || seenCodes.has(code)));
      if (code) seenCodes.add(code);
      result.push({ name, code, grade, notes, dup });
    }
    return result;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsv(text);
      if (parsed.length === 0) toast.push('error', 'لم يتم العثور على بيانات صالحة في الملف.');
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const csv = '\uFEFFالاسم,الكود,الفرقة,ملاحظات\nأحمد محمد علي,2021001,1,\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport() {
    const valid = rows.filter((r) => !r.dup && r.name);
    if (valid.length === 0) return toast.push('error', 'لا توجد صفوف صالحة للاستيراد.');
    setImporting(true);
    const { error } = await supabase.from('students').insert(valid.map(({ name, code, grade, notes }) => ({ name, code, grade, notes })));
    setImporting(false);
    if (error) return toast.push('error', 'فشل الاستيراد: ' + error.message);
    toast.push('success', `تم استيراد ${valid.length} طالب.`);
    logAction('استيراد طلاب', `${valid.length} طالب`);
    onDone();
  }

  const validCount = rows.filter((r) => !r.dup).length;
  const dupCount = rows.length - validCount;

  return (
    <Modal title="استيراد قائمة الطلاب" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => fileRef.current?.click()} className="btn-primary">
            <FileSpreadsheet className="w-4 h-4" /> اختيار ملف CSV
          </button>
          <button onClick={downloadTemplate} className="btn-outline">تحميل قالب</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>
        <p className="text-xs text-slate-400">
          يدعم ملفات CSV أو TXT بترتيب: الاسم، الكود، الفرقة (1-4)، ملاحظات. يمكنك تصدير ملف Excel كـ CSV ثم استيراده.
        </p>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="chip bg-success-500/15 text-success-500"><CheckCircle2 className="w-4 h-4" /> {validCount} صالح</span>
              {dupCount > 0 && <span className="chip bg-danger-500/15 text-danger-400"><AlertTriangle className="w-4 h-4" /> {dupCount} مكرر</span>}
            </div>
            <div className="rounded-xl border border-white/10 overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-900">
                  <tr className="text-right text-slate-400">
                    <th className="px-4 py-2 font-medium">الاسم</th>
                    <th className="px-4 py-2 font-medium">الكود</th>
                    <th className="px-4 py-2 font-medium">الفرقة</th>
                    <th className="px-4 py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-b border-white/5 ${r.dup ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 text-white">{r.name}</td>
                      <td className="px-4 py-2 text-slate-300" dir="ltr">{r.code || '—'}</td>
                      <td className="px-4 py-2">{GRADE_LABELS[r.grade]}</td>
                      <td className="px-4 py-2">
                        {r.dup ? <span className="chip bg-danger-500/15 text-danger-400">مكرر</span> : <span className="chip bg-success-500/15 text-success-500">جديد</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-ghost">إلغاء</button>
              <button onClick={doImport} disabled={importing || validCount === 0} className="btn-primary">
                {importing ? 'جارٍ الاستيراد...' : `استيراد ${validCount} طالب`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-ink-900/80 backdrop-blur z-10">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
