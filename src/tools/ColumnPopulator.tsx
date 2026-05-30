import { useState } from 'react';
import { DataPreview } from '../components/DataPreview';
import { DropZone } from '../components/DropZone';
import { FormatSelector } from '../components/FormatSelector';
import { StepCard } from '../components/StepCard';
import { useRules } from '../context/RulesContext';
import { useToast } from '../context/ToastContext';
import { applyAssignments, getPromotedArgs } from '../lib/rulesEngine';
import { download, readFile, stemName } from '../lib/utils';
import { STEP_LABELS, type ColumnAssignment, type RuleStep, type SimpleStepType, type UserRule } from '../types/rules';
import type { CellValue, FileData, OutputFormat } from '../types';

interface LookupFile { data: FileData; alias: string; }

const INPUT = 'text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500';
const SELECT = `${INPUT} cursor-pointer`;

// ---- Built-in primitive options shown directly in the rule picker ----
const PRIMITIVE_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  {
    label: 'Whitespace',
    options: [
      { value: 'primitive:trim_all',      label: 'Trim all whitespace' },
      { value: 'primitive:trim_leading',  label: 'Trim leading whitespace' },
      { value: 'primitive:trim_trailing', label: 'Trim trailing whitespace' },
    ],
  },
  {
    label: 'Case',
    options: [
      { value: 'primitive:uppercase', label: 'Uppercase' },
      { value: 'primitive:lowercase', label: 'Lowercase' },
      { value: 'primitive:titlecase', label: 'Title case' },
    ],
  },
  {
    label: 'Numeric',
    options: [
      { value: 'primitive:round', label: 'Round (2 decimals)' },
    ],
  },
  {
    label: 'Context',
    options: [
      { value: 'primitive:read_column',    label: 'Read column (unbound — set below)' },
      { value: 'primitive:read_row_index', label: 'Row index' },
      { value: 'primitive:read_col_index', label: 'Column index' },
    ],
  },
  {
    label: 'Lookup',
    options: [
      { value: 'primitive:lookup_match',   label: 'Lookup match (configure in Rules Library)' },
      { value: 'primitive:fetch_by_index', label: 'Fetch by index (configure in Rules Library)' },
    ],
  },
];

function makePrimitiveStep(stepType: string): RuleStep {
  switch (stepType) {
    case 'round':          return { type: 'round', decimals: 2 };
    case 'read_column':    return { type: 'read_column', column: null };
    case 'lookup_match':   return { type: 'lookup_match', lookupAlias: null, matchColumn: null, algorithm: 'fuzzy', threshold: 0.75, outputType: 'value', defaultValue: '' };
    case 'fetch_by_index': return { type: 'fetch_by_index', lookupAlias: null, columnName: null, defaultValue: '#NO_MATCH' };
    default:               return { type: stepType as SimpleStepType };
  }
}

function syntheticRule(ruleId: string): UserRule {
  const stepType = ruleId.slice('primitive:'.length);
  return { id: ruleId, name: STEP_LABELS[stepType] ?? stepType, steps: [makePrimitiveStep(stepType)] };
}

// Resolve a ruleId to a UserRule — handles both library rules and primitive:* ids
function resolveRule(ruleId: string, libraryRules: UserRule[]): UserRule | undefined {
  if (ruleId.startsWith('primitive:')) return syntheticRule(ruleId);
  return libraryRules.find(r => r.id === ruleId);
}

// Build effective rules array for execution: library rules + synthetic rules for any primitive assignments
function effectiveRules(assignments: ColumnAssignment[], libraryRules: UserRule[]): UserRule[] {
  const synthMap = new Map<string, UserRule>();
  for (const a of assignments) {
    if (a.ruleId.startsWith('primitive:') && !synthMap.has(a.ruleId)) {
      synthMap.set(a.ruleId, syntheticRule(a.ruleId));
    }
  }
  return [...libraryRules, ...synthMap.values()];
}

