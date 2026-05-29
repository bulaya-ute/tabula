import type { CellValue, CompareOptions, CompareResult, FileData } from '../types';
import { normalise } from './utils';

function applyTrim(v: CellValue, opt: CompareOptions['trim']): string {
  const s = String(v ?? '');
  if (opt === 'all')   return s.trim();
  if (opt === 'left')  return s.trimStart();
  if (opt === 'right') return s.trimEnd();
  return s;
}

function makeKey(row: CellValue[], indices: number[], opts: CompareOptions): string {
  return indices
    .map(i => {
      let v = applyTrim(row[i], opts.trim);
      if (!opts.caseSensitive) v = v.toUpperCase();
      return v;
    })
    .join('\x00');
}

export function compare(source: FileData, lookup: FileData, opts: CompareOptions): CompareResult {
  const srcKeyIdx = opts.primaryKeys.map(k => source.headers.indexOf(k)).filter(i => i >= 0);
  const lkpKeyIdx = opts.primaryKeys.map(k => lookup.headers.indexOf(k)).filter(i => i >= 0);

  const lookupMap = new Map<string, CellValue[]>();
  for (const row of lookup.rows) {
    lookupMap.set(makeKey(row, lkpKeyIdx, opts), row);
  }

  const extraHeaders = lookup.headers.map(h => `${h}_lookup`);
  const outHeaders: CellValue[] = [...source.headers, 'change_reason', ...extraHeaders];
  const outRows: CellValue[][] = [outHeaders];

  let newCount = 0;
  let changedCount = 0;

  for (const row of source.rows) {
    const key = makeKey(row, srcKeyIdx, opts);
    const match = lookupMap.get(key);

    if (!match) {
      outRows.push([...row, 'new', ...new Array(lookup.headers.length).fill(null)]);
      newCount++;
      continue;
    }

    const changed = source.headers.some((h, si) => {
      const li = lookup.headers.indexOf(h);
      if (li < 0) return false;
      const sv = opts.caseSensitive ? applyTrim(row[si], opts.trim) : normalise(row[si]);
      const lv = opts.caseSensitive ? applyTrim(match[li], opts.trim) : normalise(match[li]);
      return sv !== lv;
    });

    if (changed) {
      outRows.push([...row, 'changed', ...match]);
      changedCount++;
    }
  }

  return {
    aoa: outRows,
    counts: { new: newCount, changed: changedCount },
    total: newCount + changedCount,
  };
}
