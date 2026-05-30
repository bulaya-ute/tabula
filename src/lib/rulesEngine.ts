import type { UserRule, RuleStep, PromotedArg, ColumnAssignment } from '../types/rules';
import type { CellValue, FileData } from '../types';
import { RULES_SCHEMA_VERSION } from '../types/rules';
import { fuzzyScore, levenshteinScore } from './matching';

const STORAGE_KEY = 'tb-rules-library';

export function loadRules(): UserRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { version?: number; rules?: UserRule[] };
    if (data.version !== RULES_SCHEMA_VERSION) {
      console.warn('[tabula] Rules library schema mismatch — resetting');
      return [];
    }
    return Array.isArray(data.rules) ? data.rules : [];
  } catch { return []; }
}

export function saveRules(rules: UserRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: RULES_SCHEMA_VERSION, rules }));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// DFS: would adding ruleId as a step inside targetId create a cycle?
export function wouldCreateCycle(targetId: string, ruleId: string, allRules: UserRule[]): boolean {
  if (ruleId === targetId) return true;
  const rule = allRules.find(r => r.id === ruleId);
  if (!rule) return false;
  return rule.steps.some(s => s.type === 'rule_ref' && wouldCreateCycle(targetId, s.ruleId, allRules));
}

// Returns all promoted (unbound) args of a rule, recursing into rule_ref steps.
// prefix is prepended to every key (used during recursion for nested refs).
export function getPromotedArgs(rule: UserRule, allRules: UserRule[], prefix = ''): PromotedArg[] {
  const args: PromotedArg[] = [];
  rule.steps.forEach((step, si) => {
    const sp = `${prefix}s${si}_`;
    switch (step.type) {
      case 'round':
        if (step.decimals === null)
          args.push({ key: `${sp}decimals`, label: `decimals (step ${si + 1})` });
        break;
      case 'read_column':
        if (step.column === null)
          args.push({ key: `${sp}column`, label: `column (step ${si + 1})` });
        break;
      case 'lookup_match':
        if (step.lookupAlias === null)
          args.push({ key: `${sp}lookupAlias`, label: `lookup alias (step ${si + 1})` });
        if (step.matchColumn === null)
          args.push({ key: `${sp}matchColumn`, label: `match column (step ${si + 1})` });
        break;
      case 'fetch_by_index':
        if (step.lookupAlias === null)
          args.push({ key: `${sp}lookupAlias`, label: `lookup alias (step ${si + 1})` });
        if (step.columnName === null)
          args.push({ key: `${sp}columnName`, label: `fetch column (step ${si + 1})` });
        break;
      case 'rule_ref': {
        const ref = allRules.find(r => r.id === step.ruleId);
        if (!ref) break;
        for (const a of getPromotedArgs(ref, allRules, sp)) {
          if (!(a.key in step.boundArgs)) args.push(a);
        }
        break;
      }
    }
  });
  return args;
}

// ---- Execution engine ----

interface ExecCtx {
  headers:        string[];
  row:            CellValue[];
  rowIndex:       number;
  targetColIndex: number;
  lookupFiles:    Map<string, FileData>;
  allRules:       UserRule[];
}

function resolveArg(bound: Record<string, string>, key: string, direct: string | number | null): string {
  if (direct !== null) return String(direct);
  return bound[key] ?? '';
}

