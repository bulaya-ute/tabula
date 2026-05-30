import { useState } from 'react';
import { useRules } from '../context/RulesContext';
import { generateId, getPromotedArgs, wouldCreateCycle } from '../lib/rulesEngine';
import {
  STEP_COLOR, STEP_LABELS,
  type RuleStep, type UserRule,
  type LookupMatchStep, type FetchByIndexStep,
} from '../types/rules';

// ---- Shared input styles ----
const INPUT = 'text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500';
const SELECT = `${INPUT} cursor-pointer`;

// ---- UnboundField: a text input that can be toggled to "unbound" (null) ----
function UnboundField({
  label, value, onChange, placeholder = 'value…',
}: {
  label: string; value: string | null; onChange: (v: string | null) => void; placeholder?: string;
}) {
  const unbound = value === null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">{label}</span>
      <input
        value={unbound ? '' : value}
        disabled={unbound}
        onChange={e => onChange(e.target.value)}
        placeholder={unbound ? '← promoted to signature' : placeholder}
        className={`flex-1 ${INPUT} ${unbound ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-slate-400' : ''}`}
      />
      <button
        onClick={() => onChange(unbound ? '' : null)}
        title={unbound ? 'Bind a value' : 'Leave unbound — will be filled at assignment time'}
        className={`text-xs px-1.5 py-0.5 rounded border whitespace-nowrap transition-colors ${
          unbound
            ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400'
            : 'border-slate-300 dark:border-slate-600 text-slate-400 hover:border-amber-400 hover:text-amber-600'
        }`}
      >
        {unbound ? 'unbound' : 'unbind'}
      </button>
    </div>
  );
}

// ---- Per-step config forms ----
function StepConfig({
  step, ruleId, allRules, onChange,
}: {
  step: RuleStep; ruleId: string; allRules: UserRule[]; onChange: (s: RuleStep) => void;
}) {
  function patch(p: Partial<RuleStep>) { onChange({ ...step, ...p } as RuleStep); }

  if (step.type === 'round') {
    return (
      <UnboundField
        label="Decimals"
        value={step.decimals === null ? null : String(step.decimals)}
        onChange={v => patch({ decimals: v === null ? null : (parseInt(v) || 0) })}
        placeholder="2"
      />
    );
  }

  if (step.type === 'read_column') {
    return (
      <UnboundField label="Column" value={step.column} onChange={v => patch({ column: v })} placeholder="column name" />
    );
  }

  if (step.type === 'lookup_match') {
    const s = step as LookupMatchStep;
    return (
      <div className="space-y-1.5">
        <UnboundField label="Lookup alias" value={s.lookupAlias} onChange={v => patch({ lookupAlias: v })} placeholder="file1" />
        <UnboundField label="Match column" value={s.matchColumn} onChange={v => patch({ matchColumn: v })} placeholder="column name" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Algorithm</span>
          <select value={s.algorithm} onChange={e => patch({ algorithm: e.target.value as 'fuzzy' | 'levenshtein' })} className={SELECT}>
            <option value="fuzzy">Fuzzy (bigram dice)</option>
            <option value="levenshtein">Levenshtein</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Threshold</span>
          <input type="number" min={0} max={1} step={0.05} value={s.threshold}
            onChange={e => patch({ threshold: parseFloat(e.target.value) || 0 })}
            className={`w-24 ${INPUT}`} />
          <span className="text-xs text-slate-400">(0–1)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Output type</span>
          <select value={s.outputType} onChange={e => patch({ outputType: e.target.value as LookupMatchStep['outputType'] })} className={SELECT}>
            <option value="value">value — the matched string</option>
            <option value="index">index — row number (use with fetch_by_index)</option>
            <option value="confidence">confidence — similarity score</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Default</span>
          <input value={s.defaultValue} onChange={e => patch({ defaultValue: e.target.value })} placeholder="(empty)" className={`flex-1 ${INPUT}`} />
        </div>
      </div>
    );
  }

  if (step.type === 'fetch_by_index') {
    const s = step as FetchByIndexStep;
    return (
      <div className="space-y-1.5">
        <UnboundField label="Lookup alias" value={s.lookupAlias} onChange={v => patch({ lookupAlias: v })} placeholder="file1" />
        <UnboundField label="Fetch column" value={s.columnName} onChange={v => patch({ columnName: v })} placeholder="column name" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Default</span>
          <input value={s.defaultValue} onChange={e => patch({ defaultValue: e.target.value })} placeholder="#NO_MATCH" className={`flex-1 ${INPUT}`} />
        </div>
      </div>
    );
  }

  if (step.type === 'rule_ref') {
    const ref = allRules.find(r => r.id === step.ruleId);
    const promoted = ref ? getPromotedArgs(ref, allRules) : [];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">Rule</span>
          <select
            value={step.ruleId}
            onChange={e => onChange({ ...step, ruleId: e.target.value, boundArgs: {} })}
            className={SELECT}
          >
            {allRules
              .filter(r => r.id !== ruleId && !wouldCreateCycle(ruleId, r.id, allRules))
              .map(r => <option key={r.id} value={r.id}>{r.name}</option>)
            }
          </select>
        </div>
        {promoted.map(arg => (
          <UnboundField
            key={arg.key}
            label={arg.label}
            value={step.boundArgs[arg.key] ?? null}
            onChange={v => {
              const nb = { ...step.boundArgs };
              if (v === null) delete nb[arg.key]; else nb[arg.key] = v;
              onChange({ ...step, boundArgs: nb });
            }}
          />
        ))}
        {promoted.length === 0 && ref && (
          <p className="text-xs text-slate-400 italic">This rule has no unbound arguments.</p>
        )}
      </div>
    );
  }

  return null; // simple steps have no config
}

