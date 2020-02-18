import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { EnvBuild } from '@balnc/shared'
import { interval, Observable } from 'rxjs'
import { catchError, map, switchMap } from 'rxjs/operators'
import { environment } from 'src/environments/environment'

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  url = '/assets/build.json'
  interval = 20000

  status$: Observable<boolean>

  constructor (
    private http: HttpClient
  ) {
    this.status$ = interval(5000).pipe(
      switchMap(() => {
        return this.http.get<EnvBuild>(this.url).pipe(
          catchError(() => null)
        )
      }),
      map((build: EnvBuild) => {
        if (!build) return false
        return environment.build.timestamp < build.timestamp
      })
    )
  }

}
