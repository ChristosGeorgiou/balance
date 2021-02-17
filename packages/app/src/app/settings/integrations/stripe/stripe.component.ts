import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ConfigService } from '@balnc/core';
import { loadStripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-stripe',
  templateUrl: './stripe.component.html'
})
export class StripeComponent implements OnInit {

  balance: any// Stripe.Balance
  paymentIntents: any// Stripe.ApiList<Stripe.PaymentIntent>

  get integrations() {
    return {
      ...{
        stripe: {
          key: null
        }
      }
    }
  }

  constructor(
    private configService: ConfigService,
    private http: HttpClient
  ) { }

  async ngOnInit() {
    await this.refreshStripe()
  }

  async applyStripe() {
    this.configService.update({
      ...this.configService.workspace,
      ...{
        integrations: {
          stripe: this.integrations.stripe
        }
      }
    })
    await this.refreshStripe()
  }

  async refreshStripe() {
    if (!this.integrations?.stripe?.key) return

    const stripe = loadStripe(this.integrations.stripe.key);

    // this.balance = await stripe.balance.retrieve();
    // this.paymentIntents = await stripe.paymentIntents.list();
  }
}
