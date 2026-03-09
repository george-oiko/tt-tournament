// src/app/features/bracket/consolation-view/consolation-view.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchesService } from '../../matches/matches.service';
import { Match } from '../../../core/models';

@Component({
  selector: 'app-consolation-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="bracket-view">
      @if (rounds().length === 0) {
        <mat-card>
          <mat-card-content class="empty">
            <mat-icon>device_hub</mat-icon>
            <p>Consolation bracket not generated yet.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="bracket-wrapper">
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
      }
    </div>
  `,
  styles: [`
    .bracket-view { overflow-x: auto; }
    .bracket-wrapper { padding: 16px 0; }
    .bracket { display: flex; gap: 0; align-items: flex-start; }
    .round { display: flex; flex-direction: column; align-items: center; min-width: 200px; }
    .round-label { font-weight: 700; color: #7b1fa2; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .matches { display: flex; flex-direction: column; width: 100%; padding: 0 8px; }
    .match-slot { display: flex; align-items: center; width: 100%; }
    .bracket-match { width: 100%; border: 1px solid #ce93d8; border-radius: 6px; overflow: hidden; cursor: pointer; transition: box-shadow 0.15s; background: white; }
    .bracket-match:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .bracket-match.completed { border-color: #7b1fa2; }
    .bracket-player { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 13px; }
    .bracket-player.winner { background: #f3e5f5; font-weight: 700; color: #6a1b9a; }
    .bracket-player.loser { color: #999; }
    .bracket-divider { height: 1px; background: #eee; }
    .seed { background: #f3e5f5; color: #6a1b9a; border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 600; min-width: 22px; text-align: center; }
    .name { flex: 1; }
    .sets { font-weight: 700; min-width: 16px; text-align: right; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
  `],
})
export class ConsolationViewComponent implements OnInit {
  @Input() id!: string;

  private matchesService = inject(MatchesService);
  rounds = signal<{ round: number; matches: Match[] }[]>([]);

  async ngOnInit() {
    const matches = await this.matchesService.getConsolationByEvent(this.id);
    this.rounds.set(this.buildRounds(matches));
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
}