// ---- Default step factories ----
function makeStep(type: string, allRules: UserRule[], currentRuleId: string): RuleStep | null {
  const eligible = allRules.filter(r => r.id !== currentRuleId && !wouldCreateCycle(currentRuleId, r.id, allRules));
  switch (type) {
    case 'trim_leading': case 'trim_trailing': case 'trim_all':
    case 'uppercase': case 'lowercase': case 'titlecase':
    case 'read_row_index': case 'read_col_index':
      return { type } as RuleStep;
    case 'round':          return { type: 'round', decimals: 2 };
    case 'read_column':    return { type: 'read_column', column: null };
    case 'lookup_match':   return { type: 'lookup_match', lookupAlias: null, matchColumn: null, algorithm: 'fuzzy', threshold: 0.75, outputType: 'value', defaultValue: '' };
    case 'fetch_by_index': return { type: 'fetch_by_index', lookupAlias: null, columnName: null, defaultValue: '#NO_MATCH' };
    case 'rule_ref':
      if (eligible.length === 0) return null;
      return { type: 'rule_ref', ruleId: eligible[0].id, boundArgs: {} };
    default: return null;
  }
}

// ---- Main modal ----
export function RulesLibrary({ onClose }: { onClose: () => void }) {
  const { rules, setRules } = useRules();
  const [selectedId, setSelectedId] = useState<string | null>(rules[0]?.id ?? null);
  const [cycleWarning, setCycleWarning] = useState<string | null>(null);

  const rule = rules.find(r => r.id === selectedId) ?? null;

  function update(patch: Partial<UserRule>) {
    if (!selectedId) return;
    setRules(rules.map(r => r.id === selectedId ? { ...r, ...patch } : r));
  }

  function updateStep(si: number, s: RuleStep) {
    if (!rule) return;
    update({ steps: rule.steps.map((o, i) => i === si ? s : o) });
  }

  function moveStep(si: number, dir: -1 | 1) {
    if (!rule) return;
    const steps = [...rule.steps];
    const j = si + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[si], steps[j]] = [steps[j], steps[si]];
    update({ steps });
  }

  function removeStep(si: number) {
    if (!rule) return;
    update({ steps: rule.steps.filter((_, i) => i !== si) });
  }

  function handleAddStep(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    e.target.value = '';
    if (!val || !rule) return;

    if (val.startsWith('rule:')) {
      const refId = val.slice(5);
      if (wouldCreateCycle(rule.id, refId, rules)) {
        setCycleWarning(`Adding "${rules.find(r => r.id === refId)?.name}" would create a circular reference.`);
        return;
      }
    }
    setCycleWarning(null);

    const step = makeStep(val.startsWith('rule:') ? 'rule_ref' : val, rules, rule.id);
    if (!step) return;
    if (step.type === 'rule_ref') (step as { ruleId: string }).ruleId = val.slice(5);
    update({ steps: [...rule.steps, step] });
  }

  function createRule() {
    const id = generateId();
    const newRule: UserRule = { id, name: 'New rule', steps: [] };
    setRules([...rules, newRule]);
    setSelectedId(id);
    setCycleWarning(null);
  }

  function deleteRule() {
    if (!selectedId) return;
    const remaining = rules.filter(r => r.id !== selectedId);
    setRules(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  }

  const eligibleRefs = rule
    ? rules.filter(r => r.id !== rule.id && !wouldCreateCycle(rule.id, r.id, rules))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[82vh] flex overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Left — rule list */}
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Rules Library</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {rules.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-3 text-center">No rules yet</p>
            )}
            {rules.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedId(r.id); setCycleWarning(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                  r.id === selectedId
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {r.name || <span className="italic text-slate-400">unnamed</span>}
                <span className="ml-1.5 text-xs text-slate-400">{r.steps.length}</span>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={createRule}
              className="w-full text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              + New rule
            </button>
          </div>
        </div>

        {/* Right — editor */}
        <div className="flex-1 overflow-y-auto p-5">
          {!rule ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Select a rule to edit, or create a new one.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Rule name + delete */}
              <div className="flex items-center gap-3">
                <input
                  value={rule.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Rule name…"
                  className="flex-1 text-base font-semibold bg-transparent border-b border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white outline-none focus:border-blue-500 py-1"
                />
                <button onClick={deleteRule} className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap">Delete rule</button>
              </div>

              {/* Steps */}
              {rule.steps.length === 0 && (
                <p className="text-xs text-slate-400 italic">No steps yet. Add steps below to build the pipeline.</p>
              )}
              <div className="space-y-2">
                {rule.steps.map((step, si) => (
                  <div key={si} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400 w-5 shrink-0">{si + 1}.</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STEP_COLOR[step.type] ?? 'bg-slate-200 text-slate-700'}`}>
                        {step.type === 'rule_ref'
                          ? `→ ${rules.find(r => r.id === step.ruleId)?.name ?? 'unknown'}`
                          : STEP_LABELS[step.type] ?? step.type}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => moveStep(si, -1)} disabled={si === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs px-1">↑</button>
                        <button onClick={() => moveStep(si, 1)} disabled={si === rule.steps.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs px-1">↓</button>
                        <button onClick={() => removeStep(si)} className="text-slate-400 hover:text-red-500 text-base leading-none px-1">×</button>
                      </div>
                    </div>
                    <div className="pl-7">
                      <StepConfig step={step} ruleId={rule.id} allRules={rules} onChange={s => updateStep(si, s)} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add step */}
              {cycleWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                  ⚠ {cycleWarning}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">Add step:</span>
                <select onChange={handleAddStep} defaultValue="" className={`flex-1 ${SELECT}`}>
                  <option value="" disabled>Choose step type…</option>
                  <optgroup label="Whitespace">
                    <option value="trim_all">Trim all whitespace</option>
                    <option value="trim_leading">Trim leading</option>
                    <option value="trim_trailing">Trim trailing</option>
                  </optgroup>
                  <optgroup label="Case">
                    <option value="uppercase">Uppercase</option>
                    <option value="lowercase">Lowercase</option>
                    <option value="titlecase">Title case</option>
                  </optgroup>
                  <optgroup label="Numeric">
                    <option value="round">Round</option>
                  </optgroup>
                  <optgroup label="Context">
                    <option value="read_column">Read column</option>
                    <option value="read_row_index">Row index</option>
                    <option value="read_col_index">Column index</option>
                  </optgroup>
                  <optgroup label="Lookup">
                    <option value="lookup_match">Lookup match</option>
                    <option value="fetch_by_index">Fetch by index</option>
                  </optgroup>
                  {eligibleRefs.length > 0 && (
                    <optgroup label="User rules">
                      {eligibleRefs.map(r => (
                        <option key={r.id} value={`rule:${r.id}`}>{r.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Promoted args summary */}
              {(() => {
                const promoted = getPromotedArgs(rule, rules);
                if (promoted.length === 0) return null;
                return (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Promoted arguments (filled at assignment time)</p>
                    <ul className="space-y-0.5">
                      {promoted.map(a => (
                        <li key={a.key} className="text-xs text-amber-600 dark:text-amber-400 font-mono">{a.label}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
