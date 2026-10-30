import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

const ToastCtx = createContext<{ push: (t: ToastType, m: string) => void } | undefined>(undefined);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong rounded-xl px-4 py-3 flex items-center gap-3 shadow-soft animate-fadeIn"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0" />}
            {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-danger-500 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-brand-400 shrink-0" />}
            <span className="text-sm text-slate-100 flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
