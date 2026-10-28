export class UnionFind {
  private readonly parent = new Map<string, string>();

  find(a: string): string {
    if (!this.parent.has(a)) this.parent.set(a, a);
    let root = a;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    while (a !== root) {
      const next = this.parent.get(a)!;
      this.parent.set(a, root);
      a = next;
    }
    return root;
  }

  union(a: string | null, b: string | null): void {
    if (a == null || b == null) return;
    const x = this.find(a);
    const y = this.find(b);
    if (x !== y) this.parent.set(x, y);
  }

  roots(): string[] {
    return [...this.parent.keys()].filter((k) => this.parent.get(k) === k);
  }
}
