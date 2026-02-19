// src/app/features/groups/group-view/group-view.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GroupsService } from '../groups.service';
import { MatchesService } from '../../matches/matches.service';
import { Group, GroupStanding, Match } from '../../../core/models';

@Component({
  selector: 'app-group-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatTabsModule, MatDividerModule],
  template: `
    <div class="group-view">
      @if (groups().length === 0) {
        <mat-card>
          <mat-card-content class="empty">
            <mat-icon>group_work</mat-icon>
            <p>No groups generated yet. Use "Generate Groups & Draw" from the Actions menu.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-tab-group>
          @for (group of groups(); track group.id) {
            <mat-tab [label]="group.name">
              <div class="group-content">
                <div class="group-columns">
                  <!-- Standings Table -->
                  <mat-card class="standings-card">
                    <mat-card-header>
                      <mat-card-title>Standings</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <table mat-table [dataSource]="getStandings(group.id)">
                        <ng-container matColumnDef="pos">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Player</th>
                          <td mat-cell *matCellDef="let row">
                            <strong>{{ row.player_name }}</strong>
                            <br><small style="color:#888">Rank {{ row.ranking }}</small>
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="played">
                          <th mat-header-cell *matHeaderCellDef>P</th>
                          <td mat-cell *matCellDef="let row">{{ row.played }}</td>
                        </ng-container>
                        <ng-container matColumnDef="wins">
                          <th mat-header-cell *matHeaderCellDef>W</th>
                          <td mat-cell *matCellDef="let row">{{ row.wins }}</td>
                        </ng-container>
                        <ng-container matColumnDef="losses">
                          <th mat-header-cell *matHeaderCellDef>L</th>
                          <td mat-cell *matCellDef="let row">{{ row.losses }}</td>
                        </ng-container>
                        <ng-container matColumnDef="points">
                          <th mat-header-cell *matHeaderCellDef>Pts</th>
                          <td mat-cell *matCellDef="let row">
                            <span class="points-badge">{{ row.points }}</span>
                          </td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="standingsCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: standingsCols;"></tr>
                      </table>
                    </mat-card-content>
                  </mat-card>

                  <!-- Matches -->
                  <mat-card class="matches-card">
                    <mat-card-header>
                      <mat-card-title>Matches</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      @for (match of getGroupMatches(group.id); track match.id) {
                        <div class="match-row" [class.completed]="match.status === 'completed'" [routerLink]="['/matches', match.id]">
                          <span class="player" [class.winner]="match.winner_id === match.player1_id">
                            {{ match.player1?.name ?? 'TBD' }}
                          </span>
                          <span class="score">
                            @if (match.status === 'completed') {
                              {{ setsWon(match, 'p1') }} – {{ setsWon(match, 'p2') }}
                            } @else {
                              vs
                            }
                          </span>
                          <span class="player right" [class.winner]="match.winner_id === match.player2_id">
                            {{ match.player2?.name ?? 'TBD' }}
                          </span>
                          <mat-icon class="match-status-icon" [class.done]="match.status === 'completed'">
                            {{ match.status === 'completed' ? 'check_circle' : 'pending' }}
                          </mat-icon>
                        </div>
                      }
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .group-content { padding: 24px 0; }
    .group-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
    .points-badge { background: #1976d2; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .match-row { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 4px; transition: background 0.15s; }
    .match-row:hover { background: #f5f5f5; }
    .match-row.completed { background: #f9f9f9; }
    .player { flex: 1; font-size: 14px; }
    .player.right { text-align: right; }
    .player.winner { font-weight: 700; color: #2e7d32; }
    .score { font-weight: 700; padding: 0 8px; min-width: 48px; text-align: center; }
    .match-status-icon { font-size: 18px; width: 18px; height: 18px; color: #ccc; }
    .match-status-icon.done { color: #4caf50; }
    standingsCols { width: 100%; }
  `],
})
export class GroupViewComponent implements OnInit {
  @Input() id!: string;

  private groupsService = inject(GroupsService);
  private matchesService = inject(MatchesService);

  groups = signal<Group[]>([]);
  standings = signal<GroupStanding[]>([]);
  matches = signal<Match[]>([]);

  standingsCols = ['pos', 'name', 'played', 'wins', 'losses', 'points'];

  async ngOnInit() {
    const [groups, standings, matches] = await Promise.all([
      this.groupsService.getByEvent(this.id),
      this.groupsService.getStandings(this.id),
      this.matchesService.getByEvent(this.id),
    ]);
    this.groups.set(groups);
    const groupMatches = matches.filter(m => m.stage === 'group');
    this.standings.set(this.groupsService.sortStandingsWithTiebreak(standings, groupMatches));
    this.matches.set(groupMatches);
  }

  getStandings(groupId: string) {
    return this.standings().filter(s => s.group_id === groupId);
  }

  getGroupMatches(groupId: string) {
    return this.matches().filter(m => m.group_id === groupId);
  }

  setsWon(match: Match, player: 'p1' | 'p2'): number {
    if (!match.sets) return 0;
    return match.sets.filter(s => player === 'p1' ? s.score_p1 > s.score_p2 : s.score_p2 > s.score_p1).length;
  }
}
