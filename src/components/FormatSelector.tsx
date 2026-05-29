import type { OutputFormat } from '../types';

interface Props {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
}

export function FormatSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {(['xlsx', 'csv'] as OutputFormat[]).map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors
            ${value === f
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
            }`}
        >
          .{f}
        </button>
      ))}
    </div>
  );
}
