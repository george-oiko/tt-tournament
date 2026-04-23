// src/app/features/matches/match-detail/match-detail.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatchesService } from '../matches.service';
import { EventsService } from '../../events/events.service';
import { Match, TournamentEvent } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatDividerModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    @if (match()) {
      <div class="match-detail">
        <div class="page-header">
          <button mat-icon-button [routerLink]="['/events', match()!.event_id, 'groups']"><mat-icon>arrow_back</mat-icon></button>
          <h1>Match Detail</h1>
          <mat-chip [class]="'status-' + match()!.status">{{ match()!.status | titlecase }}</mat-chip>
        </div>

        <mat-card class="players-card">
          <mat-card-content>
            <div class="table-scroll">
            <table class="result-table">
              <thead>
                <tr>
                  <th class="player-col">Player</th>
                  @for (set of match()!.sets ?? []; track set.set_number) {
                    <th class="set-col">Set {{ set.set_number }}</th>
                  }
                  @if (!(match()!.sets ?? []).length) {
                    <th class="set-col">Sets</th>
                  }
                  <th class="total-col">Sets Won</th>
                </tr>
              </thead>
              <tbody>
                <tr [class.row-winner]="match()!.winner_id === match()!.player1_id"
                    [class.row-loser]="match()!.winner_id && match()!.winner_id !== match()!.player1_id">
                  <td class="player-name-cell">
                    @if (match()!.winner_id === match()!.player1_id) {
                      <mat-icon class="trophy">emoji_events</mat-icon>
                    }
                    {{ match()!.player1?.name ?? 'TBD' }}
                    <span class="seed-badge">R{{ match()!.player1?.seed_position ?? '?' }}</span>
                  </td>
                  @for (set of match()!.sets ?? []; track set.set_number) {
                    <td class="score-cell" [class.set-win]="set.score_p1 > set.score_p2">{{ set.score_p1 }}</td>
                  }
                  @if (!(match()!.sets ?? []).length) {
                    <td class="score-cell">—</td>
                  }
                  <td class="total-cell">{{ setsWon('p1') }}</td>
                </tr>
                <tr [class.row-winner]="match()!.winner_id === match()!.player2_id"
                    [class.row-loser]="match()!.winner_id && match()!.winner_id !== match()!.player2_id">
                  <td class="player-name-cell">
                    @if (match()!.winner_id === match()!.player2_id) {
                      <mat-icon class="trophy">emoji_events</mat-icon>
                    }
                    {{ match()!.player2?.name ?? 'TBD' }}
                    <span class="seed-badge">R{{ match()!.player2?.seed_position ?? '?' }}</span>
                  </td>
                  @for (set of match()!.sets ?? []; track set.set_number) {
                    <td class="score-cell" [class.set-win]="set.score_p2 > set.score_p1">{{ set.score_p2 }}</td>
                  }
                  @if (!(match()!.sets ?? []).length) {
                    <td class="score-cell">—</td>
                  }
                  <td class="total-cell">{{ setsWon('p2') }}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </mat-card-content>
        </mat-card>

        @if (match()!.status !== 'completed' && event()) {
          <mat-card class="score-card">
            <mat-card-header>
              <mat-card-title>Enter Scores</mat-card-title>
              <mat-card-subtitle>Best of {{ event()!.sets_to_win }} sets</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="submitScore()">
                <div class="table-scroll">
                <table class="score-entry-table">
                  <thead>
                    <tr>
                      <th class="player-col">Player</th>
                      @for (set of setsArray.controls; track $index) {
                        <th class="set-col">Set {{ $index + 1 }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="player-name-cell">{{ match()!.player1?.name ?? 'TBD' }}</td>
                      @for (set of setsArray.controls; track $index) {
                        <td [formGroup]="asFormGroup($index)">
                          <mat-form-field appearance="outline" class="score-field">
                            <input matInput type="number" formControlName="score_p1" min="0" />
                          </mat-form-field>
                        </td>
                      }
                    </tr>
                    <tr>
                      <td class="player-name-cell">{{ match()!.player2?.name ?? 'TBD' }}</td>
                      @for (set of setsArray.controls; track $index) {
                        <td [formGroup]="asFormGroup($index)">
                          <mat-form-field appearance="outline" class="score-field">
                            <input matInput type="number" formControlName="score_p2" min="0" />
                          </mat-form-field>
                        </td>
                      }
                    </tr>
                  </tbody>
                </table>
                </div>
                <div class="form-actions">
                  <button mat-button type="button" (click)="addSet()"><mat-icon>add</mat-icon> Add Set</button>
                  <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading()">
                    {{ loading() ? 'Saving...' : 'Submit Score' }}
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        }

      </div>
    } @else {
      <p>Loading match...</p>
    }
  `,
  styles: [`
    .match-detail { max-width: 700px; }
    .table-scroll { overflow-x: auto; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .page-header h1 { margin: 0; flex: 1; }
    .result-table { width: 100%; border-collapse: collapse; }
    .result-table th { padding: 10px 14px; text-align: center; font-weight: 600; color: #666; font-size: 13px; border-bottom: 2px solid #e0e0e0; }
    .result-table td { padding: 12px 14px; border-bottom: 1px solid #eee; }
    .player-col { text-align: left; min-width: 160px; }
    .set-col { width: 70px; }
    .total-col { width: 90px; }
    .player-name-cell { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 400; }
    .row-winner .player-name-cell { font-weight: 700; }
    .seed-badge { font-size: 11px; color: #1976d2; background: #e3f2fd; padding: 2px 6px; border-radius: 10px; font-weight: 500; }
    .score-cell { text-align: center; font-size: 15px; }
    .score-cell.set-win { color: #2e7d32; font-weight: 700; }
    .total-cell { text-align: center; font-size: 18px; font-weight: 700; color: #1976d2; }
    .row-winner { background: #e8f5e9; }
    .row-winner .player-name-cell { color: #2e7d32; }
    .row-winner .total-cell { color: #2e7d32; }
    .row-loser { opacity: 0.6; }
    .trophy { color: #f9a825; font-size: 18px; width: 18px; height: 18px; vertical-align: middle; }
    .score-card { margin-top: 16px; }
    .sets-header { display: flex; gap: 16px; font-weight: 600; color: #666; font-size: 13px; padding: 0 0 8px; }
    .sets-header span:first-child { width: 60px; }
    .sets-header span { flex: 1; }
    .set-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .set-label { width: 50px; font-size: 14px; color: #666; }
    .score-field { width: 80px; }
    .form-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .status-pending { background: #fff3e0 !important; }
    .status-completed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-in_progress { background: #e3f2fd !important; color: #1565c0 !important; }

    @media (max-width: 600px) {
      .match-detail { max-width: 100%; }
      .page-header { margin-bottom: 16px; }
      .page-header h1 { font-size: 18px; }
      .player-col { min-width: 110px; }
      .score-field { width: 60px; }
    }
  `],
})
export class MatchDetailComponent implements OnInit {
  @Input() id!: string;

  private matchesService = inject(MatchesService);
  private eventsService = inject(EventsService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  match = signal<Match | null>(null);
  event = signal<TournamentEvent | null>(null);
  loading = signal(false);

  form = this.fb.group({
    sets: this.fb.array([this.newSetControl(1)]),
  });

  get setsArray() {
    return this.form.get('sets') as FormArray;
  }

  asFormGroup(i: number): FormGroup {
    return this.setsArray.at(i) as FormGroup;
  }

  newSetControl(setNumber: number) {
    return this.fb.group({
      set_number: [setNumber],
      score_p1: [null, [Validators.required, Validators.min(0)]],
      score_p2: [null, [Validators.required, Validators.min(0)]],
    });
  }

  addSet() {
    this.setsArray.push(this.newSetControl(this.setsArray.length + 1));
  }

  async ngOnInit() {
    const match = await this.matchesService.getById(this.id);
    this.match.set(match);
    const event = await this.eventsService.getById(match.event_id);
    this.event.set(event);

    // Pre-populate sets form with existing sets
    if (match.sets && match.sets.length > 0) {
      this.setsArray.clear();
      match.sets.forEach(s => {
        this.setsArray.push(this.fb.group({
          set_number: [s.set_number],
          score_p1: [s.score_p1, [Validators.required, Validators.min(0)]],
          score_p2: [s.score_p2, [Validators.required, Validators.min(0)]],
        }));
      });
    } else {
      // Create empty sets based on event config
      this.setsArray.clear();
      for (let i = 1; i <= event.sets_to_win; i++) {
        this.setsArray.push(this.newSetControl(i));
      }
    }
  }

  async submitScore() {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      const updated = await this.matchesService.submitScore(
        { match_id: this.id, sets: this.form.value.sets as any },
        this.event()!
      );
      this.match.set(updated);
      this.snackBar.open('Score saved!', 'OK', { duration: 2000 });
    } catch (e: any) {
      this.snackBar.open(e.message ?? 'Error saving score', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  setsWon(player: 'p1' | 'p2'): number {
    const sets = this.match()?.sets ?? [];
    return sets.filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }

  getWinnerName(): string {
    const m = this.match()!;
    if (m.winner_id === m.player1_id) return m.player1?.name ?? '';
    if (m.winner_id === m.player2_id) return m.player2?.name ?? '';
    return '';
  }
}
