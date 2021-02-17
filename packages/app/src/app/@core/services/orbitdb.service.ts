import { Injectable, NgZone } from '@angular/core'
import { Subscription } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { OrbitDBIntegration } from '../models/integration'
import { ConfigService } from './config.service'
import { RxDBService } from './rxdb.service'

@Injectable({
  providedIn: 'root'
})
export class OrbitDBService {

  private orbitdb
  private ipfs
  private ipfsMode: 'REMOTE' | 'LOCAL' = 'LOCAL'

  private db: any
  private rxdbSub: Subscription

  runningAddress
  private: Subscription

  get config () {
    return this.configService.integrations?.orbitdb as OrbitDBIntegration
  }

  get intentity () {
    return this.orbitdb?.intentity
  }

  constructor (
    private configService: ConfigService,
    private rxdbService: RxDBService,
    private zone: NgZone
  ) {
  }

  async setup () {
    // if (!this.ipfs) {
    //   console.log('[OrbitDB Service]', `Setup IPFS`)

    //   if (this.ipfsMode === 'REMOTE') {
    //     // this.ipfs = IpfsClient('http://localhost:5001')
    //   } else {
    //     this.ipfs = await IPFS.create({
    //       start: true,
    //       libp2p: {
    //         config: {
    //           dht: {
    //             enabled: true
    //           }
    //         }
    //       },
    //       preload: {
    //         enabled: false
    //       },
    //       config: {
    //         Addresses: {
    //           Swarm: [
    //             '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'
    //             // '/ip4/0.0.0.0/tcp/9090/ws/p2p-webrtc-star/'
    //           ]
    //         }
    //       }
    //     })
    //   }
    //   // this.ipfs.on('error', (e) => {
    //   //   console.error(e)
    //   // })
    // }
    // if (!this.orbitdb) {
    //   console.log('[OrbitDB Service]', `Setup OrbitDB`)
    //   this.orbitdb = await OrbitDB.createInstance(this.ipfs)
    //   console.log('[OrbitDB Service]', `OrbitDB`, this.orbitdb.id)
    // }
  }

  async start () {

    if (this.db && this.db.address.toString() === this.config.address) {
      console.log('[OrbitDB Service]', `database started. abord`)
      return
    }

    console.log('[OrbitDB Service]', `starting`, this.config.address)

    await this.zone.runOutsideAngular(async () => {

      this.db = await this.orbitdb.open(this.config.address, {
        create: true,
        replicate: true,
        localOnly: false,
        type: 'docstore',
        accessController: {
          write: ['*']
        }
      })

      console.log('this.db', this.db)

      this.rxdbSub = this.rxdbService.db.$.subscribe(changeEvent => {
        console.log('[OrbitDB Service]', 'rxdbService event', changeEvent.documentData)
        this.pouchToOrbit(changeEvent.documentData)
      })

      this.db.events.on('load', (dbname) => {
        console.log('[OrbitDB Service]', 'load', dbname)
      })

      this.db.events.on('load.progress', (address, hash, entry, progress, total) => {
        console.log('[OrbitDB Service]', 'load.progress')
      })
      this.db.events.on('replicated', (address) => {
        console.log('[OrbitDB Service]', 'replicated', address)
        // await this.orbitToPouch()
      })
      this.db.events.on('replicate.progress', (address, hash, entry, progress, have) => {
        console.log('[OrbitDB Service]', 'replicate.progress')
      })
      this.db.events.on('ready', (dbname, heads) => {
        console.log('[OrbitDB Service]', 'ready', dbname, heads)
        // await this.orbitToPouch()
      })

      await this.db.load()
    })
  }

  pouchToOrbit (pdoc) {
    let inStore = this.db.get(pdoc._id).filter((doc2) => {
      return pdoc._rev === doc2._rev
    })
    if (inStore.length === 0) {
      console.log('pouch _rev not exist in orbit', pdoc)
      this.db.put(pdoc)
    } else {
      console.log('pouch _rev exist in orbit', inStore)
    }
  }

  async orbitToPouch () {
    const pdocs = await this.rxdbService.db.entities.find().exec()
    const odocs = this.db.query((doc) => true)

    let p = []

    odocs.forEach(odoc => {

      let inPouch = pdocs.find((pdoc) => {
        return odoc._id === pdoc._id
      })

      if (inPouch) {
        if (inPouch._rev === odoc._rev) {
          console.log('pouch doc exist latest', inPouch._rev)
        } else {
          console.log('update pouch doc', odoc._id, odoc._rev)
          let d = this.rxdbService.db.entities.findOne(odoc._id)
          p.push(d.update({
            $set: {
              c: odoc.c
            }
          }))
        }
      } else {
        p.push(this.rxdbService.db.entities.insert({
          _id: odoc._id,
          _rev: odoc._rev,
          d: odoc.d,
          t: odoc.t,
          g: odoc.g,
          m: odoc.m,
          s: odoc.s,
          c: odoc.c
        }))
      }
    })

    await Promise.all(p)
  }

  async stop () {
    if (this.rxdbSub) {
      this.rxdbSub.unsubscribe()
    }

    if (!this.orbitdb) return
    console.log('[OrbitDB Service]', `disconnecting`)
    await this.orbitdb.disconnect()
  }

  async getPeers (): Promise<{ net?: any[], db?: any[] }> {
    if (!this.ipfs) return null
    const net = await this.ipfs.swarm.peers()
    let db = []
    if (this.db) db = await this.ipfs.pubsub.peers(this.db.id)
    return { net, db }
  }

  generateAddress (): string {
    const path = uuidv4().replace(/-/g, '')
    return `/orbitdb/${this.orbitdb?.id}/${path}`
  }
}
