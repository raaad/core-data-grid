import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from '@angular/core';
import { isObservable, Observable } from 'rxjs';
import { throwIt } from '../utils/throw-it';
import { GridCellContext, GridColumnDirective, GridGroupDirective, GridGroupTmplContext, GridPlaceholderDirective } from './column-tmpls.directive';
import { DRAG_CONNECT } from './drag-connect.directive';
import { GroupedDataSource, PageChange } from './grouped-data-source';

// TODO: @Input() columns: unknown[] | Observable<unknown[]>?
// TODO: empty placeholder? per group?

export interface DataGridSource<T, G = T> {
  data: Observable<(T | G)[]>;
  isGroup: (item: T | G) => item is G;
  getTotal: (group: G) => number;
}

@Component({
  selector: 'core-data-grid',
  template: `
    <cdk-virtual-scroll-viewport [itemSize]="itemSize">
      <table class="data-grid--table">
        <thead>
          <tr
            [coreGridRowSticked]="true"
            cdkDropList
            (cdkDropListDropped)="reorder($event)"
            cdkDropListOrientation="horizontal"
            cdkDropListLockAxis="x"
            class="data-grid--row"
          >
            <!-- header cell -->
            <ng-container *ngFor="let column of columns">
              <ng-container *ngTemplateOutlet="getHeaderCell(column); context: { $implicit: column }"></ng-container>
            </ng-container>
          </tr>
        </thead>
        <tbody>
          <tr
            *cdkVirtualFor="let item of ds; let index = index; let total = count"
            [class.group]="ds?.isGroup(item)"
            [style.--group-top-index]="ds?.groupStartIndex(item)"
            [style.--group-bottom-index]="ds?.groupEndIndex(item)"
            [coreGridRowSticked]="ds?.isGroup(item) || undefined"
            class="data-grid--row"
          >
            <!-- group row -->
            <ng-container *ngIf="ds?.isGroup(item)">
              <ng-container *ngTemplateOutlet="getGroup(); context: getGroupContext(item, index, total)"></ng-container>
            </ng-container>
            <!-- data cell -->
            <ng-container *ngIf="item && !ds?.isGroup(item)">
              <ng-container *ngFor="let column of columns">
                <ng-container *ngTemplateOutlet="getCell(column); context: getItemContext(item, index, total)"></ng-container>
              </ng-container>
              <!-- in case no columns yet -->
              <ng-container *ngIf="!columns.length">
                <ng-container *ngTemplateOutlet="placeholderTmpl?.tmpl || defaultPlaceholder"></ng-container>
              </ng-container>
            </ng-container>
            <!-- placeholder row -->
            <ng-container *ngIf="!item">
              <ng-container *ngTemplateOutlet="placeholderTmpl?.tmpl || defaultPlaceholder"></ng-container>
            </ng-container>
          </tr>
        </tbody>
      </table>
    </cdk-virtual-scroll-viewport>
    <!-- default placeholder -->
    <ng-template #defaultPlaceholder>
      <td class="placeholder" colspan="999">loading...</td>
    </ng-template>
  `,
  styles: [
    `
      /*
       for more precise styling from outside:
       .data-grid--table
       .data-grid--row
      */

      :host {
        /*
        --header-size & for js cdk-virtual-scroll
        --group-size
        --item-size
        */

        display: block;
        height: 100%;
      }

      cdk-virtual-scroll-viewport {
        height: inherit;
      }

      :host::ng-deep .cdk-virtual-scroll-content-wrapper {
        will-change: transform;
      }

      :host::ng-deep .cdk-virtual-scroll-spacer {
        will-change: height;
      }

      table {
        width: 100%;
      }

      /* ng-deep: th in different component-tree, .data-grid--row is less specific than tr */
      .data-grid--row::ng-deep > th,
      .data-grid--row.group::ng-deep > td {
        z-index: 2; /* must be higher than on sticky column */
        position: sticky;
      }

      tr::ng-deep > th {
        top: var(--viewport-offset);
        will-change: top;
      }

      .group::ng-deep > td {
        top: calc(var(--viewport-offset) + var(--header-size) + var(--group-size) * var(--group-top-index));
        bottom: calc(var(--viewport-offset) * -1 + var(--group-size) * var(--group-bottom-index));
        will-change: top, bottom;
      }

      .placeholder core-progress {
        --progress-height: calc(var(--item-size) / 2);
        padding: 0 var(--progress-height);
      }
    `
  ],
  providers: [{ provide: DRAG_CONNECT, useValue: {} }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent<T, G = T> implements OnInit, AfterContentInit {
  @ViewChild(CdkVirtualScrollViewport) private viewport?: CdkVirtualScrollViewport;

  @ContentChildren(GridColumnDirective) columnTmpls = new QueryList<GridColumnDirective<T, G>>();

  @ContentChild(GridGroupDirective) groupTmpl: GridGroupDirective<G> | null = null;

  @ContentChild(GridPlaceholderDirective) placeholderTmpl: GridPlaceholderDirective | null = null;

  @Input() source?: Observable<T[]> | DataGridSource<T, G>;

  @Input() pageSize?: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() pageChange = new EventEmitter<PageChange<any>>();

  @Output() orderChange = new EventEmitter<unknown[]>();

  readonly columns: unknown[] = [];

  ds?: GroupedDataSource<T, G>; // low level abstract data-source

  itemSize = 0;

  @HostBinding('style.--viewport-offset')
  get viewportOffset() {
    return `-${this.viewport?.getOffsetToRenderedContentStart() ?? 0}px`;
  }

  constructor(private readonly el: ElementRef<HTMLElement>, private readonly detect: ChangeDetectorRef) {}

  ngOnInit() {
    const source = this.getSource();

    this.ds = new GroupedDataSource<T, G>(source.data, source.isGroup.bind(source), source.getTotal.bind(source), i => this.pageChange.emit(i), this.pageSize);

    this.itemSize = getItemSize(this.el.nativeElement);
  }

  ngAfterContentInit() {
    this.updateColumns();
    this.columnTmpls.changes.subscribe(() => (this.updateColumns(), this.detect.markForCheck()));
  }

  private getSource() {
    return isObservable(this.source)
      ? {
          data: this.source,
          isGroup: (i: T | G): i is G => false && i /* for TS6133 */, // stub for nongrouped
          getTotal: () => 0 // stub for nongrouped
        }
      : this.source ?? throwIt('source is missing');
  }

  getHeaderCell(key: unknown) {
    return this.columnTmpls.find(c => c.key === key)?.headerCell?.tmpl ?? throwIt(`header cell tmpl for '${key}' is missing`);
  }

  getCell(key: unknown) {
    return this.columnTmpls.find(c => c.key === key)?.cell?.tmpl ?? throwIt(`cell tmpl for '${key}' is missing`);
  }

  getGroup() {
    return this.groupTmpl?.tmpl ?? throwIt(`group tmpl is missing`);
  }

  getGroupContext(group: G, index: number, total: number): GridGroupTmplContext<G> {
    const ds = this.ds;
    const viewport = this.viewport;

    return {
      $implicit: group,
      context: {
        get collapsed() {
          return ds?.isCollapsed(group) ?? false;
        },
        scrollTo() {
          viewport?.scrollToIndex(ds?.groupScrollIndex(group) ?? -1);
        },
        toggle() {
          ds?.toggle(group);
        }
      },
      index: ds?.groupStartIndex(group) ?? -1,
      total: ds?.getTotal(group) ?? 0,
      renderIndex: index,
      renderTotal: total
    };
  }

  getItemContext(item: T, index: number, total: number): GridCellContext<T, G> {
    const group = this.ds?.getGroup(index);

    return {
      $implicit: item,
      group,
      index: group ? this.ds?.getLocalIndex(group, index) ?? -1 : index,
      total: group ? this.ds?.getTotal(group) ?? 0 : total,
      renderIndex: index,
      renderTotal: total
    };
  }

  private updateColumns() {
    this.columns.splice(0, this.columns.length, ...this.columnTmpls.map(({ key }) => key));
  }

  reorder({ previousIndex, currentIndex, container }: CdkDragDrop<unknown>) {
    if (previousIndex !== currentIndex) {
      const preserved = container.getSortedItems().reduce((r, i, index) => (i.disabled ? r.set(this.columns[index], index) : r), new Map<unknown, number>());

      moveItemInArray(this.columns, previousIndex, currentIndex);

      Array.from(preserved.entries()).forEach(([c, i]) => moveItemInArray(this.columns, this.columns.indexOf(c), i));

      this.orderChange.emit(this.columns.slice());
    }
  }
}

function getItemSize(el: Element) {
  const value = +getComputedStyle(el).getPropertyValue('--item-size').replace('px', '');
  return !isNaN(value) ? value : throwIt<number>('--item-size must be a direct value: number in px');
}