export function ColumnPopulator() {
  const { rules } = useRules();
  const { addToast } = useToast();

  const [inputFile, setInputFile]       = useState<FileData | null>(null);
  const [lookupFiles, setLookupFiles]   = useState<LookupFile[]>([]);
  const [assignments, setAssignments]   = useState<ColumnAssignment[]>([]);
  const [preview, setPreview]           = useState<CellValue[][] | null>(null);
  const [format, setFormat]             = useState<OutputFormat>('xlsx');

  async function handleInputFile(f: File) {
    try {
      const data = await readFile(f);
      setInputFile(data);
      setAssignments([]);
      setPreview(null);
      addToast(`Loaded ${data.rowCount} rows`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  async function handleAddLookup(f: File) {
    try {
      const data = await readFile(f);
      const n = lookupFiles.length + 1;
      setLookupFiles(prev => [...prev, { data, alias: `file${n}` }]);
      addToast(`Added lookup file "${f.name}"`, 'success');
    } catch { addToast('Failed to read file', 'error'); }
  }

  function setAlias(i: number, alias: string) {
    setLookupFiles(prev => prev.map((lf, idx) => idx === i ? { ...lf, alias } : lf));
  }

  function removeLookup(i: number) {
    setLookupFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  function getAssignment(header: string): ColumnAssignment | undefined {
    return assignments.find(a => a.columnHeader === header);
  }

  function setAssignment(asn: ColumnAssignment) {
    setAssignments(prev => {
      const existing = prev.find(a => a.columnHeader === asn.columnHeader);
      if (existing) return prev.map(a => a.columnHeader === asn.columnHeader ? asn : a);
      return [...prev, asn];
    });
    setPreview(null);
  }

  function clearAssignment(header: string) {
    setAssignments(prev => prev.filter(a => a.columnHeader !== header));
    setPreview(null);
  }

  function handleRuleChange(header: string, ruleId: string) {
    if (!ruleId) { clearAssignment(header); return; }
    const existing = getAssignment(header);
    setAssignment({
      columnHeader: header,
      ruleId,
      seedType: existing?.seedType ?? 'self',
      seedColumn: existing?.seedColumn ?? (inputFile?.headers[0] ?? ''),
      boundArgs: {},
    });
  }

  function handleSeedChange(header: string, seedType: 'self' | 'column', seedColumn: string) {
    const existing = getAssignment(header);
    if (!existing) return;
    setAssignment({ ...existing, seedType, seedColumn });
  }

  function handleBoundArgChange(header: string, key: string, value: string) {
    const existing = getAssignment(header);
    if (!existing) return;
    setAssignment({ ...existing, boundArgs: { ...existing.boundArgs, [key]: value } });
  }

  function handleRunPreview() {
    if (!inputFile) return;
    const lMap = new Map(lookupFiles.map(lf => [lf.alias, lf.data]));
    const allRules = effectiveRules(assignments, rules);
    try {
      const rows = applyAssignments(inputFile, assignments, lMap, allRules, 5);
      setPreview(rows);
      addToast('Preview ready', 'success');
    } catch (e) {
      addToast('Preview failed: ' + String(e), 'error');
    }
  }

  function handleDownload() {
    if (!inputFile) return;
    const lMap = new Map(lookupFiles.map(lf => [lf.alias, lf.data]));
    const allRules = effectiveRules(assignments, rules);
    try {
      const rows = applyAssignments(inputFile, assignments, lMap, allRules);
      const aoa: CellValue[][] = [inputFile.headers as CellValue[], ...rows];
      const ext = format === 'xlsx' ? '.xlsx' : '.csv';
      download(aoa, `${stemName(inputFile.file)}_populated${ext}`, format);
      addToast(`Downloaded ${rows.length} rows`, 'success');
    } catch (e) {
      addToast('Download failed: ' + String(e), 'error');
    }
  }

  const hasAssignments = assignments.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Column Populator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Populate or transform columns using built-in primitives or composable rules from the Rules Library.
        </p>
      </div>

      {/* Step 1 — Input file */}
      <StepCard step={1} title="Upload input file">
        {inputFile ? (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{inputFile.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{inputFile.rowCount} rows · {inputFile.headers.length} columns</p>
            </div>
            <button onClick={() => { setInputFile(null); setAssignments([]); setPreview(null); }} className="text-xs text-red-500">Remove</button>
          </div>
        ) : <DropZone onFile={handleInputFile} />}
      </StepCard>

      {/* Step 2 — Lookup files */}
      <StepCard step={2} title="Lookup files (optional)" visible={!!inputFile}>
        <div className="space-y-2">
          {lookupFiles.map((lf, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{lf.data.file.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-500">alias:</span>
                <input
                  value={lf.alias}
                  onChange={e => setAlias(i, e.target.value)}
                  className={`w-24 ${INPUT}`}
                />
              </div>
              <button onClick={() => removeLookup(i)} className="text-xs text-red-500 hover:text-red-600 shrink-0">Remove</button>
            </div>
          ))}
          <DropZone onFile={handleAddLookup} label="Drop a lookup file to add" />
        </div>
      </StepCard>

      {/* Step 3 — Assign rules */}
      <StepCard step={3} title="Assign rules to columns" visible={!!inputFile}>
        <div className="space-y-2">
            {inputFile?.headers.map(header => {
              const asn = getAssignment(header);
              const rule = asn ? resolveRule(asn.ruleId, rules) : null;
              const promoted = rule ? getPromotedArgs(rule, rules) : [];
              return (
                <div key={header} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300 min-w-[8rem] max-w-[12rem] truncate shrink-0" title={header}>{header}</span>
                    <select
                      value={asn?.ruleId ?? ''}
                      onChange={e => handleRuleChange(header, e.target.value)}
                      className={`flex-1 ${SELECT} text-sm`}
                    >
                      <option value="">No rule (pass through)</option>
                      {PRIMITIVE_GROUPS.map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </optgroup>
                      ))}
                      {rules.length > 0 && (
                        <optgroup label="Rules Library">
                          {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {asn && rule && (
                    <div className="ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-2">
                      {/* Seed */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">Seed:</span>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="radio" checked={asn.seedType === 'self'} onChange={() => handleSeedChange(header, 'self', '')} className="accent-blue-600" />
                          <span className="text-slate-700 dark:text-slate-300">Target cell value</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="radio" checked={asn.seedType === 'column'} onChange={() => handleSeedChange(header, 'column', inputFile!.headers[0])} className="accent-blue-600" />
                          <span className="text-slate-700 dark:text-slate-300">Other column:</span>
                        </label>
                        {asn.seedType === 'column' && (
                          <select
                            value={asn.seedColumn}
                            onChange={e => handleSeedChange(header, 'column', e.target.value)}
                            className={SELECT}
                          >
                            {inputFile?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Promoted args */}
                      {promoted.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rule arguments</p>
                          {promoted.map(arg => (
                            <div key={arg.key} className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400 w-44 shrink-0 truncate" title={arg.label}>{arg.label}</span>
                              <input
                                value={asn.boundArgs[arg.key] ?? ''}
                                onChange={e => handleBoundArgChange(header, arg.key, e.target.value)}
                                placeholder="value…"
                                className={`flex-1 ${INPUT}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      </StepCard>

      {/* Step 4 — Preview */}
      <StepCard step={4} title="Preview" visible={!!inputFile && hasAssignments}>
        <button
          onClick={handleRunPreview}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Run preview
        </button>
        {preview && inputFile && (
          <DataPreview
            headers={inputFile.headers}
            rows={preview}
            label="Output preview (first 5 rows)"
          />
        )}
      </StepCard>

      {/* Step 5 — Download */}
      <StepCard step={5} title="Download" visible={!!inputFile && hasAssignments}>
        <div className="flex items-center gap-4 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} />
          <button
            onClick={handleDownload}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download populated file
          </button>
        </div>
      </StepCard>
    </div>
  );
}
