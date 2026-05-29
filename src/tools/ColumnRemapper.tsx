import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DataPreview } from '../components/DataPreview';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useToast } from '../context/ToastContext';
import type { CellValue, ColumnMapping, FileData, MappingSource, MappingTransform, OutputFormat } from '../types';
import { download, readFile, stemName } from '../lib/utils';

function applyTransform(v: CellValue, transform: MappingTransform, decimals: number): CellValue {
  if (v === null || v === undefined) return null;
  const s = String(v);
  if (transform === 'uppercase') return s.toUpperCase();
  if (transform === 'lowercase') return s.toLowerCase();
  if (transform === 'trim')      return s.trim();
  if (transform === 'round') {
    const n = parseFloat(s);
    return isNaN(n) ? v : parseFloat(n.toFixed(decimals));
  }
  return v;
}

function buildRow(srcRow: CellValue[], srcHeaders: string[], mappings: ColumnMapping[]): CellValue[] {
  return mappings.map(m => {
    let raw: CellValue = null;
    if (m.source.type === 'column') {
      const idx = srcHeaders.indexOf(m.source.header);
      raw = idx >= 0 ? srcRow[idx] ?? null : null;
    } else if (m.source.type === 'fixed') {
      raw = m.source.value;
    }
    return applyTransform(raw, m.transform, m.roundDecimals ?? 2);
  });
}

const TRANSFORMS: { value: MappingTransform; label: string }[] = [
  { value: 'none',      label: 'None' },
  { value: 'trim',      label: 'Trim whitespace' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'round',     label: 'Round' },
];

