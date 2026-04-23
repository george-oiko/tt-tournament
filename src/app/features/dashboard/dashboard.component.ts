// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { EventsService } from '../events/events.service';
import { TournamentEvent } from '../../core/models';
import { EventTypeLabelPipe } from '../../shared/pipes/event-type-label.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, EventTypeLabelPipe],
  template: `
    <div class="dashboard">
      <div class="welcome">
        <h1>Welcome, {{ auth.profile()?.full_name }} 👋</h1>
        <p class="subtitle">{{ auth.isAdmin() ? 'Administrator' : auth.isEventManager() ? 'Event Manager' : 'Viewer' }}</p>
      </div>

      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon" color="primary">event</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ events().length }}</span>
              <span class="stat-label">Total Events</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon" style="color: #4caf50">play_circle</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ activeEvents().length }}</span>
              <span class="stat-label">Active Events</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon" style="color: #ff9800">pending</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ draftEvents().length }}</span>
              <span class="stat-label">Drafts</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="section-header">
        <h2>Recent Events</h2>
        @if (auth.isAdmin() || auth.isEventManager()) {
          <a mat-raised-button color="primary" routerLink="/events/new">
            <mat-icon>add</mat-icon> New Event
          </a>
        }
      </div>

      @if (loading()) {
        <p>Loading events...</p>
      } @else if (events().length === 0) {
        <mat-card class="empty-card">
          <mat-card-content>
            <mat-icon class="empty-icon">event_busy</mat-icon>
            <p>No events yet.</p>
            @if (auth.isAdmin() || auth.isEventManager()) {
              <a mat-raised-button color="primary" routerLink="/events/new">Create Event</a>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="events-grid">
          @for (event of events(); track event.id) {
            <mat-card class="event-card" [routerLink]="['/events', event.id]">
              <mat-card-header>
                <mat-icon mat-card-avatar>{{ typeIcon(event.type) }}</mat-icon>
                <mat-card-title>{{ event.name }}</mat-card-title>
                <mat-card-subtitle>{{ event.type | eventTypeLabel }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <mat-chip [class]="'status-' + event.status">{{ event.status | titlecase }}</mat-chip>
              </mat-card-content>
              <mat-card-actions>
                <a mat-button color="primary" [routerLink]="['/events', event.id]">Open</a>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; }
    .welcome h1 { margin: 0; font-size: 28px; }
    .subtitle { color: #666; margin-top: 4px; }
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card mat-card-content { display: flex; align-items: center; gap: 16px; padding: 20px !important; }
    .stat-icon { font-size: 40px; width: 40px; height: 40px; }
    .stat-value { font-size: 32px; font-weight: 700; display: block; }
    .stat-label { color: #666; font-size: 13px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h2 { margin: 0; }
    .events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .event-card { cursor: pointer; transition: box-shadow 0.2s; }
    .event-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .empty-card mat-card-content { text-align: center; padding: 48px !important; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; color: #ccc; }
    .status-active { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-draft { background: #fff3e0 !important; color: #e65100 !important; }
    .status-completed { background: #e3f2fd !important; color: #1565c0 !important; }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private eventsService = inject(EventsService);

  events = signal<TournamentEvent[]>([]);
  loading = signal(true);

  activeEvents = signal<TournamentEvent[]>([]);
  draftEvents = signal<TournamentEvent[]>([]);

  async ngOnInit() {
    try {
      const all = await this.eventsService.getAll();
      this.events.set(all.slice(0, 6)); // Show recent 6
      this.activeEvents.set(all.filter(e => e.status === 'active'));
      this.draftEvents.set(all.filter(e => e.status === 'draft'));
    } finally {
      this.loading.set(false);
    }
  }

  typeIcon(type: string) {
    return { groups: 'group_work', knockout: 'account_tree', groups_knockout: 'device_hub' }[type] ?? 'event';
  }
}
