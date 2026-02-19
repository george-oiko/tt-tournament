// src/app/features/players/players.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { Player, CreatePlayerDto } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class PlayersService {
  private sb = inject(SupabaseService).client;
  private auth = inject(AuthService);

  async getByEvent(eventId: string): Promise<Player[]> {
    const { data, error } = await this.sb
      .from('players')
      .select('*')
      .eq('event_id', eventId)
      .order('ranking', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async create(dto: CreatePlayerDto): Promise<Player> {
    const profile = this.auth.profile();
    if (!profile) throw new Error('You must be logged in to add players');

    const existing = await this.getByEvent(dto.event_id);

    let targetRanking: number;
    if (dto.ranking != null) {
      targetRanking = dto.ranking;
      // Shift players at or below the target slot down by 1 (descending order to avoid unique conflicts)
      const toShift = existing
        .filter(p => p.ranking >= targetRanking)
        .sort((a, b) => b.ranking - a.ranking);
      for (const p of toShift) {
        await this.sb.from('players')
          .update({ ranking: p.ranking + 1, seed_position: p.ranking + 1 })
          .eq('id', p.id);
      }
    } else {
      targetRanking = existing.length + 1;
    }

    const { ranking: _r, ...rest } = dto;
    const { data, error } = await this.sb.from('players').insert({
      ...rest,
      ranking: targetRanking,
      seed_position: targetRanking,
      created_by: profile.id,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<CreatePlayerDto>): Promise<Player> {
    const { data, error } = await this.sb.from('players').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.sb.from('players').delete().eq('id', id);
    if (error) throw error;
  }

  /** Save seed positions and rankings from an explicit ordered array (used after drag-and-drop) */
  async saveSeedOrder(players: Player[]): Promise<void> {
    for (let i = 0; i < players.length; i++) {
      await this.sb.from('players')
        .update({ seed_position: i + 1, ranking: i + 1 })
        .eq('id', players[i].id);
    }
  }

  /** Update seed_position for all players in event based on ranking */
  async updateSeeds(eventId: string): Promise<void> {
    const players = await this.getByEvent(eventId);
    const updates = players.map((p, i) => ({ id: p.id, seed_position: i + 1 }));
    for (const u of updates) {
      await this.sb.from('players').update({ seed_position: u.seed_position }).eq('id', u.id);
    }
  }
}
