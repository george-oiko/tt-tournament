// src/app/features/events/event-detail/event-detail.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { EventsService } from '../events.service';
import { GroupsService } from '../../groups/groups.service';
import { PlayersService } from '../../players/players.service';
import { MatchesService } from '../../matches/matches.service';
import { TournamentEvent } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';
import { EventTypeLabelPipe } from '../../../shared/pipes/event-type-label.pipe';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive, RouterOutlet,
    MatTabsModule, MatButtonModule, MatIconModule, MatChipsModule, MatMenuModule, MatSnackBarModule,
    EventTypeLabelPipe,
  ],
  template: `
    @if (event()) {
      <div class="event-detail">
        <div class="event-header">
          <button mat-icon-button routerLink="/events"><mat-icon>arrow_back</mat-icon></button>
          <div class="event-title">
            <h1>{{ event()!.name }}</h1>
            <div class="event-meta">
              <mat-chip class="type-chip">{{ event()!.type | eventTypeLabel }}</mat-chip>
              <mat-chip [class]="'status-' + event()!.status">{{ event()!.status | titlecase }}</mat-chip>
            </div>
          </div>
          <div class="event-actions">
            @if (canEdit()) {
              <button mat-raised-button color="primary" [matMenuTriggerFor]="actionsMenu">
                <mat-icon>more_vert</mat-icon> Actions
              </button>
              <mat-menu #actionsMenu>
                <a mat-menu-item [routerLink]="['/events', event()!.id, 'edit']">
                  <mat-icon>edit</mat-icon> Edit Event
                </a>
                @if (event()!.status === 'draft') {
                  <button mat-menu-item (click)="generateGroups()">
                    <mat-icon>group_work</mat-icon> Generate Groups & Draw
                  </button>
                  <button mat-menu-item (click)="activateEvent()">
                    <mat-icon>play_circle</mat-icon> Activate Event
                  </button>
                }
                @if (event()!.type !== 'groups' && event()!.status === 'active') {
                  <button mat-menu-item (click)="generateKnockout()">
                    <mat-icon>account_tree</mat-icon> Generate Knockout Bracket
                  </button>
                }
                @if (event()!.type === 'groups_knockout' && event()!.has_consolation && event()!.status === 'active') {
                  <button mat-menu-item (click)="generateConsolation()">
                    <mat-icon>device_hub</mat-icon> Generate Consolation Bracket
                  </button>
                }
                @if (event()!.status === 'active') {
                  <button mat-menu-item (click)="completeEvent()">
                    <mat-icon>emoji_events</mat-icon> Complete Event
                  </button>
                }
              </mat-menu>
            }
          </div>
        </div>

        <nav mat-tab-nav-bar [tabPanel]="tabPanel" >
          @if (showGroups()) {
            <a mat-tab-link routerLink="groups" routerLinkActive #rla2="routerLinkActive" [active]="rla2.isActive">
              <mat-icon>group_work</mat-icon> Groups
            </a>
          }
          @if (showBracket()) {
            <a mat-tab-link routerLink="bracket" routerLinkActive #rla3="routerLinkActive" [active]="rla3.isActive">
              <mat-icon>account_tree</mat-icon> Knockout
            </a>
          }
          @if (event()!.has_consolation) {
            <a mat-tab-link routerLink="consolation" routerLinkActive #rla5="routerLinkActive" [active]="rla5.isActive">
              <mat-icon>device_hub</mat-icon> Consolation
            </a>
          }
<a mat-tab-link routerLink="players" routerLinkActive #rla1="routerLinkActive" [active]="rla1.isActive">
            <mat-icon>people</mat-icon> Players
          </a>
          
          <!-- <a mat-tab-link routerLink="matches" routerLinkActive #rla4="routerLinkActive" [active]="rla4.isActive">
            <mat-icon>sports_tennis</mat-icon> Matches
          </a> -->
        </nav>
        <mat-tab-nav-panel #tabPanel>
          <div class="tab-content">
            <router-outlet />
          </div>
        </mat-tab-nav-panel>
      </div>
    } @else {
      <p>Loading event...</p>
    }
  `,
  styles: [`
    .event-detail { max-width: 1100px; }
    .event-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
    .event-title { flex: 1; min-width: 0; }
    .event-title h1 { margin: 0 0 8px; word-break: break-word; }
    .event-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .event-actions { margin-top: 8px; flex-shrink: 0; }
    .status-active { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-draft { background: #fff3e0 !important; color: #e65100 !important; }
    .status-completed { background: #e3f2fd !important; color: #1565c0 !important; }
    .tab-content { padding-top: 16px; }
    mat-icon { margin-right: 6px; vertical-align: middle; font-size: 18px; height: 18px; width: 18px; }

    @media (max-width: 600px) {
      .event-title h1 { font-size: 18px; }
      .event-header { gap: 8px; margin-bottom: 16px; }
    }

  `],
})
export class EventDetailComponent implements OnInit {
  @Input() id!: string;

  private eventsService = inject(EventsService);
  private groupsService = inject(GroupsService);
  private playersService = inject(PlayersService);
  private matchesService = inject(MatchesService);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  event = signal<TournamentEvent | null>(null);

  async ngOnInit() {
    await this.loadEvent();
    if (!this.route.firstChild) {
      await this.navigateToDefaultTab();
    }
  }

