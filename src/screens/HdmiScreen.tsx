import { useEffect, useState } from 'react';
import { Monitor, EyeOff, Eye, QrCode, Wifi, KeyRound, ShieldCheck } from 'lucide-react';
import { useToast } from '@/lib/toast';
import PageHeader from '@/components/PageHeader';

export default function HdmiScreen() {
  const toast = useToast();
  const [showOnExternal, setShowOnExternal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('hdmi-show');
    if (stored === '1') setShowOnExternal(true);
  }, []);

  function toggle(val: boolean) {
    setShowOnExternal(val);
    localStorage.setItem('hdmi-show', val ? '1' : '0');
    toast.push('info', val ? 'العرض على الشاشة الخارجية مفعّل.' : 'تم حجب الشاشة الخارجية.');
  }

  return (
    <div>
      <PageHeader
        title="شاشة HDMI"
        subtitle="التحكم في العرض على الشاشة الخارجية"
        icon={<Monitor className="w-6 h-6" />}
      />

      <div className="card p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${showOnExternal ? 'bg-brand-500/15 text-brand-300' : 'bg-slate-500/15 text-slate-400'}`}>
            {showOnExternal ? <Eye className="w-7 h-7" /> : <EyeOff className="w-7 h-7" />}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">حالة عرض الشاشة الخارجية</h2>
            <p className="text-sm text-slate-400 mt-1">
              {showOnExternal
                ? 'الشاشة الخارجية تعرض رمز QR ومعلومات الشبكة فقط. لا تعرض أي بيانات طلاب.'
                : 'الشاشة الخارجية محجوبة. لعرض الرمز للطلاب فعّل العرض.'}
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => toggle(true)} disabled={showOnExternal} className="btn-primary">
                <Eye className="w-4 h-4" /> عرض QR للطلاب
              </button>
              <button onClick={() => toggle(false)} disabled={!showOnExternal} className="btn-outline">
                <EyeOff className="w-4 h-4" /> إخفاء
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-3"><Monitor className="w-5 h-5 text-brand-400" /> شاشة اللابتوب</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success-500" /> تعرض لوحة الدكتور كاملة</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success-500" /> بيانات الطلاب وسجلات الحضور</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success-500" /> التحكم بالجلسات</li>
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-3"><EyeOff className="w-5 h-5 text-amber-400" /> الشاشة الخارجية</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2"><QrCode className="w-4 h-4 text-brand-400" /> رمز QR (عند التفعيل)</li>
            <li className="flex items-center gap-2"><Wifi className="w-4 h-4 text-brand-400" /> اسم وكلمة مرور الشبكة</li>
            <li className="flex items-center gap-2 text-danger-400"><EyeOff className="w-4 h-4" /> لا تعرض بيانات الطلاب أبدًا</li>
          </ul>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h3 className="font-bold text-white mb-3">تعليمات HDMI</h3>
        <ol className="space-y-2 text-sm text-slate-300 list-decimal pr-5">
          <li>وصّل كابل HDMI بالشاشة الخارجية (بروجكتر أو تلفاز).</li>
          <li>اضغط <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Windows + P</kbd> واختر «توسيع» (Extend).</li>
          <li>افتح متصفحًا ثانيًا واسحب نافذته إلى الشاشة الخارجية.</li>
          <li>افتح نفس رابط النظام على الشاشة الخارجية وتنقّل إلى صفحة عرض QR.</li>
          <li>فعّل زر «عرض QR للطلاب» ليعرض الرمز للطلاب فقط دون أي بيانات أخرى.</li>
        </ol>
      </div>
    </div>
  );
}
