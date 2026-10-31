// A line diff for the change card: common prefix and suffix are trimmed, the
// middle is aligned by longest common subsequence, and long unchanged runs
// fold into one "n unchanged lines" row.

export type DiffLine = { op: "same" | "add" | "del"; text: string };
export type NumberedLine = DiffLine & { oldNo?: number; newNo?: number };
export type DiffRow<T extends DiffLine = DiffLine> = T | { op: "skip"; count: number };

/** Above this many changed lines on a side, the middle is shown as delete-then-add. */
export const LCS_LIMIT = 800;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const head = a.slice(0, start).map((text): DiffLine => ({ op: "same", text }));
  const tail = a.slice(endA).map((text): DiffLine => ({ op: "same", text }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  if (midA.length > LCS_LIMIT || midB.length > LCS_LIMIT) {
    return [
      ...head,
      ...midA.map((text): DiffLine => ({ op: "del", text })),
      ...midB.map((text): DiffLine => ({ op: "add", text })),
      ...tail,
    ];
  }

  // lcs[i][j] = length of the LCS of midA[i:] and midB[j:]
  const lcs = Array.from({ length: midA.length + 1 }, () => new Uint16Array(midB.length + 1));
  for (let i = midA.length - 1; i >= 0; i--) {
    for (let j = midB.length - 1; j >= 0; j--) {
      lcs[i][j] = midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const middle: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < midA.length || j < midB.length) {
    if (i < midA.length && j < midB.length && midA[i] === midB[j]) {
      middle.push({ op: "same", text: midA[i] });
      i++;
      j++;
    } else if (i < midA.length && (j === midB.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      middle.push({ op: "del", text: midA[i++] });
    } else {
      middle.push({ op: "add", text: midB[j++] });
    }
  }
  return [...head, ...middle, ...tail];
}

/** Adds 1-based line numbers: deleted lines count on the old side, added lines on the new, unchanged lines on both. */
export function numberLines(lines: readonly DiffLine[]): NumberedLine[] {
  let oldNo = 0;
  let newNo = 0;
  return lines.map((line) => {
    if (line.op === "del") return { ...line, oldNo: ++oldNo };
    if (line.op === "add") return { ...line, newNo: ++newNo };
    return { ...line, oldNo: ++oldNo, newNo: ++newNo };
  });
}

/** Keeps `context` unchanged lines around each change and folds the rest. */
export function foldDiff<T extends DiffLine>(lines: T[], context = 2): DiffRow<T>[] {
  const near = lines.map(() => false);
  lines.forEach((line, index) => {
    if (line.op === "same") return;
    for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k++) near[k] = true;
  });
  const rows: DiffRow<T>[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    if (near[index]) {
      if (skipped) rows.push({ op: "skip", count: skipped });
      skipped = 0;
      rows.push(line);
    } else {
      skipped++;
    }
  });
  if (skipped) rows.push({ op: "skip", count: skipped });
  return rows;
}
