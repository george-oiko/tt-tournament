// src/app/features/events/event-form/event-form.component.ts
import { Component, inject, OnInit, signal, Input, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { EventsService } from '../events.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatDividerModule, MatCheckboxModule,
  ],
  template: `
    <div class="form-container">
      <div class="page-header">
        <button mat-icon-button routerLink="/events"><mat-icon>arrow_back</mat-icon></button>
        <h1>{{ id ? 'Edit Event' : 'Create New Event' }}</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <h3>Basic Information</h3>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Event Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Spring Open 2025" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Event Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="groups">Groups Only</mat-option>
                <mat-option value="knockout">Knockout Only</mat-option>
                <mat-option value="groups_knockout">Groups + Knockout</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-divider />
            <h3>Stage Configuration</h3>

            @if (showGroupConfig()) {
              <mat-form-field appearance="outline">
                <mat-label>Players per Group</mat-label>
                <input matInput type="number" formControlName="group_size" min="3" max="10" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="margin-left: 16px">
                <mat-label>Players Advancing to KO</mat-label>
                <input matInput type="number" formControlName="groups_advance" min="1" />
                <mat-hint>Per group</mat-hint>
              </mat-form-field>
            }

            <div class="consolation-check">
              <mat-checkbox formControlName="has_consolation">
                Enable consolation bracket (Groups + Knockout only)
              </mat-checkbox>
            </div>

            <div class="points-row">
              <mat-form-field appearance="outline">
                <mat-label>Sets to Win</mat-label>
                <mat-select formControlName="sets_to_win">
                  <mat-option [value]="3">Best of 3</mat-option>
                  <mat-option [value]="5">Best of 5</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Points per Win</mat-label>
                <input matInput type="number" formControlName="points_per_win" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Points per Loss</mat-label>
                <input matInput type="number" formControlName="points_per_loss" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Points (No Show)</mat-label>
                <input matInput type="number" formControlName="points_per_no_show" />
              </mat-form-field>
            </div>

            @if (error()) { <p class="error">{{ error() }}</p> }

            <div class="form-actions">
              <button mat-button type="button" routerLink="/events">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading()">
                {{ loading() ? 'Saving...' : (id ? 'Update Event' : 'Create Event') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-container { max-width: 700px; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .page-header h1 { margin: 0; }
    .full-width { width: 100%; margin-bottom: 16px; }
    h3 { color: #1976d2; margin: 16px 0 12px; }
    mat-divider { margin: 24px 0; }
    .points-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .error { color: #f44336; }
    .consolation-check { margin: 12px 0 16px; }
  `],
})
export class EventFormComponent implements OnInit {
  @Input() id?: string;

  private fb = inject(FormBuilder);
  private eventsService = inject(EventsService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    type: ['groups', Validators.required],
    group_size: [4, [Validators.required, Validators.min(3)]],
    groups_advance: [2, [Validators.required, Validators.min(1)]],
    sets_to_win: [3, Validators.required],
    points_per_win: [2, Validators.required],
    points_per_loss: [1, Validators.required],
    points_per_no_show: [0, Validators.required],
    has_consolation: [false],
  });

  private eventType = toSignal(this.form.get('type')!.valueChanges, { initialValue: this.form.value.type ?? null });
  showGroupConfig = computed(() => ['groups', 'groups_knockout'].includes(this.eventType() ?? ''));

  async ngOnInit() {
    if (this.id) {
      const event = await this.eventsService.getById(this.id);
      this.form.patchValue(event as any);
    }
  }

  async submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const dto = this.form.value as any;
      if (this.id) {
        await this.eventsService.update(this.id, dto);
        this.router.navigate(['/events', this.id]);
      } else {
        const event = await this.eventsService.create(dto);
        this.router.navigate(['/events', event.id]);
      }
    } catch (e: any) {
      this.error.set(e.message ?? 'Failed to save event');
    } finally {
      this.loading.set(false);
    }
  }
}
