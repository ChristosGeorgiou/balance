import { WrapperComponent } from './components/_wrapper/wrapper.component'
import { OverviewComponent } from './components/overview/overview.component'
import { ViewComponent } from './components/view/view.component'

export const OrdersRoutes = [
  {
    path: 'orders',
    component: WrapperComponent,
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'view/:id', component: ViewComponent },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  }]