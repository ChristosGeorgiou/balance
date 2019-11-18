import { Injectable, Injector } from '@angular/core'
import { Repository } from '@balnc/core'
import { CEventType, Contact } from '../models/contacts'
import { CEventsRepo } from './cevents.repo'

@Injectable()
export class ContactsRepo extends Repository<Contact> {

  constructor(
    injector: Injector,
    private ceventsService: CEventsRepo
  ) {
    super(injector)
    this.entity = 'business.contact'
  }

  async add(data: Partial<Contact>, ts?: number): Promise<Contact> {
    const contact = await super.add(data, ts)
    await this.ceventsService.add({
      contact: contact._id,
      type: CEventType.ContactCreated
    })
    return contact
  }
}
