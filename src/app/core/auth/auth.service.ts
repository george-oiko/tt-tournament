// src/app/core/auth/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from '../models';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Signals
  private _session = signal<Session | null>(null);
  private _profile = signal<Profile | null>(null);

  session = this._session.asReadonly();
  profile = this._profile.asReadonly();
  isLoggedIn = computed(() => !!this._session());
  isAdmin = computed(() => this._profile()?.role === 'admin');
  isEventManager = computed(() => this._profile()?.role === 'event_manager');

  /** Resolves once the initial session + profile load completes. */
  readonly initialized: Promise<void>;
  private _initResolve!: () => void;

  constructor() {
    this.initialized = new Promise(resolve => { this._initResolve = resolve; });

    // INITIAL_SESSION fires on startup with the current session (or null).
    // Keep callback synchronous; handle async loadProfile with .then()
    this.supabase.client.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        this._session.set(session);
        if (session) {
          this.loadProfile(session.user.id).then(() => {
            if (event === 'INITIAL_SESSION') this._initResolve();
          });
        } else {
          this._profile.set(null);
          if (event === 'INITIAL_SESSION') this._initResolve();
        }
      }
    );
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'viewer' } }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  private async loadProfile(userId: string) {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    this._profile.set(data);
  }
}
