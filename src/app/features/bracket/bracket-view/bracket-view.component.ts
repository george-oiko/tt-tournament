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
          <h3 class="bracket-title">Main Bracket</h3>
          <div class="bracket">
            @for (round of rounds(); track round.round; let ri = $index) {
              <div class="round">
                <div class="round-label">{{ roundLabel(round.round, rounds().length) }}</div>
                <div class="matches" [style.gap]="gapForRound(ri)">
                  @for (match of round.matches; track match.id) {
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
                  }
                </div>
              </div>
            }
          </div>

          @if (consolationRounds().length > 0) {
            <div class="consolation-section">
              <h3 class="bracket-title consolation-title">
                <mat-icon>device_hub</mat-icon> Consolation Bracket
              </h3>
              <div class="bracket">
                @for (round of consolationRounds(); track round.round; let ri = $index) {
                  <div class="round">
                    <div class="round-label consolation-label">{{ roundLabel(round.round, consolationRounds().length) }}</div>
                    <div class="matches" [style.gap]="gapForRound(ri)">
                      @for (match of round.matches; track match.id) {
                        <div class="bracket-match consolation-match" [class.completed]="match.status === 'completed'" [routerLink]="['/matches', match.id]">
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
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
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
    .matches { display: flex; flex-direction: column; width: 100%; padding: 0 8px; }
    .bracket-match { border: 1px solid #ddd; border-radius: 6px; overflow: hidden; cursor: pointer; transition: box-shadow 0.15s; background: white; }
    .bracket-match:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .bracket-match.completed { border-color: #4caf50; }
    .bracket-player { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 13px; }
    .bracket-player.winner { background: #e8f5e9; font-weight: 700; color: #2e7d32; }
    .bracket-player.loser { color: #999; }
    .bracket-divider { height: 1px; background: #eee; }
    .seed { background: #e3f2fd; color: #1565c0; border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 600; min-width: 22px; text-align: center; }
    .name { flex: 1; }
    .sets { font-weight: 700; min-width: 16px; text-align: right; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
    .print-btn { margin-top: 16px; }

    .bracket-title { color: #1976d2; margin: 0 0 16px; font-size: 16px; display: flex; align-items: center; gap: 6px; }
    .bracket-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .consolation-section { margin-top: 40px; border-top: 2px dashed #e0e0e0; padding-top: 24px; }
    .consolation-title { color: #7b1fa2; }
    .consolation-label { color: #7b1fa2 !important; }
    .consolation-match { border-color: #ce93d8 !important; }
    .consolation-match.completed { border-color: #7b1fa2 !important; }

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
  consolationRounds = signal<{ round: number; matches: Match[] }[]>([]);

  async ngOnInit() {
    const [knockoutMatches, consolationMatches] = await Promise.all([
      this.matchesService.getKnockoutByEvent(this.id),
      this.matchesService.getConsolationByEvent(this.id),
    ]);
    this.rounds.set(this.buildRounds(knockoutMatches));
    this.consolationRounds.set(this.buildRounds(consolationMatches));
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

  gapForRound(roundIndex: number): string {
    return `${Math.pow(2, roundIndex) * 8 + 8}px`;
  }

  setsWon(match: Match, player: 'p1' | 'p2'): number | string {
    if (!match.sets || match.sets.length === 0) return '';
    return match.sets.filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }

  print() {
    window.print();
  }
}
