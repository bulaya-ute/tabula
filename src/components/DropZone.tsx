import { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  label?: string;
  accept?: string;
  multiple?: false;
}

export function DropZone({ onFile, label = 'Drop a file here or click to browse', accept = '.xlsx,.csv' }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => { if (file) onFile(file); };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }`}
    >
      <svg className="mx-auto mb-3 w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{accept.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()}</p>
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
    </div>
  );
}
