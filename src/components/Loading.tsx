import { Loader2 } from 'lucide-react';

export function Loading({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-3 text-brand-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default Loading;

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-4">
        {icon}
      </div>
      <p className="text-slate-300 font-medium">{title}</p>
      {hint && <p className="text-slate-500 text-sm mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}
