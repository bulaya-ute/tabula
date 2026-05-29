import type { Tool } from '../types';

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Transform':        { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-100 dark:border-blue-900' },
  'File Operations':  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900' },
  'Analysis':         { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900' },
  'Cleaning':         { bg: 'bg-amber-50 dark:bg-amber-950/40',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-100 dark:border-amber-900' },
};

const fallback = { bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' };

interface Props {
  tool: Tool;
  onSelect: (id: string) => void;
}

export function ToolCard({ tool, onSelect }: Props) {
  const colors = categoryColors[tool.category] ?? fallback;
  const Icon = tool.icon;

  return (
    <button
      onClick={() => onSelect(tool.id)}
      className={`group relative text-left w-full rounded-2xl border p-5 transition-all duration-200
        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700
        hover:shadow-md hover:-translate-y-0.5
        ${tool.stub ? 'grayscale opacity-60' : ''}`}
    >
      {tool.stub && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${colors.bg} ${colors.border} border`}>
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
        {tool.category}
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 leading-snug">
        {tool.name}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
        {tool.description}
      </p>
    </button>
  );
}
