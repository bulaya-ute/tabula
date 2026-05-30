export type SimpleStepType =
  | 'trim_leading' | 'trim_trailing' | 'trim_all'
  | 'uppercase' | 'lowercase' | 'titlecase'
  | 'read_row_index' | 'read_col_index';

export interface SimpleStep        { type: SimpleStepType; }
export interface RoundStep         { type: 'round';          decimals: number | null; }
export interface ReadColumnStep    { type: 'read_column';    column: string | null; }
export interface LookupMatchStep   {
  type: 'lookup_match';
  lookupAlias:  string | null;
  matchColumn:  string | null;
  algorithm:    'fuzzy' | 'levenshtein';
  threshold:    number;
  outputType:   'value' | 'index' | 'confidence';
  defaultValue: string;
}
export interface FetchByIndexStep  {
  type: 'fetch_by_index';
  lookupAlias:  string | null;
  columnName:   string | null;
  defaultValue: string;
}
export interface RuleRefStep       {
  type:      'rule_ref';
  ruleId:    string;
  boundArgs: Record<string, string>;
}

export type RuleStep =
  | SimpleStep | RoundStep | ReadColumnStep
  | LookupMatchStep | FetchByIndexStep | RuleRefStep;

export interface UserRule {
  id:    string;
  name:  string;
  steps: RuleStep[];
}

export interface PromotedArg {
  key:   string;
  label: string;
}

export interface ColumnAssignment {
  columnHeader: string;
  ruleId:       string;
  seedType:     'self' | 'column';
  seedColumn:   string;
  boundArgs:    Record<string, string>;
}

export const RULES_SCHEMA_VERSION = 1;

export const STEP_LABELS: Record<string, string> = {
  trim_leading:   'Trim leading',
  trim_trailing:  'Trim trailing',
  trim_all:       'Trim all',
  uppercase:      'Uppercase',
  lowercase:      'Lowercase',
  titlecase:      'Title case',
  round:          'Round',
  read_column:    'Read column',
  read_row_index: 'Row index',
  read_col_index: 'Col index',
  lookup_match:   'Lookup match',
  fetch_by_index: 'Fetch by index',
  rule_ref:       'Use rule',
};

export const STEP_COLOR: Record<string, string> = {
  trim_leading:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  trim_trailing:  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  trim_all:       'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  uppercase:      'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  lowercase:      'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  titlecase:      'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  round:          'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  read_column:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  read_row_index: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  read_col_index: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  lookup_match:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  fetch_by_index: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  rule_ref:       'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};
