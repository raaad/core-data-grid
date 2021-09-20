import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Directive, ElementRef, Input, OnDestroy, OnInit, Optional } from '@angular/core';

// TODO: update when scrollHeight changed (no scroll event fired)...ResizeObserver?

/** Add classes top-sticked | bottom-sticked when row is sticked */
@Directive({ selector: '[coreGridRowSticked]' })
export class GridRowStickedDirective implements OnInit, OnDestroy {
  @Input('coreGridRowSticked') enabled?: boolean;

  private parent?: HTMLElement;

  private handler?: EventListener;

  constructor(private el: ElementRef<HTMLTableRowElement>, @Optional() private viewport?: CdkVirtualScrollViewport) {}

  ngOnInit() {
    this.parent = this.enabled ? this.viewport?.elementRef.nativeElement : undefined;

    this.parent?.addEventListener('scroll', (this.handler = () => this.update()));

    this.parent && this.update();
  }

  ngOnDestroy() {
    this.handler && this.parent?.removeEventListener('scroll', this.handler);
  }

  private update() {
    const el = this.el.nativeElement;
    const { top } = el.getBoundingClientRect();
    const stickyTop = el.firstElementChild?.getBoundingClientRect().top ?? 0;
    const prevBottom = el.previousElementSibling?.getBoundingClientRect().bottom ?? stickyTop;

    const topSticked = top < stickyTop;
    const bottomSticked = !topSticked && stickyTop !== prevBottom;

    el.classList.toggle('top-sticked', topSticked);
    el.classList.toggle('bottom-sticked', bottomSticked);
  }
}
