// src/app/features/players/player-form-dialog/player-form-dialog.component.ts
import { Component, inject, Inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { PlayersService } from '../players.service';
import { Player } from '../../../core/models';

interface DialogData { eventId: string; player?: Player; }

@Component({
  selector: 'app-player-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.player ? 'Edit Player' : 'Add Player' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="playerForm" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ranking (optional)</mat-label>
          <input matInput type="number" formControlName="ranking" min="1" />
          <mat-hint>Leave blank to add at last position.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Club (optional)</mat-label>
          <input matInput formControlName="club" />
        </mat-form-field>
        @if (error) { <p class="error">{{ error }}</p> }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      @if (!data.player) {
        <button mat-stroked-button color="primary" [disabled]="form.invalid || loading" (click)="saveAndAdd()">
          {{ loading ? 'Saving...' : 'Save & Add' }}
        </button>
      }
      <button mat-raised-button color="primary" form="playerForm" type="submit" [disabled]="form.invalid || loading">
        {{ loading ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 12px; } .error { color: #f44336; }`],
})
export class PlayerFormDialogComponent {
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private playersService = inject(PlayersService);
  private ref = inject(MatDialogRef);

  form = this.fb.group({
    name: [this.data.player?.name ?? '', Validators.required],
    ranking: [this.data.player?.ranking ?? null, [Validators.min(1)]],
    club: [this.data.player?.club ?? ''],
  });

  loading = false;
  error = '';

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      const dto = { ...this.form.value, event_id: this.data.eventId } as any;
      if (this.data.player) {
        await this.playersService.update(this.data.player.id, dto);
        this.ref.close(true);
      } else {
        const player = await this.playersService.create(dto);
        this.ref.close(player);
      }
    } catch (e: any) {
      this.error = e.message ?? 'Failed to save player';
    } finally {
      this.loading = false;
    }
  }

  async saveAndAdd() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      const dto = { ...this.form.value, event_id: this.data.eventId } as any;
      await this.playersService.create(dto);
      this.form.reset();
    } catch (e: any) {
      this.error = e.message ?? 'Failed to save player';
    } finally {
      this.loading = false;
    }
  }
}
