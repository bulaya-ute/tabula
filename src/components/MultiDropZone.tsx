import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  label?: string;
}

export function MultiDropZone({ onFiles, label = 'Drop files here or click to browse' }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${dragging
          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
          : 'border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }`}
    >
      <svg className="mx-auto mb-3 w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">XLSX, CSV — select multiple</p>
      <input ref={inputRef} type="file" accept=".xlsx,.csv" multiple className="hidden"
        onChange={e => { handle(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
