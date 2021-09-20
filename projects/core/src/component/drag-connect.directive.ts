import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Directive, Inject, InjectionToken, Optional } from '@angular/core';
import { Logger } from '../logger.service';

/**
 * Allows to connect cdkDrag to cdkDropList, when cdkDrag is defined in ngTemplate
 *
 * @see {@link https://github.com/angular/components/issues/15553#issuecomment-474994910}
 */
export const DRAG_CONNECT = new InjectionToken('DRAG_CONNECT');

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[cdkDropList]' })
export class DropConnectDirective {
  constructor(dropList: CdkDropList, @Optional() @Inject(DRAG_CONNECT) connect?: DragConnect, @Optional() logger?: Logger) {
    connect ? (connect.dropList = dropList) : logger?.debug('DropConnect skipping: DRAG_CONNECT is not found');
  }
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[cdkDrag]' })
export class DragConnectDirective {
  constructor(drag: CdkDrag, @Optional() @Inject(DRAG_CONNECT) connect?: DragConnect, @Optional() logger?: Logger) {
    const dropList = connect?.dropList;

    if (dropList) {
      // sort of hack: using internal logic from https://github.com/angular/components/blob/10.2.7/src/cdk/drag-drop/directives/drag.ts#L211
      drag.dropContainer = dropList;
      // eslint-disable-next-line no-underscore-dangle
      drag._dragRef._withDropContainer(dropList._dropListRef);
      dropList.addItem(drag);
    } else {
      logger?.debug('DragConnect skipping: DRAG_CONNECT or CdkDropList is not found');
    }
  }
}

interface DragConnect {
  dropList: CdkDropList | undefined;
}
