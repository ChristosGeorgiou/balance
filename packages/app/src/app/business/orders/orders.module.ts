import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { SharedModule } from '@balnc/shared'
import { OrderCreateComponent } from './order-create/order-create.component'
import { OrderComponent } from './order/order.component'
import { OrdersComponent } from './orders/orders.component'

@NgModule({
  declarations: [
    OrdersComponent,
    OrderComponent,
    OrderCreateComponent
  ],
  entryComponents: [
    OrderCreateComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: '', component: OrdersComponent },
      { path: ':id', component: OrderComponent }
    ])
  ]
})
export class OrdersModule { }
