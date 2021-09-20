import { ContentChild, Directive, Input, TemplateRef } from '@angular/core';

@Directive()
abstract class BaseTmplDirective<T> {
  constructor(public readonly tmpl: TemplateRef<T>) {}
}

/** Grid header cell template */
@Directive({ selector: '[coreGridHeaderCell]' })
export class GridHeaderCellDirective extends BaseTmplDirective<{ $implicit: unknown }> {}

/** Grid data cell template */
@Directive({ selector: '[coreGridCell]' })
export class GridCellDirective<T, G> extends BaseTmplDirective<GridCellContext<T, G>> {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  static ngTemplateContextGuard<T, G>(_: GridCellDirective<T, G>, ctx: unknown): ctx is GridCellContext<T, G> {
    return true || ctx /* for TS6133 */;
  }
}

export interface GridCellContext<T, G> {
  $implicit: T;
  group: G | undefined;
  index: number;
  total: number;
  renderIndex: number;
  renderTotal: number;
}

/** Grid column templates */
@Directive({ selector: '[coreGridColumn]' })
export class GridColumnDirective<T, G> {
  @Input('coreGridColumn') key: unknown;

  @ContentChild(GridHeaderCellDirective) headerCell: GridHeaderCellDirective | null = null;

  @ContentChild(GridCellDirective) cell: GridCellDirective<T, G> | null = null;
}

// group & placeholder

/** Grid group row template */
@Directive({ selector: '[coreGridGroup]' })
export class GridGroupDirective<G> extends BaseTmplDirective<GridGroupTmplContext<G>> {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  static ngTemplateContextGuard<G>(_: GridGroupDirective<G>, ctx: unknown): ctx is GridGroupTmplContext<G> {
    return true || ctx /* for TS6133 */;
  }
}

export interface GridGroupTmplContext<G> {
  $implicit: G;
  context: GridGroupContext;
  index: number;
  total: number;
  renderIndex: number;
  renderTotal: number;
}

export interface GridGroupContext {
  collapsed: boolean;
  toggle(): void;
  scrollTo(): void;
}

@Directive({ selector: '[coreGridPlaceholder]' })
export class GridPlaceholderDirective extends BaseTmplDirective<never> {}
