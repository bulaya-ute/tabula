// Normalized Levenshtein similarity (0 = no match, 1 = exact match)
export function levenshteinScore(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp: number[] = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[m] / Math.max(m, n);
}

// Sørensen–Dice coefficient on character bigrams (0 = no match, 1 = exact match)
export function fuzzyScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s[i] + s[i + 1];
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const am = bigrams(a), bm = bigrams(b);
  let hits = 0;
  for (const [bg, cnt] of am) hits += Math.min(cnt, bm.get(bg) ?? 0);
  return (2 * hits) / (a.length + b.length - 2);
}
