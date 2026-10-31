const PIVOT_MIN = 1e-18;

// Gaussian elimination with partial pivoting; a row with no pivot (a node nothing reaches) solves to 0 V.
// Mutates A and b.
export function linsolve(A: Float64Array[], b: Float64Array): Float64Array {
  const n = b.length;
  if (A.length !== n) throw new RangeError(`linsolve: ${A.length} rows for ${n} right-hand sides`);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < PIVOT_MIN) continue;
    if (p !== c) {
      const t = A[p]; A[p] = A[c]; A[c] = t;
      const u = b[p]; b[p] = b[c]; b[c] = u;
    }
    for (let r = c + 1; r < n; r++) {
      const fr = A[r][c] / A[c][c];
      if (!fr) continue;
      for (let k = c; k < n; k++) A[r][k] -= fr * A[c][k];
      b[r] -= fr * b[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = Math.abs(A[r][r]) < PIVOT_MIN ? 0 : s / A[r][r];
  }
  return x;
}

// max|a_ij| over min|a_ii|; Infinity when a diagonal entry is zero, 1 for an empty matrix
export function conditionEstimate(A: Float64Array[]): number {
  let max = 0;
  let minDiag = Infinity;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) max = Math.max(max, Math.abs(A[i][j]));
    minDiag = Math.min(minDiag, Math.abs(A[i][i]));
  }
  if (A.length === 0) return 1;
  return minDiag === 0 ? Infinity : max / minDiag;
}
