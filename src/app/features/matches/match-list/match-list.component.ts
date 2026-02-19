// src/app/features/matches/match-list/match-list.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchesService } from '../matches.service';
import { Match } from '../../../core/models';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule],
  template: `
    <div class="match-list">
      @if (pending().length) {
        <h3>Pending ({{ pending().length }})</h3>
        @for (match of pending(); track match.id) {
          <mat-card class="match-card" [routerLink]="['/matches', match.id]">
            <mat-card-content>
              <div class="match-row">
                <span class="player">{{ match.player1?.name ?? 'TBD' }}</span>
                <mat-chip class="vs-chip">VS</mat-chip>
                <span class="player right">{{ match.player2?.name ?? 'TBD' }}</span>
                <mat-icon class="arrow">chevron_right</mat-icon>
              </div>
              <div class="match-meta">
                <mat-chip class="stage-chip">{{ match.stage | titlecase }}</mat-chip>
                @if (match.stage === 'group') {
                  <span class="meta-text">Group match</span>
                } @else {
                  <span class="meta-text">Round {{ match.round }}</span>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      }

      @if (inProgress().length) {
        <h3>In Progress ({{ inProgress().length }})</h3>
        @for (match of inProgress(); track match.id) {
          <mat-card class="match-card in-progress" [routerLink]="['/matches', match.id]">
            <mat-card-content>
              <div class="match-row">
                <span class="player" [class.leading]="setsWon(match, 'p1') > setsWon(match, 'p2')">{{ match.player1?.name ?? 'TBD' }}</span>
                <span class="live-score">{{ setsWon(match, 'p1') }} – {{ setsWon(match, 'p2') }}</span>
                <span class="player right" [class.leading]="setsWon(match, 'p2') > setsWon(match, 'p1')">{{ match.player2?.name ?? 'TBD' }}</span>
                <mat-icon class="arrow">chevron_right</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        }
      }

      @if (completed().length) {
        <h3>Completed ({{ completed().length }})</h3>
        @for (match of completed(); track match.id) {
          <mat-card class="match-card completed" [routerLink]="['/matches', match.id]">
            <mat-card-content>
              <div class="match-row">
                <span class="player" [class.winner]="match.winner_id === match.player1_id" [class.loser]="match.winner_id !== match.player1_id">
                  {{ match.player1?.name ?? 'TBD' }}
                </span>
                <span class="final-score">{{ setsWon(match, 'p1') }} – {{ setsWon(match, 'p2') }}</span>
                <span class="player right" [class.winner]="match.winner_id === match.player2_id" [class.loser]="match.winner_id !== match.player2_id">
                  {{ match.player2?.name ?? 'TBD' }}
                </span>
                <mat-icon class="done-icon">check_circle</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        }
      }

      @if (matches().length === 0) {
        <mat-card>
          <mat-card-content class="empty">
            <mat-icon>sports_tennis</mat-icon>
            <p>No matches yet. Generate groups or a bracket to create matches.</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    h3 { color: #1976d2; margin: 24px 0 8px; }
    .match-card { margin-bottom: 8px; cursor: pointer; transition: box-shadow 0.15s; }
    .match-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .match-card.in-progress { border-left: 4px solid #2196f3; }
    .match-card.completed { border-left: 4px solid #4caf50; }
    .match-row { display: flex; align-items: center; gap: 12px; }
    .player { flex: 1; font-size: 15px; }
    .player.right { text-align: right; }
    .player.winner { font-weight: 700; color: #2e7d32; }
    .player.loser { color: #999; }
    .player.leading { font-weight: 700; color: #1976d2; }
    .vs-chip { background: #e3f2fd !important; font-size: 11px !important; min-height: 24px !important; }
    .live-score, .final-score { font-weight: 700; font-size: 16px; padding: 0 8px; }
    .match-meta { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
    .stage-chip { font-size: 11px !important; min-height: 20px !important; }
    .meta-text { font-size: 12px; color: #888; }
    .arrow { color: #ccc; }
    .done-icon { color: #4caf50; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
  `],
})
export class MatchListComponent implements OnInit {
  @Input() id!: string;

  private matchesService = inject(MatchesService);
  matches = signal<Match[]>([]);
  pending = signal<Match[]>([]);
  inProgress = signal<Match[]>([]);
  completed = signal<Match[]>([]);

  async ngOnInit() {
    const all = await this.matchesService.getByEvent(this.id);
    this.matches.set(all);
    this.pending.set(all.filter(m => m.status === 'pending'));
    this.inProgress.set(all.filter(m => m.status === 'in_progress'));
    this.completed.set(all.filter(m => m.status === 'completed'));
  }

  setsWon(match: Match, player: 'p1' | 'p2'): number {
    return (match.sets ?? []).filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }
}
