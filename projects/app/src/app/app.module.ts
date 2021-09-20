import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DataGridModule, Logger, LogLevel } from 'core-data-grid';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { ConsoleLogger } from './console-logger.service';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, DragDropModule, DataGridModule],
  providers: [{ provide: Logger, useValue: new ConsoleLogger(environment.production ? LogLevel.Warn : LogLevel.Trace) }],
  bootstrap: [AppComponent]
})
export class AppModule {}
