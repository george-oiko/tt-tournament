// src/app/features/matches/matches.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { Match, MatchStage, MatchSet, ScoreEntryDto, TournamentEvent } from '../../core/models';

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

  async getByStage(eventId: string, stage: MatchStage): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*, player1:player1_id(*), player2:player2_id(*), winner:winner_id(*), sets(*)')
      .eq('event_id', eventId)
      .eq('stage', stage)
      .order('round')
      .order('match_number');
    if (error) throw error;
    return data ?? [];
  }

  async getKnockoutByEvent(eventId: string): Promise<Match[]> {
    return this.getByStage(eventId, 'knockout');
  }

  async getConsolationByEvent(eventId: string): Promise<Match[]> {
    return this.getByStage(eventId, 'consolation');
  }

  /**
   * Submit score for a match.
   * Determines winner based on sets won.
   * Auto-advances winner to next knockout round if applicable.
   * Auto-places loser into plate bracket for round 1 knockout/consolation matches.
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

    const requiredToWin = Math.ceil(event.sets_to_win / 2 + 0.5);
    const winnerId = setsP1 >= requiredToWin && setsP1 > setsP2
      ? match.player1_id
      : setsP2 >= requiredToWin && setsP2 > setsP1
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

    if (winnerId && match.stage !== 'group') {
      await this.advanceKnockoutWinner(match, winnerId);

      // Place loser into plate bracket for round 1 of main brackets
      if (match.round === 1 && (match.stage === 'knockout' || match.stage === 'consolation')) {
        const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
        if (loserId) {
          await this.advanceLoserToPlate(match, loserId);
        }
      }
    }

    return data;
  }

  /** Place winner into next round's match slot (works for all bracket stages) */
  private async advanceKnockoutWinner(match: Match, winnerId: string) {
    const nextRound = match.round + 1;
    const nextMatchNumber = Math.ceil(match.match_number! / 2);

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

  /** Place round-1 loser into the corresponding plate bracket slot */
  private async advanceLoserToPlate(match: Match, loserId: string) {
    const plateStage: MatchStage = match.stage === 'knockout' ? 'knockout_plate' : 'consolation_plate';
    const plateMatchNumber = Math.ceil(match.match_number! / 2);

    const { data: plateMatches } = await this.sb
      .from('matches')
      .select('*')
      .eq('event_id', match.event_id)
      .eq('stage', plateStage)
      .eq('round', 1)
      .eq('match_number', plateMatchNumber)
      .limit(1);

    const plateMatch = plateMatches?.[0];
    if (plateMatch) {
      const isOddMatch = match.match_number! % 2 !== 0;
      await this.sb.from('matches').update(
        isOddMatch ? { player1_id: loserId } : { player2_id: loserId }
      ).eq('id', plateMatch.id);
    }
  }

  /**
   * Compute the bracket slot order for a single-elimination draw of size n (must be power of 2).
   * Returns an array where result[slotIndex] = 1-based seed number that belongs in that slot.
   * This guarantees: seed 1 faces seed n in R1, seed 2 faces seed n-1, etc.,
   * and seeds 1 & 2 cannot meet before the final.
   */
  private buildBracketSlots(n: number): number[] {
    if (n === 2) return [1, 2];
    const prev = this.buildBracketSlots(n / 2);
    const result: number[] = [];
    for (let i = 0; i < prev.length; i++) {
      const x = prev[i];
      const comp = n + 1 - x;
      // Alternate direction so complement is always placed opposite
      if (i % 2 === 0) result.push(x, comp);
      else result.push(comp, x);
    }
    return result;
  }

  /**
   * Place seeded players into bracket slots.
   * Input: players already in seed order (best player at index 0).
   * Output: array of length bracketSize — nulls are byes.
   * Seed 1 faces the last seed, seed 2 faces the second-to-last, etc.
   */
  private applyBracketSeeding(players: { id: string }[]): ({ id: string } | null)[] {
    if (players.length === 0) return [];
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(players.length, 2))));
    const slots = this.buildBracketSlots(bracketSize);
    return slots.map(seedPos => players[seedPos - 1] ?? null);
  }

  /**
   * Generate single-elimination knockout bracket.
   * Also generates the knockout_plate bracket for round-1 losers.
   */
  async generateKnockoutBracket(eventId: string, players: { id: string; group_id?: string }[]) {
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'knockout');
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'knockout_plate');

    const seeded = this.applyBracketSeeding(players);
    const bracketSize = seeded.length || 2;
    const rounds = Math.log2(bracketSize);
    const matches = [];

    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = seeded[i * 2];
      const p2 = seeded[i * 2 + 1];
      matches.push({
        event_id: eventId,
        stage: 'knockout',
        round: 1,
        match_number: i + 1,
        player1_id: p1?.id ?? null,
        player2_id: p2?.id ?? null,
        winner_id: (!p1 || !p2) ? (p1 ?? p2)?.id ?? null : null,
        status: (!p1 || !p2) ? 'completed' : 'pending',
      });
    }

    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          event_id: eventId, stage: 'knockout', round,
          match_number: i + 1, player1_id: null, player2_id: null, status: 'pending',
        });
      }
    }

    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;

    for (const m of matches.filter(x => x.round === 1 && x.status === 'completed')) {
      await this.advanceKnockoutWinner(m as any, m.winner_id!);
    }

    const r1MatchCount = bracketSize / 2;
    if (r1MatchCount >= 2) {
      await this.generatePlateBracket(eventId, 'knockout_plate', r1MatchCount);
    }
  }

  async getConsolationPlateByEvent(eventId: string): Promise<Match[]> {
    return this.getByStage(eventId, 'consolation_plate');
  }

  /** Generate single-elimination consolation bracket for non-qualifying players.
   *  Also generates the consolation_plate bracket for round-1 losers.
   */
  async generateConsolationBracket(eventId: string, players: { id: string; group_id?: string }[]) {
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'consolation');
    await this.sb.from('matches').delete().eq('event_id', eventId).eq('stage', 'consolation_plate');

    const seeded = this.applyBracketSeeding(players);
    const bracketSize = seeded.length || 2;
    const rounds = Math.log2(bracketSize);
    const matches = [];

    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = seeded[i * 2];
      const p2 = seeded[i * 2 + 1];
      matches.push({
        event_id: eventId,
        stage: 'consolation',
        round: 1,
        match_number: i + 1,
        player1_id: p1?.id ?? null,
        player2_id: p2?.id ?? null,
        winner_id: (!p1 || !p2) ? (p1 ?? p2)?.id ?? null : null,
        status: (!p1 || !p2) ? 'completed' : 'pending',
      });
    }

    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          event_id: eventId, stage: 'consolation', round,
          match_number: i + 1, player1_id: null, player2_id: null, status: 'pending',
        });
      }
    }

    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;

    for (const m of matches.filter(x => x.round === 1 && x.status === 'completed')) {
      await this.advanceKnockoutWinner(m as any, m.winner_id!);
    }

    const r1MatchCount = bracketSize / 2;
    if (r1MatchCount >= 2) {
      await this.generatePlateBracket(eventId, 'consolation_plate', r1MatchCount);
    }
  }

  /**
   * Generate an empty plate bracket.
   * playerCount = number of round-1 matches in the parent bracket (already a power of 2).
   */
  private async generatePlateBracket(eventId: string, stage: 'knockout_plate' | 'consolation_plate', playerCount: number) {
    const rounds = Math.log2(playerCount);
    const matches = [];

    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = playerCount / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          event_id: eventId, stage, round,
          match_number: i + 1, player1_id: null, player2_id: null, status: 'pending',
        });
      }
    }

    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;
  }
}
