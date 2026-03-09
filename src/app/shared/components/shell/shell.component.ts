// src/app/shared/components/shell/shell.component.ts
import { Component, inject, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()">
        <div class="sidenav-inner">
          <div>
            <div class="sidenav-header">
              <mat-icon class="logo-icon">sports_tennis</mat-icon>
              <span class="logo-text">TT Tournament</span>
            </div>
            <mat-divider />
            <mat-nav-list>
              <a mat-list-item routerLink="/events" routerLinkActive="active-link" (click)="closeOnMobile()">
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>Events</span>
              </a>
              @if (auth.isLoggedIn()) {
                <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link" (click)="closeOnMobile()">
                  <mat-icon matListItemIcon>dashboard</mat-icon>
                  <span matListItemTitle>Dashboard</span>
                </a>
                @if (auth.isAdmin()) {
                  <mat-divider />
                  <a mat-list-item routerLink="/admin" routerLinkActive="active-link" (click)="closeOnMobile()">
                    <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
                    <span matListItemTitle>Admin</span>
                  </a>
                }
              }
            </mat-nav-list>
          </div>
          <div class="sidenav-footer">
            <mat-divider />
            @if (auth.isLoggedIn()) {
              <div class="user-info">
                <mat-icon>account_circle</mat-icon>
                <div class="user-details">
                  <span class="user-name">{{ auth.profile()?.full_name }}</span>
                  <span class="user-role">{{ auth.profile()?.role | titlecase }}</span>
                </div>
              </div>
              <button mat-button color="warn" (click)="auth.signOut()" class="sign-out-btn">
                <mat-icon>logout</mat-icon> Sign Out
              </button>
            } @else {
              <a mat-button routerLink="/auth/login" class="sign-in-btn" (click)="closeOnMobile()">
                <mat-icon>login</mat-icon> Sign In
              </a>
            }
          </div>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar color="primary">
          @if (isMobile()) {
            <button mat-icon-button (click)="sidenav.toggle()" class="menu-btn">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="toolbar-title">{{ isMobile() ? 'TT Tournament' : 'Table Tennis Tournament Platform' }}</span>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100vh; }
    .sidenav-inner { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
    .sidenav-header { display: flex; align-items: center; gap: 8px; padding: 16px; }
    .logo-icon { color: #1976d2; font-size: 28px; }
    .logo-text { font-size: 16px; font-weight: 600; }
    .active-link { background: rgba(25, 118, 210, 0.1); border-radius: 4px; color: #1976d2; }
    .sidenav-footer { padding: 8px; }
    .user-info { display: flex; align-items: center; gap: 8px; padding: 8px; }
    .user-details { display: flex; flex-direction: column; }
    .user-name { font-size: 14px; font-weight: 500; }
    .user-role { font-size: 11px; color: #666; }
    .sign-out-btn { width: 100%; margin-top: 4px; }
    .sign-in-btn { width: 100%; margin-top: 4px; }
    .menu-btn { margin-right: 4px; }
    .toolbar-title { font-size: 16px; }
    mat-toolbar { position: sticky; top: 0; z-index: 100; }
    .content { padding: 24px; }

    @media (max-width: 600px) {
      .content { padding: 12px; }
    }
  `],
})
export class ShellComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  auth = inject(AuthService);
  private breakpointObserver = inject(BreakpointObserver);

  isMobile = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(r => r.matches)),
    { initialValue: false }
  );

  closeOnMobile() {
    if (this.isMobile()) {
      this.sidenav.close();
    }
  }
}
