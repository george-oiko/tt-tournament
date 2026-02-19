// src/app/features/events/events.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { TournamentEvent, CreateEventDto } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private sb = inject(SupabaseService).client;
  private auth = inject(AuthService);

  async getAll(): Promise<TournamentEvent[]> {
    // Wait for auth to finish loading the profile before checking role
    await this.auth.initialized;
    let query = this.sb.from('events').select('*').order('created_at', { ascending: false });
    // Event managers only see their own events; admins and viewers see all
    if (this.auth.isEventManager()) {
      query = query.eq('created_by', this.auth.profile()!.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<TournamentEvent> {
    const { data, error } = await this.sb.from('events').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(dto: CreateEventDto): Promise<TournamentEvent> {
    const { data, error } = await this.sb.from('events').insert({
      ...dto,
      created_by: this.auth.profile()!.id,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<CreateEventDto>): Promise<TournamentEvent> {
    const { data, error } = await this.sb.from('events').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, status: TournamentEvent['status']) {
    return this.update(id, { status } as any);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.sb.from('events').delete().eq('id', id);
    if (error) throw error;
  }

  // Assign a manager to an event
  async assignManager(eventId: string, userId: string) {
    const { error } = await this.sb.from('event_managers').insert({ event_id: eventId, user_id: userId });
    if (error) throw error;
  }

  async removeManager(eventId: string, userId: string) {
    const { error } = await this.sb.from('event_managers').delete().eq('event_id', eventId).eq('user_id', userId);
    if (error) throw error;
  }

  async getManagers(eventId: string) {
    const { data, error } = await this.sb
      .from('event_managers')
      .select('*, profiles(*)')
      .eq('event_id', eventId);
    if (error) throw error;
    return data ?? [];
  }
}
