import { useState } from 'react';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import { compare } from '../lib/comparator';
import { download, readFile, stemName } from '../lib/utils';
import type { CompareMapping, CompareResult, FileData, OutputFormat, TrimOption } from '../types';

const SELECT_CLS = 'text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-violet-500';

function buildInitialMappings(src: FileData, lkp: FileData): CompareMapping[] {
  return src.headers
    .filter(h => lkp.headers.includes(h))
    .map(h => ({ sourceCol: h, lookupCol: h, isKey: false }));
}

export function FileComparator() {
  const { addToast } = useToast();
  const [source, setSource]                   = useState<FileData | null>(null);
  const [lookup, setLookup]                   = useState<FileData | null>(null);
  const [mappings, setMappings]               = useState<CompareMapping[]>([]);
  const [caseSensitive, setCaseSensitive]     = useState(false);
  const [trim, setTrim]                       = useState<TrimOption>('all');
  const [addChangeReason, setAddChangeReason] = useState(true);
  const [result, setResult]                   = useState<CompareResult | null>(null);
  const [format, setFormat]                   = useState<OutputFormat>('xlsx');

  async function handleFile(side: 'source' | 'lookup', file: File) {
    try {
      const data = await readFile(file);
      setResult(null);
      const newSource = side === 'source' ? data : source;
      const newLookup = side === 'lookup' ? data : lookup;
      if (side === 'source') setSource(data); else setLookup(data);
      setMappings(newSource && newLookup ? buildInitialMappings(newSource, newLookup) : []);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function addMapping() {
    if (!source || !lookup) return;
    setMappings(prev => [...prev, { sourceCol: source.headers[0], lookupCol: lookup.headers[0], isKey: false }]);
    setResult(null);
  }

  function updateMapping(i: number, patch: Partial<CompareMapping>) {
    setMappings(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
    setResult(null);
  }

  function removeMapping(i: number) {
    setMappings(prev => prev.filter((_, idx) => idx !== i));
    setResult(null);
  }

  function handleCompare() {
    if (!source || !lookup) { addToast('Upload both files first', 'warning'); return; }
    if (mappings.length === 0) { addToast('Add at least one column mapping', 'warning'); return; }
    if (!mappings.some(m => m.isKey)) { addToast('Mark at least one mapping as a primary key', 'warning'); return; }
    const r = compare(source, lookup, { mappings, caseSensitive, trim, addChangeReason });
    setResult(r);
    if (r.total === 0) addToast('No differences found', 'info');
    else addToast(`Found ${r.counts.new} new, ${r.counts.changed} changed`, 'success');
  }

  function handleDownload() {
    if (!result || !source) return;
    const ext = format === 'xlsx' ? '.xlsx' : '.csv';
    download(result.aoa, `${stemName(source.file)}_differences${ext}`, format);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">File Comparator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Find new and changed rows between two files using a configurable column mapping.</p>
      </div>

      {/* Step 1 — Upload */}
      <StepCard step={1} title="Upload files">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Source file</p>
            {source
              ? <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white">{source.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{source.rowCount} rows · {source.headers.length} columns</p>
                  <button onClick={() => { setSource(null); setMappings([]); setResult(null); }} className="text-xs text-red-500 mt-1">Remove</button>
                </div>
              : <DropZone onFile={f => handleFile('source', f)} label="Drop source file" />
            }
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Lookup file</p>
            {lookup
              ? <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white">{lookup.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{lookup.rowCount} rows · {lookup.headers.length} columns</p>
                  <button onClick={() => { setLookup(null); setMappings([]); setResult(null); }} className="text-xs text-red-500 mt-1">Remove</button>
                </div>
              : <DropZone onFile={f => handleFile('lookup', f)} label="Drop lookup file" />
            }
          </div>
        </div>
      </StepCard>

      {/* Step 2 — Column mappings */}
      <StepCard step={2} title="Map columns" visible={!!(source && lookup)}>
        {mappings.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 gap-y-1 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Source column</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Lookup column</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Primary key</span>
            <span />
            {mappings.map((m, i) => (
              <>
                <select key={`src-${i}`} value={m.sourceCol} onChange={e => updateMapping(i, { sourceCol: e.target.value })} className={SELECT_CLS}>
                  {source?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select key={`lkp-${i}`} value={m.lookupCol} onChange={e => updateMapping(i, { lookupCol: e.target.value })} className={SELECT_CLS}>
                  {lookup?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <label key={`key-${i}`} className="flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.isKey}
                    onChange={e => updateMapping(i, { isKey: e.target.checked })}
                    className="w-4 h-4 accent-violet-600"
                  />
                </label>
                <button key={`rm-${i}`} onClick={() => removeMapping(i)} className="text-slate-400 hover:text-red-500 text-lg leading-none px-1">×</button>
              </>
            ))}
          </div>
        )}
        {mappings.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
            No columns matched by name. Add mappings manually below.
          </p>
        )}
        <button onClick={addMapping} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
          + Add mapping
        </button>
      </StepCard>

      {/* Step 3 — Options + Run */}
      <StepCard step={3} title="Options" visible={mappings.length > 0}>
        <div className="space-y-3 mb-5">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={addChangeReason} onChange={e => setAddChangeReason(e.target.checked)}
              className="w-3.5 h-3.5 accent-violet-600" />
            Add <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">change_reason</code> column to output
            <span className="text-xs text-slate-400">(e.g. "new", "salary changed")</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)}
              className="w-3.5 h-3.5 accent-violet-600" />
            Case-sensitive comparison
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700 dark:text-slate-300">Whitespace trim:</span>
            <select value={trim} onChange={e => setTrim(e.target.value as TrimOption)} className={SELECT_CLS}>
              <option value="all">Both sides</option>
              <option value="left">Left only</option>
              <option value="right">Right only</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleCompare}
          className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
        >
          Run comparison
        </button>
      </StepCard>

      {/* Step 4 — Results */}
      <StepCard step={4} title="Results" visible={!!result}>
        {result && (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.counts.new}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-500 font-medium mt-0.5">New rows</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.counts.changed}</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 font-medium mt-0.5">Changed rows</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{result.total}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Total differences</p>
              </div>
            </div>
            {result.total > 0 && (
              <div className="flex items-center gap-4 flex-wrap">
                <FormatSelector value={format} onChange={setFormat} />
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download differences
                </button>
              </div>
            )}
          </div>
        )}
      </StepCard>
    </div>
  );
}