function execStep(step: RuleStep, input: string, ctx: ExecCtx, bound: Record<string, string>, sp: string): string {
  switch (step.type) {
    case 'trim_leading':   return input.trimStart();
    case 'trim_trailing':  return input.trimEnd();
    case 'trim_all':       return input.trim();
    case 'uppercase':      return input.toUpperCase();
    case 'lowercase':      return input.toLowerCase();
    case 'titlecase':      return input.replace(/\b\w/g, c => c.toUpperCase());
    case 'read_row_index': return String(ctx.rowIndex);
    case 'read_col_index': return String(ctx.targetColIndex);
    case 'round': {
      const dec = parseInt(resolveArg(bound, `${sp}decimals`, step.decimals));
      const n = parseFloat(input);
      return isNaN(n) ? input : n.toFixed(isNaN(dec) ? 2 : Math.max(0, Math.min(10, dec)));
    }
    case 'read_column': {
      const col = resolveArg(bound, `${sp}column`, step.column);
      const idx = ctx.headers.indexOf(col);
      return idx >= 0 ? String(ctx.row[idx] ?? '') : '';
    }
    case 'lookup_match': {
      const alias  = resolveArg(bound, `${sp}lookupAlias`, step.lookupAlias);
      const mCol   = resolveArg(bound, `${sp}matchColumn`, step.matchColumn);
      const lf     = ctx.lookupFiles.get(alias);
      if (!lf) return step.defaultValue;
      const ci = lf.headers.indexOf(mCol);
      if (ci < 0) return step.defaultValue;
      const scoreFn = step.algorithm === 'fuzzy' ? fuzzyScore : levenshteinScore;
      let best = -1, bestIdx = -1;
      const needle = input.toLowerCase();
      for (let i = 0; i < lf.rows.length; i++) {
        const sc = scoreFn(needle, String(lf.rows[i][ci] ?? '').toLowerCase());
        if (sc > best) { best = sc; bestIdx = i; }
      }
      if (best < step.threshold || bestIdx < 0) return step.defaultValue;
      if (step.outputType === 'index')      return String(bestIdx);
      if (step.outputType === 'confidence') return best.toFixed(4);
      return String(lf.rows[bestIdx][ci] ?? '');
    }
    case 'fetch_by_index': {
      const alias  = resolveArg(bound, `${sp}lookupAlias`, step.lookupAlias);
      const colNm  = resolveArg(bound, `${sp}columnName`, step.columnName);
      const lf     = ctx.lookupFiles.get(alias);
      if (!lf) return step.defaultValue;
      const ri = parseInt(input);
      if (isNaN(ri) || ri < 0 || ri >= lf.rows.length) return step.defaultValue;
      const ci = lf.headers.indexOf(colNm);
      return ci >= 0 ? String(lf.rows[ri][ci] ?? '') : step.defaultValue;
    }
    case 'rule_ref': {
      const ref = ctx.allRules.find(r => r.id === step.ruleId);
      if (!ref) return input;
      // Build bound args for the nested invocation:
      // start from the step's own boundArgs, then overlay parent bound args stripped of this step's prefix
      const nested: Record<string, string> = { ...step.boundArgs };
      for (const [k, v] of Object.entries(bound)) {
        if (k.startsWith(sp)) nested[k.slice(sp.length)] = v;
      }
      return execRule(ref, input, ctx, nested);
    }
    default: return input;
  }
}

export function execRule(rule: UserRule, seed: string, ctx: ExecCtx, bound: Record<string, string> = {}): string {
  let v = seed;
  rule.steps.forEach((step, si) => { v = execStep(step, v, ctx, bound, `s${si}_`); });
  return v;
}

export function applyAssignments(
  file: FileData,
  assignments: ColumnAssignment[],
  lookupFiles: Map<string, FileData>,
  allRules: UserRule[],
  maxRows?: number,
): CellValue[][] {
  const aMap = new Map(assignments.map(a => [a.columnHeader, a]));
  const rows = maxRows !== undefined ? file.rows.slice(0, maxRows) : file.rows;
  return rows.map((row, rowIndex) =>
    file.headers.map((header, colIndex) => {
      const asn = aMap.get(header);
      if (!asn) return row[colIndex] ?? null;
      const rule = allRules.find(r => r.id === asn.ruleId);
      if (!rule) return row[colIndex] ?? null;
      const ctx: ExecCtx = { headers: file.headers, row, rowIndex, targetColIndex: colIndex, lookupFiles, allRules };
      const seed = asn.seedType === 'self'
        ? String(row[colIndex] ?? '')
        : String(row[file.headers.indexOf(asn.seedColumn)] ?? '');
      try { return execRule(rule, seed, ctx, asn.boundArgs); }
      catch { return '#ERROR'; }
    })
  );
}