export function ColumnRemapper() {
  const { addToast } = useToast();
  const [source, setSource]   = useState<FileData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [format, setFormat]   = useState<OutputFormat>('xlsx');
  const [schemaMode, setSchemaMode] = useState<'upload' | 'manual'>('manual');
  const [newColName, setNewColName] = useState('');

  async function handleSource(file: File) {
    try {
      const data = await readFile(file);
      setSource(data);
      setMappings([]);
      addToast(`Loaded ${data.rowCount} rows from ${file.name}`, 'success');
    } catch {
      addToast('Failed to read file', 'error');
    }
  }

  async function handleTemplate(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1 });
      const headers = (aoa[0] ?? []).map(h => String(h ?? '').trim()).filter(Boolean);
      addOutputColumns(headers);
    } catch {
      addToast('Failed to read template', 'error');
    }
  }

  function addOutputColumns(headers: string[]) {
    const blank: MappingSource = { type: 'blank' };
    setMappings(prev => {
      const existing = new Set(prev.map(m => m.outputHeader));
      const toAdd = headers.filter(h => !existing.has(h)).map<ColumnMapping>(h => ({
        outputHeader: h,
        source: source?.headers.includes(h) ? { type: 'column', header: h } : blank,
        transform: 'none',
        roundDecimals: 2,
      }));
      return [...prev, ...toAdd];
    });
  }

  function addManualColumn() {
    const name = newColName.trim();
    if (!name) return;
    if (mappings.find(m => m.outputHeader === name)) {
      addToast('Column already exists', 'warning'); return;
    }
    const blank: MappingSource = { type: 'blank' };
    setMappings(prev => [...prev, {
      outputHeader: name,
      source: source?.headers.includes(name) ? { type: 'column', header: name } : blank,
      transform: 'none',
      roundDecimals: 2,
    }]);
    setNewColName('');
  }

  function updateMapping(i: number, patch: Partial<ColumnMapping>) {
    setMappings(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }

  function removeMapping(i: number) {
    setMappings(prev => prev.filter((_, idx) => idx !== i));
  }

  function moveMapping(i: number, dir: -1 | 1) {
    setMappings(prev => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function handleConvert() {
    if (!source) return;
    if (mappings.length === 0) { addToast('Add at least one output column', 'warning'); return; }
    const headers = mappings.map(m => m.outputHeader) as CellValue[];
    const rows    = source.rows.map(r => buildRow(r, source.headers, mappings));
    const aoa     = [headers, ...rows];
    const ext     = format === 'xlsx' ? '.xlsx' : '.csv';
    download(aoa, `${stemName(source.file)}_remapped${ext}`, format);
    addToast(`Downloaded ${rows.length} rows`, 'success');
  }

  const preview = source?.rows.slice(0, 5).map(r => buildRow(r, source.headers, mappings)) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Column Remapper</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Upload a source file, define your output schema, configure per-column mappings and transforms.</p>
      </div>

      {/* Step 1 */}
      <StepCard step={1} title="Upload source file">
        {source ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{source.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{source.rowCount} rows · {source.headers.length} columns</p>
            </div>
            <button onClick={() => { setSource(null); setMappings([]); }} className="text-xs text-red-500 hover:text-red-600">Remove</button>
          </div>
        ) : (
          <DropZone onFile={handleSource} />
        )}
      </StepCard>

      {/* Step 2 */}
      <StepCard step={2} title="Define output schema" visible={!!source}>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setSchemaMode('manual')}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${schemaMode === 'manual' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
          >
            Type column names
          </button>
          <button
            onClick={() => setSchemaMode('upload')}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${schemaMode === 'upload' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
          >
            Upload template file
          </button>
        </div>

        {schemaMode === 'manual' ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Output column name…"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManualColumn()}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addManualColumn}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        ) : (
          <DropZone onFile={handleTemplate} label="Drop template file — its headers become your output columns" />
        )}

        {source && mappings.length === 0 && (
          <button
            onClick={() => addOutputColumns(source.headers)}
            className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Auto-fill from source columns
          </button>
        )}
      </StepCard>

      {/* Step 3 — Mapping table */}
      <StepCard step={3} title="Configure mappings" visible={mappings.length > 0}>
        {/* Column headers + clear all */}
        <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 px-3 mb-1 items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Output column</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transform</span>
          <button onClick={() => setMappings([])} className="text-xs text-slate-400 hover:text-red-500 whitespace-nowrap">Clear all</button>
        </div>
        <div className="space-y-2">
          {mappings.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
              {/* Output header */}
              <input
                value={m.outputHeader}
                onChange={e => updateMapping(i, { outputHeader: e.target.value })}
                className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />

              {/* Source */}
              <div className="flex gap-1.5 items-center">
                <select
                  value={m.source.type}
                  onChange={e => {
                    const t = e.target.value as MappingSource['type'];
                    if (t === 'blank')  updateMapping(i, { source: { type: 'blank' } });
                    if (t === 'fixed')  updateMapping(i, { source: { type: 'fixed', value: '' } });
                    if (t === 'column') updateMapping(i, { source: { type: 'column', header: source?.headers[0] ?? '' } });
                  }}
                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="column">Column</option>
                  <option value="fixed">Fixed value</option>
                  <option value="blank">Blank</option>
                </select>
                {m.source.type === 'column' && (
                  <select
                    value={m.source.header}
                    onChange={e => updateMapping(i, { source: { type: 'column', header: e.target.value } })}
                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                  >
                    {(source?.headers ?? []).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                )}
                {m.source.type === 'fixed' && (
                  <input
                    value={(m.source as { type: 'fixed'; value: string }).value}
                    onChange={e => updateMapping(i, { source: { type: 'fixed', value: e.target.value } })}
                    placeholder="value…"
                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                  />
                )}
              </div>

              {/* Transform */}
              <div className="flex gap-1.5 items-center">
                <select
                  value={m.transform}
                  onChange={e => updateMapping(i, { transform: e.target.value as MappingTransform })}
                  className="flex-1 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                >
                  {TRANSFORMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {m.transform === 'round' && (
                  <input
                    type="number" min={0} max={10}
                    value={m.roundDecimals ?? 2}
                    onChange={e => updateMapping(i, { roundDecimals: parseInt(e.target.value) })}
                    className="w-12 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button onClick={() => moveMapping(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">↑</button>
                <button onClick={() => moveMapping(i, 1)} disabled={i === mappings.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">↓</button>
                <button onClick={() => removeMapping(i)} className="p-1 text-red-400 hover:text-red-600">×</button>
              </div>
            </div>
          ))}
        </div>

        <DataPreview
          headers={mappings.map(m => m.outputHeader)}
          rows={preview}
        />
      </StepCard>

      {/* Step 4 */}
      <StepCard step={4} title="Download" visible={mappings.length > 0}>
        <div className="flex items-center gap-4 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} />
          <button
            onClick={handleConvert}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download remapped file
          </button>
        </div>
      </StepCard>
    </div>
  );
}
