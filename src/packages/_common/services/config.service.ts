import { Injectable } from '@angular/core'
import { LocalStorage } from 'ngx-store'

import { environment } from 'environments/environment'

import { HelperService } from './helper.service'
import { Package } from '../models/package'
import { Profile } from '../models/profile'
import { ReadFile } from 'ngx-file-helpers'

@Injectable()
export class ConfigService {

  public DEMO_PROFILE = {
    name: HelperService.generateName(),
    remoteHost: 'https://balncdb.cgeo.host',
    remoteUsername: 'demo',
    remotePassword: 'demo',
    remoteSync: false,
    packages: {
      '@balnc/business': true,
      '@balnc/projects': true,
      '@balnc/boards': true,
      '@balnc/presentations': true,
      '@balnc/analytics': true,
      '@balnc/reports': true
    }
  }

  public version: string = environment.version
  public config: any = environment
  public packages: Package[] = environment.packages

  @LocalStorage() sidebarClosed: boolean = false

  @LocalStorage() roles: string[] = []

  @LocalStorage() selected: string = ''
  @LocalStorage() profiles: Profile[] = []

  public profile: Profile

  constructor () {
    console.log('[ConfigService]', 'Initializing with env:', environment)
    console.log('[ConfigService]', 'Profiles available:', this.profiles)

    if (this.selected) {
      this.profile = this.profiles.find(p => p.id === this.selected)
      console.log('[ConfigService]', `Profile ${this.selected} loaded`)
    }
  }

  getPackageConfig (id: string) {
    return this.profile.packages[id]
  }

  clearAllProfiles () {
    this.selected = null
    this.profiles = []
    window.location.reload()
  }

  selectProfile (alias: string) {
    this.selected = alias
    window.location.reload()
  }

  saveProfile (profile: Profile): string {
    const unique = new Date()
    profile.id = profile.id || `${unique.getTime()}`
    profile.createdAt = profile.createdAt || unique.toISOString()
    let profiles = [...this.profiles]
    let index = this.profiles.findIndex(p => p.id === profile.id)
    if (index !== -1) {
      profiles.splice(index, 1)
    }
    profiles.push(profile)
    this.profiles = profiles
    return profile.id
  }

  getProfile (alias: string = null): Profile {
    alias = alias || this.selected
    alias = alias || this.profiles[0].id
    let index = this.profiles.findIndex(p => p.id === alias)
    return this.profiles[index]
  }

  deleteProfile (alias: string) {
    let profiles = [...this.profiles]
    let index = this.profiles.findIndex(p => p.id === alias)
    profiles.splice(index, 1)
    this.profiles = profiles
  }

  importFile (file: ReadFile) {
    try {
      const data = file.content.split(',')[1]
      const profileStr = atob(data)
      const profile: Profile = JSON.parse(profileStr)
      return profile
    } catch (error) {
      console.log('[ProfileComponent]', 'Error' + error)
      return -1
    }
  }

}
