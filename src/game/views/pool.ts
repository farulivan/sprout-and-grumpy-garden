// Keeps one view per live simulation object and reuses views of objects that are gone.
export interface PooledView {
  setVisible(visible: boolean): unknown;
}

export class ViewPool<E extends object, V extends PooledView> {
  private live = new Map<E, V>();
  private free = new Map<string, V[]>();

  // kind(e) names which sort of view an object needs; views are only reused within the same kind.
  constructor(
    private kind: (e: E) => string,
    private make: (e: E) => V,
  ) {}

  // update(e, view, fresh): fresh is true the first frame this view shows this object.
  sync(objects: readonly E[], update: (e: E, view: V, fresh: boolean) => void) {
    const seen = new Set<E>(objects);
    for (const [e, view] of this.live) {
      if (seen.has(e)) continue;
      view.setVisible(false);
      this.live.delete(e);
      const kind = this.kind(e);
      if (!this.free.has(kind)) this.free.set(kind, []);
      this.free.get(kind)!.push(view);
    }
    for (const e of objects) {
      let view = this.live.get(e);
      const fresh = !view;
      if (!view) {
        view = this.free.get(this.kind(e))?.pop() ?? this.make(e);
        view.setVisible(true);
        this.live.set(e, view);
      }
      update(e, view, fresh);
    }
  }
}
