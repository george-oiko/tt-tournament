// src/app/features/auth/register/register.component.ts
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidatorFn, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

const passwordsMatch: ValidatorFn = (group: AbstractControl) => {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>sports_tennis</mat-icon>
          <mat-card-title>Create Account</mat-card-title>
          <mat-card-subtitle>Table Tennis Tournament Platform</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" />
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" />
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.errors?.['minlength']) {
                <mat-error>At least 8 characters required.</mat-error>
              }
              @if (form.get('password')?.errors?.['pattern']) {
                <mat-error>Must include uppercase, number, and special character.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="confirmPassword" />
              <mat-icon matSuffix>lock</mat-icon>
              @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.dirty) {
                <mat-error>Passwords do not match.</mat-error>
              }
            </mat-form-field>
            @if (error) { <p class="error-msg">{{ error }}</p> }
            @if (success) { <p class="success-msg">Account created! Check your email to confirm.</p> }
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full-width">
              @if (loading) { <mat-spinner diameter="20" /> } @else { Create Account }
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions>
          <span>Already have an account? <a routerLink="/auth/login">Sign in</a></span>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
    .auth-card { width: 100%; max-width: 420px; padding: 16px; }
    .full-width { width: 100%; margin-bottom: 12px; }
    .error-msg { color: #f44336; font-size: 14px; }
    .success-msg { color: #4caf50; font-size: 14px; }
    mat-card-actions { padding: 16px; text-align: center; }
    a { color: #1976d2; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  showPassword = false;
  loading = false;
  error = '';
  success = false;

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\-_]).{8,}$/),
    ]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      await this.auth.signUp(
        this.form.value.email!,
        this.form.value.password!,
        this.form.value.fullName!,
      );
      this.success = true;
    } catch {
      this.error = 'Registration failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
