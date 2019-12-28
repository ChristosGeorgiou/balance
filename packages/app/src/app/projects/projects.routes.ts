import { ShellComponent } from './@shell/shell.component'
import { IssueComponent } from './issue/issue.component'
import { OverviewComponent } from './overview/overview.component'
import { ProjectComponent } from './project/project.component'
import { SettingsComponent } from './settings/settings.component'

export const ProjectsRoutes = [{
  path: '',
  component: ShellComponent,
  children: [
    { path: '', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'overview', component: OverviewComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'project/:pid', component: ProjectComponent },
    { path: 'project/:pid/issue/:iid', component: IssueComponent }
  ]
}]
