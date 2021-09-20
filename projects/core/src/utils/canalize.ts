import { combineLatest, merge, Observable, of, race } from 'rxjs';
import { distinct, filter, finalize, map, mergeMap, scan, tap, withLatestFrom } from 'rxjs/operators';
import { PageChange } from '../component/grouped-data-source';

// #region types

export interface QueryChunk<T> {
  items: T[];
  total: number | -1; // -1 => indeterminate number of items
  skipped?: number;
}

export interface QueryPaging {
  skip: number;
  take: number;
}

// #endregion

/**
 * Combines all into single stream
 *
 * @param filters filters stream, at least one value must present
 * @param ordering ordering stream, at least one value must present
 * @param paging paging stream
 * @param pageSize page size
 * @param fetch data fetching method
 */
export function canalize<T, F, O>(
  filters: Observable<F>,
  ordering: Observable<O>,
  paging: Observable<number>,
  pageSize: number,
  fetch: (f: F, o: O, p: QueryPaging) => Observable<QueryChunk<T>>
) {
  const pending = new Map<number, () => void>();

  let prevTotal = 0;

  const shaping = combineLatest([filters, ordering]);

  const pages = merge(
    paging,
    shaping.pipe(map(() => 1)) // reset to first page on shaping change
  ).pipe(
    distinct(undefined, shaping) // to do not fetch same pages twice, invalidated on shaping change
  );

  return merge(
    shaping.pipe(map(() => new Array<T | undefined>(prevTotal).fill(undefined))),
    pages.pipe(
      withLatestFrom(shaping),
      mergeMap(([p, [f, s]]) => {
        cancel(p === 1 ? undefined : p);
        return race(fetch(f, s, { skip: (p - 1) * pageSize, take: pageSize }), cancellation(p)).pipe(finalize(() => cancel(p)));
      }),
      scan((prev, { skipped, total, items }) => {
        !skipped && (prev = []); // request of first page means that shaping is changed and previously loaded data is obsolete

        // replace placeholders with chunk`s data
        const result = prev.slice(0, total).concat(new Array(Math.max(total - prev.length, 0)).fill(undefined));
        result.splice(skipped ?? 0, items.length, ...items);
        return result;
      }, [] as (T | undefined)[]),
      tap(items => (prevTotal = items.length))
    )
  );

  function cancellation(p: number) {
    return new Observable<QueryChunk<T>>(s => {
      pending.set(p, () => s.complete());
    });
  }

  function cancel(p?: number) {
    (p ? [p] : Array.from(pending.keys())).forEach(i => {
      pending.get(i)?.();
      pending.delete(i);
    });
  }
}

/**
 * Combines all into single grouped stream
 * @param groups groups
 * @param filters filters stream, at least one value must present
 * @param ordering ordering stream, at least one value must present
 * @param paging paging stream
 * @param pageSize page size
 * @param fetch data fetching method
 * @param itemsChange notifies if group changed
 */
export function canalizeAll<T, G, F, O>(
  groups: G[],
  filters: Observable<F>,
  ordering: Observable<O>,
  paging: Observable<PageChange<G>>,
  pageSize: number,
  fetch: (g: G, f: F, o: O, p: QueryPaging) => Observable<QueryChunk<T>>,
  itemsChange?: (g: G, items: (T | undefined)[]) => void
) {
  return combineLatest(
    groups.map(group =>
      merge(
        canalize(
          filters,
          ordering,
          paging.pipe(
            filter(({ group: g }) => g === group),
            map(({ page }) => page)
          ),
          pageSize,
          (f, s, p) => fetch(group, f, s, p)
        ).pipe(
          tap(items => itemsChange?.(group, items)),
          map(items => [group, ...items])
        ),
        of([group, undefined] as (G | T | undefined)[]) // immediately emit group and one placeholder as loading indicator
      )
    )
  ).pipe(map(items => items.flat()));
}
