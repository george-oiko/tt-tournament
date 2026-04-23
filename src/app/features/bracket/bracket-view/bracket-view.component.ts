// src/app/features/bracket/bracket-view/bracket-view.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchesService } from '../../matches/matches.service';
import { Match } from '../../../core/models';

@Component({
  selector: 'app-bracket-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="bracket-view">
      @if (rounds().length === 0) {
        <mat-card>
          <mat-card-content class="empty">
            <mat-icon>account_tree</mat-icon>
            <p>Knockout bracket not generated yet.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="bracket-wrapper" id="printable-bracket">
          <div class="bracket">
            @for (round of rounds(); track round.round; let ri = $index) {
              <div class="round">
                <div class="round-label">{{ roundLabel(round.round, rounds().length) }}</div>
                <div class="matches">
                  @for (match of round.matches; track match.id) {
                    <div class="match-slot" [style.height]="slotHeight(ri)">
                      <div class="bracket-match" [class.completed]="match.status === 'completed'" [routerLink]="['/matches', match.id]">
                        <div class="bracket-player" [class.winner]="match.winner_id === match.player1_id" [class.loser]="match.winner_id && match.winner_id !== match.player1_id">
                          <span class="seed">{{ match.player1?.seed_position ?? '—' }}</span>
                          <span class="name">{{ match.player1?.name ?? 'TBD' }}</span>
                          <span class="sets">{{ setsWon(match, 'p1') }}</span>
                        </div>
                        <div class="bracket-divider"></div>
                        <div class="bracket-player" [class.winner]="match.winner_id === match.player2_id" [class.loser]="match.winner_id && match.winner_id !== match.player2_id">
                          <span class="seed">{{ match.player2?.seed_position ?? '—' }}</span>
                          <span class="name">{{ match.player2?.name ?? 'TBD' }}</span>
                          <span class="sets">{{ setsWon(match, 'p2') }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        @if (plateRounds().length > 0) {
          <div class="plate-divider">
            <mat-icon>account_tree</mat-icon> Knockout B
          </div>
          <div class="bracket-wrapper">
            <div class="bracket">
              @for (round of plateRounds(); track round.round; let ri = $index) {
                <div class="round">
                  <div class="round-label plate-label">{{ roundLabel(round.round, plateRounds().length) }}</div>
                  <div class="matches">
                    @for (match of round.matches; track match.id) {
                      <div class="match-slot" [style.height]="slotHeight(ri)">
                        <div class="bracket-match plate-match" [class.completed]="match.status === 'completed'" [routerLink]="['/matches', match.id]">
                          <div class="bracket-player" [class.winner]="match.winner_id === match.player1_id" [class.loser]="match.winner_id && match.winner_id !== match.player1_id">
                            <span class="seed plate-seed">{{ match.player1?.seed_position ?? '—' }}</span>
                            <span class="name">{{ match.player1?.name ?? 'TBD' }}</span>
                            <span class="sets">{{ setsWon(match, 'p1') }}</span>
                          </div>
                          <div class="bracket-divider"></div>
                          <div class="bracket-player" [class.winner]="match.winner_id === match.player2_id" [class.loser]="match.winner_id && match.winner_id !== match.player2_id">
                            <span class="seed plate-seed">{{ match.player2?.seed_position ?? '—' }}</span>
                            <span class="name">{{ match.player2?.name ?? 'TBD' }}</span>
                            <span class="sets">{{ setsWon(match, 'p2') }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="print-btn">
          <button mat-stroked-button (click)="print()">
            <mat-icon>print</mat-icon> Print Bracket
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .bracket-view { overflow-x: auto; }
    .bracket-wrapper { padding: 16px 0; }
    .bracket { display: flex; gap: 0; align-items: flex-start; }
    .round { display: flex; flex-direction: column; align-items: center; min-width: 200px; }
    .round-label { font-weight: 700; color: #1976d2; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .plate-label { color: #f57c00; }
    .matches { display: flex; flex-direction: column; width: 100%; padding: 0 8px; }
    .match-slot { display: flex; align-items: center; width: 100%; }
    .bracket-match { width: 100%; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; cursor: pointer; transition: box-shadow 0.15s; background: white; }
    .bracket-match:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .bracket-match.completed { border-color: #4caf50; }
    .plate-match { border-color: #ffe0b2; }
    .plate-match.completed { border-color: #f57c00; }
    .bracket-player { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 13px; }
    .bracket-player.winner { background: #e8f5e9; font-weight: 700; color: #2e7d32; }
    .bracket-player.loser { color: #999; }
    .bracket-divider { height: 1px; background: #eee; }
    .seed { background: #e3f2fd; color: #1565c0; border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 600; min-width: 22px; text-align: center; }
    .plate-seed { background: #fff3e0; color: #e65100; }
    .name { flex: 1; }
    .sets { font-weight: 700; min-width: 16px; text-align: right; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
    .plate-divider { display: flex; align-items: center; gap: 8px; margin-top: 32px; padding: 10px 0 4px; border-top: 2px solid #ffe0b2; font-weight: 700; font-size: 15px; color: #f57c00; text-transform: uppercase; letter-spacing: 0.5px; }
    .plate-divider mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .print-btn { margin-top: 16px; }

    @media print {
      .print-btn, button { display: none !important; }
      .bracket { font-size: 11px; }
    }
  `],
})
export class BracketViewComponent implements OnInit {
  @Input() id!: string;

  private matchesService = inject(MatchesService);
  rounds = signal<{ round: number; matches: Match[] }[]>([]);
  plateRounds = signal<{ round: number; matches: Match[] }[]>([]);

  async ngOnInit() {
    const [matches, plateMatches] = await Promise.all([
      this.matchesService.getByStage(this.id, 'knockout'),
      this.matchesService.getByStage(this.id, 'knockout_plate'),
    ]);
    this.rounds.set(this.buildRounds(matches));
    this.plateRounds.set(this.buildRounds(plateMatches));
  }

  private buildRounds(matches: Match[]): { round: number; matches: Match[] }[] {
    const roundMap = new Map<number, Match[]>();
    for (const m of matches) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    }
    return Array.from(roundMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)) }));
  }

  roundLabel(round: number, totalRounds: number): string {
    const fromEnd = totalRounds - round;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semi-Final';
    if (fromEnd === 2) return 'Quarter-Final';
    return `Round ${round}`;
  }

  slotHeight(ri: number): string {
    return `${Math.pow(2, ri) * 90}px`;
  }

  setsWon(match: Match, player: 'p1' | 'p2'): number | string {
    if (!match.sets || match.sets.length === 0) return '';
    return match.sets.filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }

  print() {
    window.print();
  }
}
