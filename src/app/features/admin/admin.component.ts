// src/app/features/admin/admin.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { Profile, UserRole } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule, MatTooltipModule, MatMenuModule],
  template: `
    <div class="admin">
      <h1>Administration</h1>

      <mat-card>
        <mat-card-header><mat-card-title>Users</mat-card-title></mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="users()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let u">{{ u.full_name }}</td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let u">
                <mat-chip [class]="'role-' + u.role">{{ roleLabel(u.role) }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let u">
                @if (u.id !== auth.profile()?.id) {
                  <button mat-icon-button [matMenuTriggerFor]="roleMenu" matTooltip="Change role">
                    <mat-icon>manage_accounts</mat-icon>
                  </button>
                  <mat-menu #roleMenu>
                    @if (u.role !== 'viewer') {
                      <button mat-menu-item (click)="setRole(u, 'viewer')">
                        <mat-icon>person</mat-icon> Set as Viewer
                      </button>
                    }
                    @if (u.role !== 'event_manager') {
                      <button mat-menu-item (click)="setRole(u, 'event_manager')">
                        <mat-icon>manage_accounts</mat-icon> Set as Event Manager
                      </button>
                    }
                    @if (u.role !== 'admin') {
                      <button mat-menu-item (click)="setRole(u, 'admin')">
                        <mat-icon>admin_panel_settings</mat-icon> Set as Admin
                      </button>
                    }
                  </mat-menu>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin { max-width: 800px; }
    h1 { margin-bottom: 24px; }
    .role-admin { background: #fce4ec !important; color: #c62828 !important; }
    .role-event_manager { background: #e3f2fd !important; color: #1565c0 !important; }
    .role-viewer { background: #f5f5f5 !important; color: #616161 !important; }
  `],
})
export class AdminComponent implements OnInit {
  private sb = inject(SupabaseService).client;
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  users = signal<Profile[]>([]);
  columns = ['name', 'role', 'actions'];

  async ngOnInit() {
    const { data } = await this.sb.from('profiles').select('*').order('full_name');
    this.users.set(data ?? []);
  }

  async setRole(user: Profile, role: UserRole) {
    const { error } = await this.sb.from('profiles').update({ role }).eq('id', user.id);
    if (error) {
      this.snackBar.open(`Failed: ${error.message}`, 'OK', { duration: 5000 });
      return;
    }
    await this.ngOnInit();
    this.snackBar.open(`${user.full_name} is now ${this.roleLabel(role)}`, 'OK', { duration: 2000 });
  }

  roleLabel(role: string): string {
    if (role === 'event_manager') return 'Event Manager';
    if (role === 'admin') return 'Admin';
    return 'Viewer';
  }
}
