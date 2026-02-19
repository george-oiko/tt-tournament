// src/app/features/matches/matches.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { Match, MatchSet, ScoreEntryDto, TournamentEvent } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private sb = inject(SupabaseService).client;

  async getByEvent(eventId: string): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('event_id', eventId)
      .order('round')
      .order('match_number');
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<Match> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async getByGroup(groupId: string): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('group_id', groupId)
      .order('match_number');
    if (error) throw error;
    return data ?? [];
  }

  async getKnockoutByEvent(eventId: string): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('event_id', eventId)
      .eq('stage', 'knockout')
      .order('round')
      .order('match_number');
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Submit score for a match.
   * Determines winner based on sets won.
   * Auto-advances winner to next knockout round if applicable.
   */
  async submitScore(dto: ScoreEntryDto, event: TournamentEvent): Promise<Match> {
    const match = await this.getById(dto.match_id);

    // Upsert sets
    for (const s of dto.sets) {
      await this.sb.from('sets').upsert({
        match_id: dto.match_id,
        set_number: s.set_number,
        score_p1: s.score_p1,
        score_p2: s.score_p2,
      }, { onConflict: 'match_id,set_number' });
    }

    // Determine winner
    let setsP1 = 0, setsP2 = 0;
    for (const s of dto.sets) {
      if (s.score_p1 > s.score_p2) setsP1++;
      else if (s.score_p2 > s.score_p1) setsP2++;
    }

    const setsToWin = Math.ceil(event.sets_to_win / 2) + (event.sets_to_win % 2 === 0 ? 0 : 0);
    const requiredToWin = Math.ceil(event.sets_to_win / 2 + 0.5); // e.g. best of 5 → 3 to win
    const winnerId = setsP1 >= requiredToWin
      ? match.player1_id
      : setsP2 >= requiredToWin
        ? match.player2_id
        : null;

    const { data, error } = await this.sb
      .from('matches')
      .update({
        winner_id: winnerId,
        status: winnerId ? 'completed' : 'in_progress',
        completed_at: winnerId ? new Date().toISOString() : null,
      })
      .eq('id', dto.match_id)
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .single();
    if (error) throw error;

    // Auto-advance in knockout or consolation bracket
    if (winnerId && match.stage !== 'group') {
      await this.advanceKnockoutWinner(match, winnerId);
    }

    return data;
  }

  /** Place winner into next round's match slot (works for knockout and consolation) */
  private async advanceKnockoutWinner(match: Match, winnerId: string) {
    const nextRound = match.round + 1;
    const nextMatchNumber = Math.ceil(match.match_number! / 2);

    // Use limit(1) instead of single() — single() fails silently when duplicate rows exist
    const { data: nextMatches } = await this.sb
      .from('matches')
      .select('*')
      .eq('event_id', match.event_id)
      .eq('stage', match.stage)
      .eq('round', nextRound)
      .eq('match_number', nextMatchNumber)
      .limit(1);

    const nextMatch = nextMatches?.[0];
    if (nextMatch) {
      const isOddMatch = match.match_number! % 2 !== 0;
      await this.sb.from('matches').update(
        isOddMatch ? { player1_id: winnerId } : { player2_id: winnerId }
      ).eq('id', nextMatch.id);
    }
  }

  /**
   * Generate single-elimination knockout bracket.
   * Players: top N from each group (for groups_knockout) or all players (for knockout).
   */
  async generateKnockoutBracket(eventId: string, players: { id: string }[]) {
    // Remove any existing knockout matches first
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'knockout');

    // Pad to next power of 2 with byes
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const rounds = Math.log2(bracketSize);
    const matches = [];

    // Round 1 matches
    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = players[i * 2] ?? null;
      const p2 = players[i * 2 + 1] ?? null;
      matches.push({
        event_id: eventId,
        stage: 'knockout',
        round: 1,
        match_number: i + 1,
        player1_id: p1?.id ?? null,
        player2_id: p2?.id ?? null,
        // If bye (p2 null), auto-win for p1
        winner_id: p2 === null ? p1?.id : null,
        status: p2 === null ? 'completed' : 'pending',
      });
    }

    // Placeholder matches for subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          event_id: eventId,
          stage: 'knockout',
          round,
          match_number: i + 1,
          player1_id: null,
          player2_id: null,
          status: 'pending',
        });
      }
    }

    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;

    // Handle byes: advance auto-winners to round 2
    for (const m of matches.filter(x => x.round === 1 && x.status === 'completed')) {
      await this.advanceKnockoutWinner(m as any, m.winner_id!);
    }
  }

  async getConsolationByEvent(eventId: string): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('event_id', eventId)
      .eq('stage', 'consolation')
      .order('round')
      .order('match_number');
    if (error) throw error;
    return data ?? [];
  }

  /** Generate single-elimination consolation bracket for non-qualifying players. */
  async generateConsolationBracket(eventId: string, players: { id: string }[]) {
    // Remove any existing consolation matches first
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'consolation');

    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const rounds = Math.log2(bracketSize);
    const matches = [];

    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = players[i * 2] ?? null;
      const p2 = players[i * 2 + 1] ?? null;
      matches.push({
        event_id: eventId,
        stage: 'consolation',
        round: 1,
        match_number: i + 1,
        player1_id: p1?.id ?? null,
        player2_id: p2?.id ?? null,
        winner_id: p2 === null ? p1?.id : null,
        status: p2 === null ? 'completed' : 'pending',
      });
    }

    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          event_id: eventId,
          stage: 'consolation',
          round,
          match_number: i + 1,
          player1_id: null,
          player2_id: null,
          status: 'pending',
        });
      }
    }

    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;

    for (const m of matches.filter(x => x.round === 1 && x.status === 'completed')) {
      await this.advanceKnockoutWinner(m as any, m.winner_id!);
    }
  }
}
