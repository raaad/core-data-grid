import { CollectionViewer, DataSource, ListRange } from '@angular/cdk/collections';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, mergeMap, tap } from 'rxjs/operators';

export interface PageChange<G> {
  group: G;
  page: number;
}

export class GroupedDataSource<T, G> implements DataSource<T | G> {
  protected groups = new Map<G, { /** render index */ index: number; total: number }>();

  private collapsed = new BehaviorSubject<G[]>([]);

  private readonly subscription = new Subscription();

  /** For internal groups cache */
  private readonly _isGroup;

  /** For internal groups cache */
  private readonly _getTotal;

  constructor(
    private readonly items: Observable<(T | G)[]>,
    isGroup: (item: T | G) => item is G,
    getTotal: (group: G) => number,
    private readonly pageChange?: (i: PageChange<G | undefined>) => void,
    private readonly pageSize = 500
  ) {
    this._isGroup = isGroup;
    this._getTotal = getTotal;
  }

  connect(viewer: CollectionViewer) {
    const stream = this.alwaysWithGroups(this.withCollapsed(this.items), viewer);

    // emit when page changing
    this.watchPages(viewer);

    return stream;
  }

  disconnect() {
    this.subscription.unsubscribe();
    this.collapsed.next([]);
    this.groups.clear();
  }

  private withCollapsed(stream: Observable<(T | G)[]>) {
    return combineLatest([
      // ensure collapsed still exists
      stream.pipe(
        tap(items => {
          const collapsed = this.collapsed.value.filter(i => items.includes(i));
          this.collapsed.value.length !== collapsed.length && this.collapsed.next(collapsed);
        })
      ),
      this.collapsed
    ]).pipe(
      // exclude collapsed
      map(([items, collapsed]) => (collapsed.length ? collapsed.reduce((r, g) => (r.splice(r.indexOf(g) + 1, this._getTotal(g)), r), items.slice()) : items)),
      // re|calculate groups
      tap(items => (this.groups.clear(), items.forEach((i, index) => this._isGroup(i) && this.groups.set(i, { index, total: this._getTotal(i) }))))
    );
  }

  private alwaysWithGroups(stream: Observable<(T | G)[]>, viewer: CollectionViewer) {
    // rethrow viewChange, otherwise won't initiated
    const viewChange = new BehaviorSubject<ListRange>({ start: 0, end: 0 });
    this.subscription.add(viewer.viewChange.subscribe(range => viewChange.next(range)));

    return combineLatest([stream, viewChange]).pipe(
      // reorder stream to ensure that sticky groups are always visible
      map(([items, { start, end }]) => {
        const result = items.slice();
        const indexes = Array.from(this.groups.values()).map(({ index }) => index);

        let before = indexes.filter(i => i <= start);
        before = [...before, ...indexes.filter(i => i > start && i <= start + before.length)]; // clarify edge cases
        move(result, start, before);

        let after = indexes.filter(i => i > end);
        after = [...indexes.filter(i => i >= end - after.length && i <= end), ...after]; // clarify edge cases
        move(result, end - after.length, after);

        return result;
      })
    );

    function move(items: unknown[], to: number, indexes: number[]) {
      const moved = indexes.flatMap((i, shift) => items.splice(i - shift, 1));
      items.splice(to, 0, ...moved);
    }
  }

  private watchPages(viewer: CollectionViewer) {
    // emit when page changing
    this.pageChange &&
      this.subscription.add(
        viewer.viewChange
          .pipe(
            mergeMap(({ start, end }) =>
              (this.groups.size ? Array.from(this.groups.keys()) : [undefined as G | undefined])
                .filter(g => !g || !this.isCollapsed(g))
                .reduce((r, group) => {
                  const { index, total } = this.groups.get(group as G) ?? { index: 0, total: Number.MAX_SAFE_INTEGER }; // for nogroups mode

                  const s = Math.max(start - index + 1, 0);
                  const e = Math.min(end - index + 1, total - 1);

                  if (e >= 0 && s < total) {
                    const ps = Math.floor(s / this.pageSize) + 1;
                    const pe = Math.floor(e / this.pageSize) + 1;

                    const pages = new Array(pe - ps + 1).fill(0).map((_, i) => ps + i);

                    r.push(...pages.map(page => ({ group, page })));
                  }

                  return r;
                }, [] as PageChange<G | undefined>[])
            ),
            distinctUntilChanged(({ group: g1, page: p1 }, { group: g2, page: p2 }) => g1 === g2 && p1 === p2)
          )
          .subscribe(i => this.pageChange?.(i))
      );
  }

  // #region groups

  isGroup(item: T | G): item is G {
    return this.groups.has(item as G);
  }

  isCollapsed(group: G) {
    return this.collapsed.value.includes(group);
  }

  toggle(group: G) {
    this.collapsed.next(this.isCollapsed(group) ? this.collapsed.value.filter(i => i !== group) : [...this.collapsed.value, group]);
  }

  getTotal(group: G) {
    return this.groups.get(group)?.total;
  }

  /** Index in groups array */
  groupStartIndex(item: T | G) {
    return this.isGroup(item) ? Array.from(this.groups.keys()).indexOf(item) : undefined;
  }

  /** Index (from the end) in groups array */
  groupEndIndex(item: T | G) {
    const index = this.groupStartIndex(item);
    return index !== undefined ? this.groups.size - 1 - index : undefined;
  }

  /** Index in render stream */
  groupScrollIndex(group: G) {
    return (this.groups.get(group)?.index ?? 0) - (this.groupStartIndex(group) ?? 0);
  }

  getGroup(itemIndex: number) {
    const [group] = Array.from(this.groups).find(([, { index, total }]) => itemIndex > index && itemIndex <= index + total) ?? [];
    return group;
  }

  getLocalIndex(group: G, itemIndex: number) {
    return itemIndex - (this.groups.get(group)?.index ?? 0) - 1;
  }

  // #endregion
}
