import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, ClipboardList, UserSquare2,
  Monitor, DatabaseBackup, LogOut, Menu, X, GraduationCap, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const nav = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'إدارة الطلاب', icon: Users },
  { to: '/sessions', label: 'جلسات الحضور', icon: ClipboardList },
  { to: '/attendance', label: 'الحضور والغياب', icon: CalendarCheck },
  { to: '/hdmi', label: 'شاشة HDMI', icon: Monitor },
  { to: '/backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { doctor, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 inset-y-0 right-0 w-72 glass-strong border-l border-white/10 transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-ink-950" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">نظام الحضور</p>
              <p className="text-xs text-slate-400">الإصدار 1.0</p>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden mr-auto text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-brand-500/15 text-brand-300 border border-brand-400/30' : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronLeft className={`w-4 h-4 transition ${active ? 'text-brand-400' : 'text-slate-600'}`} />
                </NavLink>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold">
                {doctor?.full_name?.[0] ?? 'د'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{doctor?.full_name || 'دكتور'}</p>
                <p className="text-xs text-slate-400 truncate">{doctor?.department || '—'}</p>
              </div>
            </div>
            <button onClick={signOut} className="btn-ghost w-full justify-start text-danger-400 hover:bg-danger-500/10">
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 glass-strong border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setOpen(true)} className="text-slate-200">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-white">نظام الحضور</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
