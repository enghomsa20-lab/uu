import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardList, CalendarCheck, Radio, UserPlus, FileSpreadsheet,
  PlayCircle, Archive, TrendingUp, Activity,
} from 'lucide-react';
import { supabase, type Session, type AuditEntry, GRADE_LABELS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, todayKey } from '@/lib/helpers';
import PageHeader from '@/components/PageHeader';
import { Loading } from '@/components/Loading';

interface Stats {
  students: number;
  sessions: number;
  activeSessions: number;
  todayAttendance: number;
}

export default function Dashboard() {
  const { doctor } = useAuth();
  const [stats, setStats] = useState<Stats>({ students: 0, sessions: 0, activeSessions: 0, todayAttendance: 0 });
  const [active, setActive] = useState<Session[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = todayKey();
      const [
        { count: students },
        { count: sessions },
        { data: activeData },
        { count: todayAtt },
        { data: auditData },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('attendance_records').select('*', { count: 'exact', head: true }).gte('recorded_at', `${today}T00:00:00`),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(8),
      ]);

      setStats({
        students: students ?? 0,
        sessions: sessions ?? 0,
        activeSessions: activeData?.length ?? 0,
        todayAttendance: todayAtt ?? 0,
      });
      setActive((activeData as Session[]) ?? []);
      setAudit((auditData as AuditEntry[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading />;

  const cards = [
    { label: 'إجمالي الطلاب', value: stats.students, icon: Users, color: 'from-brand-400 to-brand-600' },
    { label: 'جلسات المحاضرات', value: stats.sessions, icon: ClipboardList, color: 'from-indigo-400 to-indigo-600' },
    { label: 'حضور اليوم', value: stats.todayAttendance, icon: CalendarCheck, color: 'from-emerald-400 to-emerald-600' },
    { label: 'الجلسات النشطة', value: stats.activeSessions, icon: Radio, color: 'from-amber-400 to-amber-600' },
  ];

  const shortcuts = [
    { to: '/students', label: 'إضافة طالب', icon: UserPlus, desc: 'سجّل طالبًا جديدًا' },
    { to: '/sessions', label: 'إنشاء جلسة', icon: PlayCircle, desc: 'ابدأ جلسة حضور' },
    { to: '/students?import=1', label: 'استيراد Excel', icon: FileSpreadsheet, desc: 'رفع قائمة الطلاب' },
    { to: '/attendance', label: 'أرشيف الحضور', icon: Archive, desc: 'مراجعة السجلات' },
  ];

  return (
    <div>
      <PageHeader
        title={`أهلاً، ${doctor?.full_name?.split(' ')[0] || 'دكتور'}`}
        subtitle="نظرة عامة على نشاط نظام الحضور اليوم"
        icon={<TrendingUp className="w-6 h-6" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-white">{c.value}</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-brand-400" /> الجلسات النشطة
            </h2>
            <Link to="/sessions" className="text-sm text-brand-300 hover:text-brand-200">عرض الكل</Link>
          </div>
          {active.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              لا توجد جلسات نشطة حالياً. <Link to="/sessions" className="text-brand-300">ابدأ جلسة جديدة</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((s) => (
                <Link key={s.id} to={`/sessions/${s.id}`} className="block rounded-xl bg-ink-800/50 border border-white/5 p-4 hover:border-brand-400/30 transition group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white group-hover:text-brand-200">{s.title || 'جلسة بدون عنوان'}</p>
                      <p className="text-xs text-slate-400 mt-1">{GRADE_LABELS[s.grade]} • {formatDate(s.created_at)}</p>
                    </div>
                    <span className="chip bg-success-500/15 text-success-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" /> نشطة
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-400" /> آخر النشاطات
          </h2>
          {audit.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">لا يوجد نشاط مسجّل</div>
          ) : (
            <div className="space-y-3">
              {audit.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate">{a.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold text-white mt-8 mb-4">اختصارات الإدارة</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to} className="card p-5 hover:border-brand-400/30 transition group">
              <div className="w-11 h-11 rounded-xl bg-white/5 group-hover:bg-brand-500/15 flex items-center justify-center mb-3 transition">
                <Icon className="w-5 h-5 text-brand-300" />
              </div>
              <p className="font-semibold text-white text-sm">{s.label}</p>
              <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
