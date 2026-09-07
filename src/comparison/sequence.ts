export function lcsLength(a: string[], b: string[]): number {
  const previous = new Array<number>(b.length + 1).fill(0);
  const current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current.fill(0);

    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
      } else {
        current[j] = Math.max(previous[j], current[j - 1]);
      }
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

export function sequenceSimilarity(
  baseline: string[],
  candidate: string[],
): number {
  if (baseline.length === 0 && candidate.length === 0) {
    return 1;
  }

  const lcs = lcsLength(baseline, candidate);
  return (2 * lcs) / (baseline.length + candidate.length);
}
