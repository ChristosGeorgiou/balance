import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import * as AdapterHttp from 'pouchdb-adapter-http'
import * as AdapterMemory from 'pouchdb-adapter-memory'
import { RxCollection, RxReplicationState } from 'rxdb'
import AdapterCheckPlugin from 'rxdb/plugins/adapter-check'
import AttachmentsPlugin from 'rxdb/plugins/attachments'
import RxDB from 'rxdb/plugins/core'
import RxDBErrorMessagesModule from 'rxdb/plugins/error-messages'
import JsonDumpPlugin from 'rxdb/plugins/json-dump'
import RxDBLeaderElectionModule from 'rxdb/plugins/leader-election'
import RxDBReplicationModule from 'rxdb/plugins/replication'
import RxDBReplicationGraphQL from 'rxdb/plugins/replication-graphql'
import RxDBSchemaCheckModule from 'rxdb/plugins/schema-check'
import RxDBUpdateModule from 'rxdb/plugins/update'
import RxDBValidateModule from 'rxdb/plugins/validate'
import environment from '../../../environments/environment'
import { ConfigService } from '../services/config.service'
import { RemoteConfig } from './config'
import { Entity } from './entity'

if (!environment.production) {
  console.log('[DatabaseService]', 'In debug')
  RxDB.plugin(RxDBSchemaCheckModule)
  RxDB.QueryChangeDetector.enableDebugging()
}

RxDB.plugin(RxDBValidateModule)
RxDB.plugin(RxDBLeaderElectionModule)
RxDB.plugin(RxDBReplicationModule)
RxDB.plugin(AttachmentsPlugin)
RxDB.plugin(RxDBErrorMessagesModule)
RxDB.plugin(AdapterCheckPlugin)
RxDB.plugin(JsonDumpPlugin)
RxDB.plugin(AdapterHttp)
RxDB.plugin(AdapterMemory)
RxDB.plugin(RxDBUpdateModule)
RxDB.plugin(RxDBReplicationGraphQL)

@Injectable()
export class RxDBService {

  private config: RemoteConfig
  private replicationStates: { [key: string]: RxReplicationState } = {}
  private key: string

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private toastr: ToastrService
  ) {
    if (!configService.profile) return
    this.key = configService.profile.key
    this.config = configService.profile.remote || {
      enabled: false
    }
  }

  async setup(alias, entities: Entity[]) {
    if (!this.configService.profile) {
      console.log('[DatabaseService]', `There is not a selected profile`)
      return
    }

    const name = `db_${this.key}_${alias}`

    console.log('[DatabaseService]', `Initializing DB: ${name}`, entities)
    const _adapter = await this.getAdapter()
    const db = await RxDB.create({
      name: name,
      adapter: 'memory'
    })

    let sets = []
    for (const entity of entities) {
      let set = db.collection({
        name: entity.name,
        schema: entity.schema,
        migrationStrategies: entity.migrationStrategies || {}
      })
      sets.push(set)
    }
    await Promise.all(sets)
    await this.sync(alias, db, entities)

    return db
  }

  async sync(alias, db, entities) {

    console.log('[DatabaseService]', `Sync entities`, entities)

    const name = `${this.config.key}_${alias}`

    if (!this.config.enabled) {
      return
    }

    if (this.config.username) {
      await this.authenticate(this.config.username, this.config.password)
    }

    entities.forEach((entity) => {
      if (entity.sync) {
        const coll: RxCollection<any> = db[entity.name]

        if (!coll) {
          console.log('[DatabaseService]', `Entity ${entity.name} for ${name} not found`)
        }

        if (entity.syncType === 'graphql') {
          this.replicationStates[entity.name] = this.syncGraphQL(entity, coll)
        } else {
          this.replicationStates[entity.name] = this.syncCouch(entity, coll)
        }

        this.replicationStates[entity.name].error$.subscribe((err) => {
          this.toastr.error(err, '[Database] Sync Error')
        })
      }
    })
  }

  syncGraphQL(entity, coll) {
    console.log('sync with syncGraphQL')
    return coll.syncGraphQL({
      url: 'http://127.0.0.1:10102/graphql',
      push: {
        batchSize: 5,
        queryBuilder: (doc) => {
          return {
            query: entity.mutationQuery,
            variables: {
              doc
            }
          }
        }
      },
      pull: {
        queryBuilder: (doc) => {
          if (!doc) {
            doc = {
              id: '',
              updatedAt: 0
            }
          }
          return {
            query: entity.feedQuery(doc, 5),
            variables: {}
          }
        }
      },
      live: true,
      /**
       * TODO
       * we have to set this to a low value, because the subscription-trigger
       * does not work sometimes. See below at the SubscriptionClient
       */
      liveInterval: 1000 * 2,
      deletedFlag: 'deleted'
    })
  }

  syncCouch(entity, coll) {
    console.log('sync with syncCouch')
    return coll.sync({
      remote: `${this.config.db}/${name}_${entity.name}/`,
      options: {
        live: true,
        retry: true
      }
    })
  }

  async authenticate(username: string, password: string) {
    return this.http.post(`${this.config.db}/_session`, {
      name: username,
      password: password
    }, { withCredentials: true })
      .toPromise()
      .catch((res) => {
        this.toastr.error('Could not auto-login with db server. Check your internet connection.', '[Database] Load Failed')
      })
  }

  async removeProfile(profileId: string, entities: Entity[]) {
    const adapter = await this.getAdapter()
    entities.forEach(async (entity) => {
      const name = `${profileId}_${entity.name}`
      await RxDB.removeDatabase(name, adapter)
    })
  }

  private async getAdapter() {
    return 'memory'
    if (await RxDB.checkAdapter('idb')) {
      return 'idb'
    }
    if (await RxDB.checkAdapter('websql')) {
      return 'websql'
    }
  }

  // async export (alias: string) {
  //   console.log(this.entities)
  //   return this.db.dump()
  //   // const data = await this.db.dump()
  //   // return data.map(d => {
  //   //   return d
  //   // })
  // }
}
