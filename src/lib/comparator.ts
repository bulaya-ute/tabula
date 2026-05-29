import type { CellValue, CompareOptions, CompareResult, FileData } from '../types';
import { normalise } from './utils';

function applyTrim(v: CellValue, opt: CompareOptions['trim']): string {
  const s = String(v ?? '');
  if (opt === 'all')   return s.trim();
  if (opt === 'left')  return s.trimStart();
  if (opt === 'right') return s.trimEnd();
  return s;
}

function makeKey(row: CellValue[], indices: number[], opts: Pick<CompareOptions, 'trim' | 'caseSensitive'>): string {
  return indices
    .map(i => {
      let v = applyTrim(row[i], opts.trim);
      if (!opts.caseSensitive) v = v.toUpperCase();
      return v;
    })
    .join('\x00');
}

export function compare(source: FileData, lookup: FileData, opts: CompareOptions): CompareResult {
  const keyMappings  = opts.mappings.filter(m => m.isKey);
  const srcKeyIdx    = keyMappings.map(m => source.headers.indexOf(m.sourceCol));
  const lkpKeyIdx    = keyMappings.map(m => lookup.headers.indexOf(m.lookupCol));

  const comparePairs = opts.mappings
    .map(m => ({ si: source.headers.indexOf(m.sourceCol), li: lookup.headers.indexOf(m.lookupCol), label: m.sourceCol }))
    .filter(p => p.si >= 0 && p.li >= 0);

  const lookupMap = new Map<string, CellValue[]>();
  for (const row of lookup.rows) {
    lookupMap.set(makeKey(row, lkpKeyIdx, opts), row);
  }

  const outHeaders: CellValue[] = opts.addChangeReason
    ? [...source.headers, 'change_reason']
    : [...source.headers];
  const outRows: CellValue[][] = [outHeaders];

  let newCount = 0;
  let changedCount = 0;

  for (const row of source.rows) {
    const key   = makeKey(row, srcKeyIdx, opts);
    const match = lookupMap.get(key);

    if (!match) {
      outRows.push(opts.addChangeReason ? [...row, 'new'] : [...row]);
      newCount++;
      continue;
    }

    const changedLabels = comparePairs
      .filter(p => {
        const sv = opts.caseSensitive ? applyTrim(row[p.si], opts.trim) : normalise(row[p.si]);
        const lv = opts.caseSensitive ? applyTrim(match[p.li], opts.trim) : normalise(match[p.li]);
        return sv !== lv;
      })
      .map(p => p.label);

    if (changedLabels.length > 0) {
      const reason = `${changedLabels.join(', ')} changed`;
      outRows.push(opts.addChangeReason ? [...row, reason] : [...row]);
      changedCount++;
    }
  }

  return {
    aoa: outRows,
    counts: { new: newCount, changed: changedCount },
    total: newCount + changedCount,
  };
}
