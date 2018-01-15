import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule as ngCommonModule } from '@angular/common';
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { MainComponent } from './components/main/main.component'
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component'
import { ContentHeaderComponent } from './components/content/header/content-header.component'
import { ContentBodyComponent } from './components/content/body/content-body.component'
import { EmptyPanelComponent } from './components/empty-panel/empty-panel.component'
import { DebugPanelComponent } from './components/debug-panel/debug-panel.component'

@NgModule({
  imports: [
    ngCommonModule,
    RouterModule,
    NgbModule,
  ],
  declarations: [
    MainComponent,
    PageNotFoundComponent,
    ContentHeaderComponent,
    ContentBodyComponent,
    EmptyPanelComponent,
    DebugPanelComponent
  ],
  providers: [],
  exports: [
    ngCommonModule,
    NgbModule,
    ContentHeaderComponent,
    ContentBodyComponent,
    EmptyPanelComponent,
    DebugPanelComponent
  ]
})
export class CommonModule { }
