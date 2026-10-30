import { useState } from 'react';
import { GraduationCap, Mail, Lock, User, Building2, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export default function AuthScreen() {
  const { signIn, signUp, loading } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) toast.push('error', error);
      else toast.push('success', 'تم تسجيل الدخول بنجاح');
    } else {
      if (fullName.trim().length < 3) return toast.push('error', 'الرجاء إدخال الاسم الكامل.');
      if (password.length < 6) return toast.push('error', 'كلمة المرور 6 أحرف على الأقل.');
      const { error } = await signUp(fullName.trim(), department.trim(), email.trim(), password);
      if (error) {
        toast.push('error', error);
      } else {
        toast.push('success', 'تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.');
        setMode('login');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow mb-4">
            <GraduationCap className="w-9 h-9 text-ink-950" />
          </div>
          <h1 className="text-2xl font-bold text-white">نظام الحضور الجامعي</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة حضور وغياب الطلاب عبر شبكة Wi-Fi محلية</p>
        </div>

        <div className="card p-7">
          <div className="flex gap-2 p-1 rounded-xl bg-ink-900/60 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${mode === 'login' ? 'bg-brand-500 text-ink-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${mode === 'signup' ? 'bg-brand-500 text-ink-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">الاسم الكامل</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input pr-11" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="د. محمد أحمد" />
                  </div>
                </div>
                <div>
                  <label className="label">القسم</label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input pr-11" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="هندسة البرمجيات" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pr-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@univ.edu" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pr-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </button>
          </form>

          {mode === 'signup' && (
            <button onClick={() => setMode('login')} className="mt-5 w-full flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-4 h-4" /> لديّ حساب بالفعل
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          يعمل محليًا • بيانات كل دكتور معزولة بالكامل • محمي بنظام الصلاحيات
        </p>
      </div>
    </div>
  );
}
