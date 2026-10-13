// Keeps one view per live simulation object and reuses views of objects that are gone.
export interface PooledView {
  setVisible(visible: boolean): unknown;
}

export class ViewPool<E extends object, V extends PooledView> {
  private live = new Map<E, { view: V; seen: number }>();
  private free = new Map<string, V[]>();
  private frame = 0;

  // kind(e) names which sort of view an object needs; views are only reused within the same kind.
  constructor(
    private kind: (e: E) => string,
    private make: (e: E) => V,
  ) {}

  // update(e, view, fresh): fresh is true the first frame this view shows this object.
  sync(objects: readonly E[], update: (e: E, view: V, fresh: boolean) => void) {
    const frame = ++this.frame;
    for (const e of objects) {
      let entry = this.live.get(e);
      const fresh = !entry;
      if (!entry) {
        const view = this.free.get(this.kind(e))?.pop() ?? this.make(e);
        view.setVisible(true);
        entry = { view, seen: frame };
        this.live.set(e, entry);
      }
      entry.seen = frame;
      update(e, entry.view, fresh);
    }
    // More views than objects means something went away since last frame: put its view back on the
    // spare pile. (Most frames nothing has, and this is skipped.)
    if (this.live.size > objects.length)
      for (const [e, entry] of this.live) {
        if (entry.seen === frame) continue;
        entry.view.setVisible(false);
        this.live.delete(e);
        const kind = this.kind(e);
        if (!this.free.has(kind)) this.free.set(kind, []);
        this.free.get(kind)!.push(entry.view);
      }
  }
}
