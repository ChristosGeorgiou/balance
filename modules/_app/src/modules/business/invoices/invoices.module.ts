import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { InvoicesItemComponent, InvoicesOverviewComponent, InvoicesReportComponent } from './components'
import { db } from './data/db.service'

const appRoutes: Routes = [
  { path: 'overview', component: InvoicesOverviewComponent },
  { path: 'report/:id', component: InvoicesReportComponent },
  { path: 'report', component: InvoicesReportComponent },
  { path: 'item/:id', component: InvoicesItemComponent },
  { path: '', redirectTo: "report" },
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(appRoutes)
  ],
  declarations: [
    InvoicesOverviewComponent,
    InvoicesItemComponent,
    InvoicesReportComponent,
  ],
  providers: [
    db
  ]
})
export class InvoicesModule { }
