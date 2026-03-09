// src/app/features/events/event-list/event-list.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { EventsService } from '../events.service';
import { TournamentEvent } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatTabsModule],
  template: `
    <div class="event-list">
      <div class="list-header">
        <h1>Events</h1>
        @if (auth.isAdmin() || auth.isEventManager()) {
          <a mat-raised-button color="primary" routerLink="/events/new">
            <mat-icon>add</mat-icon> New Event
          </a>
        }
      </div>

      <mat-tab-group>
        <mat-tab label="Active">
          <div class="tab-content">
            <ng-container *ngTemplateOutlet="eventGrid; context: { events: activeEvents() }"></ng-container>
          </div>
        </mat-tab>
        <mat-tab label="History">
          <div class="tab-content">
            <ng-container *ngTemplateOutlet="eventGrid; context: { events: completedEvents() }"></ng-container>
          </div>
        </mat-tab>
      </mat-tab-group>

      <ng-template #eventGrid let-events="events">
        @if (events.length === 0) {
          <mat-card>
            <mat-card-content class="empty">
              <mat-icon>event_busy</mat-icon>
              <p>No events found.</p>
            </mat-card-content>
          </mat-card>
        } @else {
          <div class="events-grid">
            @for (event of events; track event.id) {
              <mat-card class="event-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>{{ typeIcon(event.type) }}</mat-icon>
                  <mat-card-title>{{ event.name }}</mat-card-title>
                  <mat-card-subtitle>{{ event.type | titlecase }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  @if (event.description) {
                    <p class="description">{{ event.description }}</p>
                  }
                  <div class="chips">
                    <mat-chip [class]="'status-' + event.status">{{ event.status | titlecase }}</mat-chip>
                    <mat-chip>Best of {{ event.sets_to_win }}</mat-chip>
                    @if (event.type !== 'knockout') {
                      <mat-chip>{{ event.group_size }} per group</mat-chip>
                    }
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <a mat-button color="primary" [routerLink]="['/events', event.id]">Open</a>
                  @if (auth.isAdmin()) {
                    <a mat-button [routerLink]="['/events', event.id, 'edit']">Edit</a>
                  }
                </mat-card-actions>
              </mat-card>
            }
          </div>
        }
      </ng-template>
    </div>
  `,
  styles: [`
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .list-header h1 { margin: 0; }
    .tab-content { padding-top: 16px; }
    .events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .event-card { cursor: default; }
    .description { color: #666; font-size: 14px; margin-bottom: 12px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .status-active { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-draft { background: #fff3e0 !important; color: #e65100 !important; }
    .status-completed { background: #e3f2fd !important; color: #1565c0 !important; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
  `],
})
export class EventListComponent implements OnInit {
  auth = inject(AuthService);
  private eventsService = inject(EventsService);

  allEvents = signal<TournamentEvent[]>([]);
  activeEvents = computed(() => this.allEvents().filter(e => e.status !== 'completed'));
  completedEvents = computed(() => this.allEvents().filter(e => e.status === 'completed'));

  async ngOnInit() {
    this.allEvents.set(await this.eventsService.getAll());
  }

  typeIcon(type: string) {
    return { groups: 'group_work', knockout: 'account_tree', groups_knockout: 'device_hub' }[type] ?? 'event';
  }
}
