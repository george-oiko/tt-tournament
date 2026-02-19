// src/app/features/players/player-results-dialog/player-results-dialog.component.ts
import { Component, inject, OnInit, signal, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatchesService } from '../../matches/matches.service';
import { Player, Match } from '../../../core/models';

interface DialogData { player: Player; eventId: string; }

interface ResultRow {
  stage: string;
  round: number;
  opponent: string;
  score: string;
  setScores: string;
  result: 'W' | 'L' | '—';
}

@Component({
  selector: 'app-player-results-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatTableModule, MatButtonModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      {{ data.player.name }}
      @if (data.player.club) { <span class="club">{{ data.player.club }}</span> }
    </h2>
    <mat-dialog-content>
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (rows().length === 0) {
        <p class="no-results">No matches played yet in this event.</p>
      } @else {
        <table mat-table [dataSource]="rows()" class="results-table">
          <ng-container matColumnDef="stage">
            <th mat-header-cell *matHeaderCellDef>Stage</th>
            <td mat-cell *matCellDef="let r">
              <span class="stage-chip stage-{{ r.stage }}">{{ stageLabel(r.stage) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="round">
            <th mat-header-cell *matHeaderCellDef>Round</th>
            <td mat-cell *matCellDef="let r">{{ r.round }}</td>
          </ng-container>
          <ng-container matColumnDef="opponent">
            <th mat-header-cell *matHeaderCellDef>Opponent</th>
            <td mat-cell *matCellDef="let r"><strong>{{ r.opponent }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="score">
            <th mat-header-cell *matHeaderCellDef>Sets</th>
            <td mat-cell *matCellDef="let r">
              <span class="sets-summary">{{ r.score }}</span>
              @if (r.setScores) {
                <br><span class="set-scores">{{ r.setScores }}</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="result">
            <th mat-header-cell *matHeaderCellDef>Result</th>
            <td mat-cell *matCellDef="let r">
              <span class="result-badge result-{{ r.result }}">{{ r.result }}</span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 10px; }
    .club { font-size: 14px; font-weight: 400; color: #888; }
    .loading { display: flex; justify-content: center; padding: 32px; }
    .no-results { text-align: center; color: #888; padding: 24px 0; }
    .results-table { width: 100%; min-width: 440px; }
    .stage-chip {
      display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 600; text-transform: capitalize;
    }
    .stage-group { background: #e3f2fd; color: #1565c0; }
    .stage-knockout { background: #fce4ec; color: #880e4f; }
    .stage-consolation { background: #f3e5f5; color: #6a1b9a; }
    .result-badge {
      display: inline-block; width: 28px; text-align: center;
      padding: 2px 6px; border-radius: 10px; font-weight: 700; font-size: 13px;
    }
    .result-W { background: #e8f5e9; color: #2e7d32; }
    .result-L { background: #ffebee; color: #c62828; }
    .result-— { background: #f5f5f5; color: #999; }
    .sets-summary { font-weight: 700; }
    .set-scores { font-size: 11px; color: #888; }
  `],
})
export class PlayerResultsDialogComponent implements OnInit {
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private matchesService = inject(MatchesService);

  loading = signal(true);
  rows = signal<ResultRow[]>([]);
  cols = ['stage', 'round', 'opponent', 'score', 'result'];

  async ngOnInit() {
    const matches = await this.matchesService.getByEvent(this.data.eventId);
    const playerId = this.data.player.id;
    const played = matches
      .filter(m => (m.player1_id === playerId || m.player2_id === playerId) && m.status !== 'pending')
      .sort((a, b) => new Date(a.completed_at ?? a.created_at).getTime() - new Date(b.completed_at ?? b.created_at).getTime());

    this.rows.set(played.map(m => {
      const isP1 = m.player1_id === playerId;
      const opponent = isP1 ? (m.player2?.name ?? 'TBD') : (m.player1?.name ?? 'TBD');
      const setsWon = this.setsWon(m, isP1 ? 'p1' : 'p2');
      const setsLost = this.setsWon(m, isP1 ? 'p2' : 'p1');
      const score = m.sets && m.sets.length > 0 ? `${setsWon} – ${setsLost}` : '—';
      const setScores = m.sets && m.sets.length > 0
        ? [...m.sets]
            .sort((a, b) => a.set_number - b.set_number)
            .map(s => isP1 ? `${s.score_p1}-${s.score_p2}` : `${s.score_p2}-${s.score_p1}`)
            .join(', ')
        : '';
      const result: 'W' | 'L' | '—' = m.winner_id
        ? (m.winner_id === playerId ? 'W' : 'L')
        : '—';
      return { stage: m.stage, round: m.round, opponent, score, setScores, result };
    }));

    this.loading.set(false);
  }

  stageLabel(stage: string): string {
    if (stage === 'group') return 'Group';
    if (stage === 'knockout') return 'Knockout';
    if (stage === 'consolation') return 'Consolation';
    return stage;
  }

  private setsWon(match: Match, player: 'p1' | 'p2'): number {
    if (!match.sets || match.sets.length === 0) return 0;
    return match.sets.filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }
}
