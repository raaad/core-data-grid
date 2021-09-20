import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { GridCellDirective, GridColumnDirective, GridGroupDirective, GridHeaderCellDirective, GridPlaceholderDirective } from './component/column-tmpls.directive';
import { DataGridComponent } from './component/data-grid.component';
import { DragConnectDirective, DropConnectDirective } from './component/drag-connect.directive';
import { GridRowStickedDirective } from './component/row-sticked.directive';

@NgModule({
  imports: [CommonModule, ScrollingModule, DragDropModule],
  declarations: [
    DataGridComponent,
    GridColumnDirective,
    GridHeaderCellDirective,
    GridCellDirective,
    GridGroupDirective,
    GridPlaceholderDirective,
    GridRowStickedDirective,
    DragConnectDirective,
    DropConnectDirective
  ],
  exports: [
    DataGridComponent,
    GridColumnDirective,
    GridHeaderCellDirective,
    GridCellDirective,
    GridGroupDirective,
    GridPlaceholderDirective,
    GridRowStickedDirective,
    DragConnectDirective,
    DropConnectDirective
  ]
})
export class DataGridModule {}
