import { Component } from '@angular/core';
import { DataGridSource, QueryPaging } from 'core-data-grid';
import { combineLatest, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

export interface Group {
  name: string;
  children: (Item | undefined)[];
}

export interface Item {
  id: number;
  name: string;
  prop1: number;
}
@Component({
  selector: 'app-root',
  template: `
    <core-data-grid [source]="source">
      <td
        *coreGridGroup="let group; let context = context; let index = index; let total = total; let renderIndex = renderIndex; let renderTotal = renderTotal"
        colspan="999"
        class="group"
      >
        <div>
          <span (click)="context.toggle()">{{ context.collapsed ? '›' : '⌄' }}</span>
          <span (click)="context.scrollTo()" (dblclick)="context.toggle()"> {{ group.name }} ({{ total }}) </span>
        </div>
      </td>

      <!-- <td *coreGridPlaceholder colspan="999"></td>  -->

      <ng-container coreGridColumn="#">
        <th *coreGridHeaderCell cdkDrag [cdkDragDisabled]="true">#</th>
        <td *coreGridCell="let item; let group = group; let index = index; let total = total; let renderIndex = renderIndex; let renderTotal = renderTotal">
          {{ index }}: {{ renderIndex }}
        </td>
      </ng-container>

      <ng-container coreGridColumn="name">
        <th *coreGridHeaderCell cdkDrag cdkDragPreviewClass="data-grid">Name</th>
        <td *coreGridCell="let item">{{ item.id }}: {{ item.name }}</td>
      </ng-container>

      <ng-container coreGridColumn="prop1">
        <th *coreGridHeaderCell cdkDrag cdkDragPreviewClass="data-grid">Prop1</th>
        <td *coreGridCell="let item">
          {{ item.prop1 | number: '1.2-2' }}
        </td>
      </ng-container>
    </core-data-grid>
  `,
  styles: [
    `
      /* mandatory variables */
      core-data-grid {
        --header-size: 64px;
        --group-size: 48px;
        --item-size: 32px;
      }

      th {
        padding: 0;
        height: var(--header-size);
        background: #ffffffe6;
      }

      td {
        height: var(--item-size);
      }

      .group {
        height: var(--group-size);
        transition: background 0.5s, box-shadow 0.2s;
      }

      :host::ng-deep .data-grid--row.top-sticked > .group {
        box-shadow: 0 5px 5px #00000030;
        background: #ffffffe6;
      }

      :host::ng-deep .data-grid--row.bottom-sticked > .group {
        box-shadow: 0 -5px 5px #00000030;
        background: #ffffffe6;
      }

      /*----------*/

      :host {
        display: block;
        height: inherit;
      }

      /* group UI */
      .group > div {
        display: flex;
        cursor: pointer;
      }

      .group span:first-child {
        width: 48px;
        text-align: center;
      }

      .group span:last-child {
        flex: 1;
      }

      /* drag-preview style */

      ::ng-deep .cdk-drag-preview.data-grid {
        background: #00000050;
      }

      :host::ng-deep .cdk-drop-list-dragging :not(.cdk-drag-placeholder) {
        transition: transform 0.2s;
      }

      /* reset */
      ::ng-deep table {
        border-spacing: 0;
      }

      th,
      td {
        text-align: left;
        vertical-align: middle;
        font-weight: normal;
      }
    `
  ]
})
export class AppComponent {
  source: DataGridSource<Item, Group> = {
    data: combineLatest(
      (
        [
          { name: 'g1', children: [] as Item[] },
          { name: 'g2', children: [] as Item[] },
          { name: 'g3', children: [] as Item[] }
        ] as Group[]
      ).flatMap((g, i) => fetchPage(i, { skip: 0, take: 100 }, 0).pipe(map(({ items }) => ((g.children = items), [g, ...items]))))
    ).pipe(map(([...groups]) => groups.flat())),
    isGroup: (i): i is Group => !!(i as Group)?.children,
    getTotal: i => i.children.length
  };
}

export function fetchPage(groupIndex: number, { skip, take }: QueryPaging, period = 1000) {
  const page = skip / take + 1;
  const index = (page - 1) * take;
  const chunk = new Array(take)
    .fill(0)
    .map((_, i) => ({ id: groupIndex * 1e3 + index + i, name: `name${groupIndex + 1}.${index + i + 1} `, prop1: +(Math.random() * 1000).toFixed(1) } as Item));

  return of({ skipped: (page - 1) * 50, items: chunk, total: 150 }).pipe(
    // eslint-disable-next-line no-console
    tap(() => console.log(`${page} fetching`)),
    delay(period),
    // eslint-disable-next-line no-console
    tap(() => console.log(`${page} fetched`))
  );
}
