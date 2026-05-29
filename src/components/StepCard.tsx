import type { ReactNode } from 'react';

interface Props {
  step: number;
  title: string;
  visible?: boolean;
  children: ReactNode;
}

export function StepCard({ step, title, visible = true, children }: Props) {
  if (!visible) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
          {step}
        </span>
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}
