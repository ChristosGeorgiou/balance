import { Component, OnDestroy, OnInit } from '@angular/core'
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterEvent } from '@angular/router'
import { ConfigService, CouchDBIntegration, CouchDBService, DEFAULT_USER, Integration, IntegrationsRepo, OrbitDBService, UpdateService, User, UsersRepo } from '@balnc/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { Subject, Subscription } from 'rxjs'
import { map, takeUntil } from 'rxjs/operators'
import { Helpers } from '../../@shared/helpers'
import { LoginComponent } from '../../main/login/login.component'

@Component({
  selector: 'app-main-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class MainShellComponent implements OnInit, OnDestroy {

  username: string

  networkStatus = navigator.onLine
  databaseStatus = false
  isOnline = false

  pageLoading = false
  routeLabel = null

  plugins: Plugin[] = []

  menu: any[] = []
  update$: Subscription
  notifier = new Subject()
  updateShown: any

  get layout() {
    switch (this.configService.user?.config?.layout) {
      case 'box': return 'container'
      case 'fluid': return 'container-fluid'
      default: return 'container'
    }
  }

  get offline() {
    return !navigator.onLine
  }

  constructor(
    private router: Router,
    private configService: ConfigService,
    private toastr: ToastrService,
    private update: UpdateService,
    private couchDBService: CouchDBService,
    private orbitDBService: OrbitDBService,
    private usersRepo: UsersRepo,
    private integrationsRepo: IntegrationsRepo,
    private modal: NgbModal
  ) {
  }

  ngOnInit() {

    this.router.events
      .pipe(takeUntil(this.notifier))
      .subscribe((event: RouterEvent) => {
        this.navigationInterceptor(event)
      })

    this.update.status$
      .pipe(takeUntil(this.notifier))
      .subscribe((status) => {
        if (status && !this.updateShown) {
          const toastrOptions = {
            disableTimeOut: true
          }
          this.toastr.info(
            'There is a new version of balnc. Please refresh to update.', 'Update', toastrOptions)
          this.updateShown = true
        }
      })

    this.usersRepo.allm$()
      .pipe(takeUntil(this.notifier))
      .subscribe(async (users: User[]) => {
        await this.setUsers(users)
        if (!this.configService.user) {
          const defaultUser = await this.usersRepo.add({ ...DEFAULT_USER, ...{ username: 'default' } })
          this.configService.userId = defaultUser._id
        }
      })

    this.integrationsRepo.allm$()
      .pipe(takeUntil(this.notifier))
      .subscribe(async (integrations: Integration[]) => {
        integrations.sort((a, b) => a._date - b._date)
        this.configService.integrations = integrations.reduce((l, i) => {
          l[i._group] = i
          return l
        }, {})
      })

    this.integrationsRepo.allm$({ group: 'coucdb' })
      .pipe(takeUntil(this.notifier))
      .pipe(map((integration) => integration[0]))
      .subscribe(async (integration: CouchDBIntegration) => {
        this.couchDBService.disable()

        if (!integration?.enabled) {
          return
        }

        const needAuth = await this.couchDBService.needAuth()
        if (!needAuth) {
          this.couchDBService.enable()
          return
        }

        const login = this.modal.open(LoginComponent, { size: 'sm', centered: true })
        const { username, password } = await login.result

        const auth = await this.couchDBService.authenticate(username, password)

        if (!auth) {
          this.toastr.error('Could not auto-login with db server. Check your internet connection.', '[Database] Load Failed')
          await this.integrationsRepo.update(integration._id, { sync: false })
          return
        }

        this.toastr.success('Login to remote database. Data will sync...')
        this.couchDBService.enable()
      })

    // this.integrationsRepo.allm$({ group: 'orbitdb' })
    //   .pipe(map((integration: Integration[]) => integration[0]))
    //   .subscribe(async (integration: OrbitDBIntegration) => {
    //     await this.orbitDBService.stop()
    //     if (!integration?.enabled) {
    //       return
    //     }
    //     await this.orbitDBService.setup()
    //     if (integration?.address) {
    //       await this.orbitDBService.start()
    //     }
    //   })
  }

  ngOnDestroy() {
    this.notifier.next()
    this.notifier.complete()
  }

  private async setUsers(users: User[]) {
    const promises = users.map(async (user) => {
      const res = {
        id: user._id,
        avatar: null
      }
      const attachment = await this.usersRepo.getAttachment(user._id, 'avatar')
      if (attachment) {
        const blob = await attachment.getData()
        res.avatar = await Helpers.getImage(blob, attachment.type)
      }
      return res
    })
    const avatars = await Promise.all(promises)
    this.configService.userAvatars = avatars.reduce((l, i) => {
      l[i.id] = i.avatar
      return l
    }, {})
    this.configService.users = users
  }

  private navigationInterceptor(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.pageLoading = true
      this.routeLabel = event.url
    }
    if (event instanceof NavigationEnd) {
      this.hideSpinner()
    }
    if (event instanceof NavigationCancel) {
      this.hideSpinner()
    }
    if (event instanceof NavigationError) {
      this.hideSpinner()
      this.toastr.error('Could not load module. Check your internet connection', 'Load Failed')
    }
  }

  private hideSpinner(): void {
    this.pageLoading = false
  }
}
