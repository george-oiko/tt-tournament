// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, eventManagerGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'events',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/events/event-list/event-list.component').then(m => m.EventListComponent),
          },
          {
            path: 'new',
            canActivate: [eventManagerGuard],
            loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/events/event-detail/event-detail.component').then(m => m.EventDetailComponent),
            children: [
              { path: 'players', loadComponent: () => import('./features/players/player-list/player-list.component').then(m => m.PlayerListComponent) },
              { path: 'groups', loadComponent: () => import('./features/groups/group-view/group-view.component').then(m => m.GroupViewComponent) },
              { path: 'bracket', loadComponent: () => import('./features/bracket/bracket-view/bracket-view.component').then(m => m.BracketViewComponent) },
              // { path: 'matches', loadComponent: () => import('./features/matches/match-list/match-list.component').then(m => m.MatchListComponent) },
              { path: '', redirectTo: 'players', pathMatch: 'full' },
            ],
          },
          {
            path: ':id/edit',
            canActivate: [eventManagerGuard],
            loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent),
          },
        ],
      },
      {
        path: 'matches/:id',
        loadComponent: () => import('./features/matches/match-detail/match-detail.component').then(m => m.MatchDetailComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
      },
      { path: '', redirectTo: 'events', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/events' },
];
