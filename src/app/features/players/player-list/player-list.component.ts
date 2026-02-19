// src/app/features/players/player-list/player-list.component.ts
import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlayersService } from '../players.service';
import { Player } from '../../../core/models';
import { PlayerFormDialogComponent } from '../player-form-dialog/player-form-dialog.component';
import { PlayerResultsDialogComponent } from '../player-results-dialog/player-results-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatDialogModule, MatSnackBarModule, MatCardModule, MatTooltipModule,
    DragDropModule,
  ],
  template: `
    <div class="player-list">
      <div class="toolbar">
        <h2>Players ({{ players().length }})</h2>
        @if (auth.isLoggedIn()) {
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>person_add</mat-icon> Add Player
          </button>
        }
      </div>

      @if (players().length === 0) {
        <mat-card>
          <mat-card-content class="empty">
            <mat-icon>people</mat-icon>
            <p>No players yet. Add players to get started.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <table mat-table [dataSource]="players()" class="full-width"
                 cdkDropList (cdkDropListDropped)="drop($event)">
            @if (auth.isLoggedIn()) {
              <ng-container matColumnDef="drag">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                </td>
              </ng-container>
            }
            <ng-container matColumnDef="seed">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let i = index">{{ i + 1 }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let p">
                <strong>{{ p.name }}</strong>
                @if (p.club) { <span class="club">{{ p.club }}</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="ranking">
              <th mat-header-cell *matHeaderCellDef>Ranking</th>
              <td mat-cell *matCellDef="let p">
                <span class="ranking-badge">{{ p.ranking }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let p">{{ p.email ?? '—' }}</td>
            </ng-container>
            @if (auth.isLoggedIn()) {
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <button mat-icon-button (click)="openEditDialog(p); $event.stopPropagation()" matTooltip="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deletePlayer(p); $event.stopPropagation()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
            }
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"
                cdkDrag [cdkDragDisabled]="!auth.isLoggedIn()"
                class="clickable-row" (click)="openResultsDialog(row)"></tr>
          </table>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .toolbar h2 { margin: 0; }
    .full-width { width: 100%; }
    .empty { text-align: center; padding: 48px !important; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
    .club { color: #888; font-size: 12px; margin-left: 8px; }
    .ranking-badge { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 13px; }
    .drag-handle { cursor: grab; color: #bbb; vertical-align: middle; }
    .cdk-drag-preview { display: table; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; }
    .cdk-drag-preview td { padding: 8px 16px; }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .full-width.cdk-drop-list-dragging tr:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f5f5f5; }
  `],
})
export class PlayerListComponent implements OnInit {
  @Input() id!: string; // event id

  private playersService = inject(PlayersService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  players = signal<Player[]>([]);

  get columns() {
    return this.auth.isLoggedIn()
      ? ['drag', 'seed', 'name', 'ranking', 'email', 'actions']
      : ['seed', 'name', 'ranking', 'email'];
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.players.set(await this.playersService.getByEvent(this.id));
  }

  async drop(event: CdkDragDrop<Player[]>) {
    const list = [...this.players()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const reranked = list.map((p, i) => ({ ...p, seed_position: i + 1, ranking: i + 1 }));
    this.players.set(reranked);
    try {
      await this.playersService.saveSeedOrder(reranked);
    } catch (e: any) {
      this.snackBar.open('Failed to save order', 'OK', { duration: 3000 });
      await this.load(); // revert on error
    }
  }

  openResultsDialog(player: Player) {
    this.dialog.open(PlayerResultsDialogComponent, {
      width: '560px',
      data: { player, eventId: this.id },
    });
  }

  openAddDialog() {
    const ref = this.dialog.open(PlayerFormDialogComponent, {
      width: '400px',
      data: { eventId: this.id },
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  openEditDialog(player: Player) {
    const ref = this.dialog.open(PlayerFormDialogComponent, {
      width: '400px',
      data: { eventId: this.id, player },
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  async deletePlayer(player: Player) {
    if (!confirm(`Delete ${player.name}?`)) return;
    try {
      await this.playersService.delete(player.id);
      this.snackBar.open('Player deleted', 'OK', { duration: 2000 });
      await this.load();
    } catch (e: any) {
      this.snackBar.open(e.message, 'OK', { duration: 3000 });
    }
  }
}
