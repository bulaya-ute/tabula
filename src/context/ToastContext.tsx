import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Toast, ToastType } from '../types';

interface ToastCtx {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-600',
    error:   'bg-red-600',
    warning: 'bg-amber-500',
    info:    'bg-blue-600',
  };

  return (
    <Ctx.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`${colors[t.type]} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg cursor-pointer animate-slide-up max-w-xs`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