  async navigateToDefaultTab() {
    const event = this.event()!;
    if (event.status === 'draft') {
      this.router.navigate(['players'], { relativeTo: this.route });
      return;
    }
    const type = event.type;
    if (type === 'groups') {
      this.router.navigate(['groups'], { relativeTo: this.route });
      return;
    }
    if (type === 'knockout') {
      this.router.navigate(['bracket'], { relativeTo: this.route });
      return;
    }
    // groups_knockout: go to bracket if knockout is generated, otherwise groups
    const knockoutMatches = await this.matchesService.getKnockoutByEvent(this.id);
    this.router.navigate([knockoutMatches.length > 0 ? 'bracket' : 'groups'], { relativeTo: this.route });
  }

  async loadEvent() {
    this.event.set(await this.eventsService.getById(this.id));
  }

  canEdit() {
    return this.auth.isAdmin() || this.auth.isEventManager();
  }

  showGroups() {
    return ['groups', 'groups_knockout'].includes(this.event()?.type ?? '');
  }

  showBracket() {
    return ['knockout', 'groups_knockout'].includes(this.event()?.type ?? '');
  }

  async generateGroups() {
    try {
      const players = await this.playersService.getByEvent(this.id);
      if (players.length < 3) {
        this.snackBar.open('Add at least 3 players before generating groups.', 'OK', { duration: 3000 });
        return;
      }
      await this.groupsService.generateGroups(this.event()!, players);
      this.snackBar.open('Groups generated with snake seeding!', 'OK', { duration: 3000 });
      this.router.navigate(['/events', this.id, 'groups']);
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 4000 });
    }
  }

  async activateEvent() {
    try {
      await this.eventsService.updateStatus(this.id, 'active');
      await this.loadEvent();
      this.snackBar.open('Event is now active!', 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 4000 });
    }
  }

  async generateKnockout() {
    if (!confirm('Generate (or regenerate) the knockout bracket? This will overwrite any existing knockout matches.')) return;
    try {
      const [standings, allMatches] = await Promise.all([
        this.groupsService.getStandings(this.id),
        this.matchesService.getByEvent(this.id),
      ]);
      const groupMatches = allMatches.filter(m => m.stage === 'group');
      const sorted = this.groupsService.sortStandingsWithTiebreak(standings, groupMatches);
      const event = this.event()!;
      // Build advancing players tier-by-tier so bracket seeding works correctly:
      // all 1st places first, then all 2nd places, etc.
      // This makes seed 1 (best 1st place) face seed N (worst 2nd place) in R1.
      const groupIds = [...new Set(sorted.map(s => s.group_id))];
      const advancingPlayers: { id: string; group_id: string }[] = [];
      for (let pos = 0; pos < event.groups_advance; pos++) {
        for (const gid of groupIds) {
          const s = sorted.filter(x => x.group_id === gid)[pos];
          if (s) advancingPlayers.push({ id: s.player_id, group_id: gid });
        }
      }
      await this.matchesService.generateKnockoutBracket(this.id, advancingPlayers);
      this.snackBar.open('Knockout bracket generated!', 'OK', { duration: 3000 });
      this.router.navigate(['/events', this.id, 'bracket']);
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 4000 });
    }
  }

  async completeEvent() {
    if (!confirm('Mark this event as completed? This cannot be undone.')) return;
    try {
      await this.eventsService.updateStatus(this.id, 'completed');
      await this.loadEvent();
      this.snackBar.open('Event marked as completed!', 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 4000 });
    }
  }

  async generateConsolation() {
    if (!confirm('Generate (or regenerate) the consolation bracket? This will overwrite any existing consolation matches.')) return;
    try {
      const [standings, allMatches] = await Promise.all([
        this.groupsService.getStandings(this.id),
        this.matchesService.getByEvent(this.id),
      ]);
      const groupMatches = allMatches.filter(m => m.stage === 'group');
      const sorted = this.groupsService.sortStandingsWithTiebreak(standings, groupMatches);
      const event = this.event()!;

      // Identify qualifying player IDs (top N per group)
      const groupIds = [...new Set(sorted.map(s => s.group_id))];
      const qualifyingIds = new Set<string>();
      for (const gid of groupIds) {
        sorted.filter(s => s.group_id === gid)
          .slice(0, event.groups_advance)
          .forEach(s => qualifyingIds.add(s.player_id));
      }

      // Build consolation players tier-by-tier (3rd places, then 4th places, etc.)
      // so seed 1 (best 3rd place) faces seed N (worst non-qualifier) in R1.
      const nonQualsByGroup = new Map<string, { id: string; group_id: string }[]>();
      for (const gid of groupIds) {
        nonQualsByGroup.set(
          gid,
          sorted.filter(s => s.group_id === gid && !qualifyingIds.has(s.player_id))
                .map(s => ({ id: s.player_id, group_id: gid }))
        );
      }
      const maxTiers = Math.max(...Array.from(nonQualsByGroup.values()).map(a => a.length));
      const consolationPlayers: { id: string; group_id: string }[] = [];
      for (let tier = 0; tier < maxTiers; tier++) {
        for (const gid of groupIds) {
          const p = nonQualsByGroup.get(gid)?.[tier];
          if (p) consolationPlayers.push(p);
        }
      }

      if (consolationPlayers.length < 2) {
        this.snackBar.open('Not enough non-qualifying players for a consolation bracket.', 'OK', { duration: 3000 });
        return;
      }

      await this.matchesService.generateConsolationBracket(this.id, consolationPlayers);
      this.snackBar.open('Consolation bracket generated!', 'OK', { duration: 3000 });
      this.router.navigate(['/events', this.id, 'consolation']);
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 4000 });
    }
  }
}
