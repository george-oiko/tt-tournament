// src/app/features/groups/groups.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { Group, GroupPlayer, GroupStanding, Match, Player, TournamentEvent } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private sb = inject(SupabaseService).client;

  async getByEvent(eventId: string): Promise<Group[]> {
    const { data, error } = await this.sb
      .from('groups')
      .select('*, group_players(*, players(*))')
      .eq('event_id', eventId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async getStandings(eventId: string): Promise<GroupStanding[]> {
    const { data, error } = await this.sb
      .from('group_standings')
      .select('*')
      .eq('event_id', eventId);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Snake-seeding algorithm:
   * Seeds distributed across groups in a snake pattern.
   * E.g. 8 players, 2 groups → A:[1,4,5,8], B:[2,3,6,7]
   */
  snakeSeed(players: Player[], groupCount: number): Player[][] {
    const sorted = [...players].sort((a, b) => a.ranking - b.ranking);
    const groups: Player[][] = Array.from({ length: groupCount }, () => []);

    let groupIndex = 0;
    let direction = 1; // 1 = left-to-right, -1 = right-to-left

    for (let i = 0; i < sorted.length; i++) {
      groups[groupIndex].push(sorted[i]);
      if (i % groupCount === groupCount - 1) {
        direction *= -1; // reverse direction each row
      } else {
        groupIndex += direction;
        groupIndex = Math.max(0, Math.min(groupCount - 1, groupIndex));
      }
    }

    return groups;
  }

  /** Auto-generate groups with snake seeding for an event */
  async generateGroups(event: TournamentEvent, players: Player[]): Promise<void> {
    const groupCount = Math.ceil(players.length / event.group_size);
    const seededGroups = this.snakeSeed(players, groupCount);

    // Delete existing groups first
    await this.sb.from('groups').delete().eq('event_id', event.id);

    for (let i = 0; i < seededGroups.length; i++) {
      const groupName = `Group ${String.fromCharCode(65 + i)}`; // A, B, C...
      const { data: group, error: gErr } = await this.sb
        .from('groups')
        .insert({ event_id: event.id, name: groupName })
        .select()
        .single();
      if (gErr) throw gErr;

      const groupPlayers = seededGroups[i].map((p, j) => ({
        group_id: group.id,
        player_id: p.id,
        seed_in_group: j + 1,
      }));
      const { error: gpErr } = await this.sb.from('group_players').insert(groupPlayers);
      if (gpErr) throw gpErr;

      // Generate round-robin matches for this group
      await this.generateRoundRobinMatches(event.id, group.id, seededGroups[i]);
    }
  }

  /**
   * Sort group standings applying tiebreaker rules in order:
   * 1. Points (desc)
   * For ties on points:
   *   2. Head-to-head wins among tied players
   *   3. Set ratio among tied players (sets won / sets lost)
   *   4. Point ratio among tied players (individual game points won / lost)
   *   5. Overall set ratio (all group matches)
   *   6. Overall point ratio (all group matches)
   */
  sortStandingsWithTiebreak(standings: GroupStanding[], groupMatches: Match[]): GroupStanding[] {
    const byGroup = new Map<string, GroupStanding[]>();
    for (const s of standings) {
      if (!byGroup.has(s.group_id)) byGroup.set(s.group_id, []);
      byGroup.get(s.group_id)!.push(s);
    }
    const result: GroupStanding[] = [];
    for (const [groupId, groupStandings] of byGroup) {
      const completedMatches = groupMatches.filter(m => m.group_id === groupId && m.status === 'completed');
      result.push(...this.sortGroupWithTiebreak(groupStandings, completedMatches));
    }
    return result;
  }

  private sortGroupWithTiebreak(standings: GroupStanding[], matches: Match[]): GroupStanding[] {
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    const result: GroupStanding[] = [];
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && sorted[j].points === sorted[i].points) j++;
      const tieGroup = sorted.slice(i, j);
      result.push(...(tieGroup.length === 1 ? tieGroup : this.breakTie(tieGroup, matches)));
      i = j;
    }
    return result;
  }

  private breakTie(tied: GroupStanding[], allMatches: Match[]): GroupStanding[] {
    const tiedIds = new Set(tied.map(s => s.player_id));
    const h2hMatches = allMatches.filter(m =>
      m.player1_id && m.player2_id &&
      tiedIds.has(m.player1_id) && tiedIds.has(m.player2_id)
    );

    const h2hWins = (id: string) =>
      h2hMatches.filter(m => m.winner_id === id).length;

    const safeRatio = (won: number, lost: number) =>
      lost === 0 ? (won > 0 ? Number.MAX_SAFE_INTEGER : 0) : won / lost;

    const setRatio = (id: string, src: Match[]) => {
      let w = 0, l = 0;
      for (const m of src) {
        for (const s of m.sets ?? []) {
          if (m.player1_id === id) { if (s.score_p1 > s.score_p2) w++; else if (s.score_p2 > s.score_p1) l++; }
          if (m.player2_id === id) { if (s.score_p2 > s.score_p1) w++; else if (s.score_p1 > s.score_p2) l++; }
        }
      }
      return safeRatio(w, l);
    };

    const pointRatio = (id: string, src: Match[]) => {
      let w = 0, l = 0;
      for (const m of src) {
        for (const s of m.sets ?? []) {
          if (m.player1_id === id) { w += s.score_p1; l += s.score_p2; }
          if (m.player2_id === id) { w += s.score_p2; l += s.score_p1; }
        }
      }
      return safeRatio(w, l);
    };

    return [...tied].sort((a, b) => {
      const aid = a.player_id, bid = b.player_id;
      return (h2hWins(bid) - h2hWins(aid))
          || (setRatio(bid, h2hMatches) - setRatio(aid, h2hMatches))
          || (pointRatio(bid, h2hMatches) - pointRatio(aid, h2hMatches))
          || (setRatio(bid, allMatches) - setRatio(aid, allMatches))
          || (pointRatio(bid, allMatches) - pointRatio(aid, allMatches));
    });
  }

  /**
   * Assign a newly created player to the group with the fewest members,
   * then generate the new round-robin matches (new player vs every existing member).
   * Returns the name of the group they were added to.
   */
  async addPlayerToSmallestGroup(eventId: string, newPlayer: Player): Promise<string> {
    // Fetch groups
    const { data: groups, error: gErr } = await this.sb
      .from('groups')
      .select('id, name')
      .eq('event_id', eventId)
      .order('name');
    if (gErr) throw gErr;
    if (!groups || groups.length === 0) return '';

    // Fetch player IDs per group directly (avoids join key mismatch)
    const { data: allGroupPlayers, error: gpFetchErr } = await this.sb
      .from('group_players')
      .select('group_id, player_id')
      .in('group_id', groups.map(g => g.id));
    if (gpFetchErr) throw gpFetchErr;

    const playersByGroup = new Map<string, string[]>();
    for (const g of groups) playersByGroup.set(g.id, []);
    for (const gp of (allGroupPlayers ?? [])) {
      playersByGroup.get(gp.group_id)?.push(gp.player_id);
    }

    // Find group with fewest members (first group wins ties)
    let smallestGroup = groups[0];
    let smallestCount = playersByGroup.get(groups[0].id)!.length;
    for (const g of groups) {
      const count = playersByGroup.get(g.id)!.length;
      if (count < smallestCount) {
        smallestCount = count;
        smallestGroup = g;
      }
    }

    const existingPlayerIds = playersByGroup.get(smallestGroup.id)!;

    // Add player to group
    const { error: gpErr } = await this.sb.from('group_players').insert({
      group_id: smallestGroup.id,
      player_id: newPlayer.id,
      seed_in_group: existingPlayerIds.length + 1,
    });
    if (gpErr) throw gpErr;

    // Generate new matches: new player vs each existing group member
    if (existingPlayerIds.length > 0) {
      const { data: lastMatch } = await this.sb
        .from('matches')
        .select('match_number')
        .eq('group_id', smallestGroup.id)
        .order('match_number', { ascending: false })
        .limit(1);

      let matchNumber = (lastMatch?.[0]?.match_number ?? 0) + 1;

      const newMatches = existingPlayerIds.map(pid => ({
        event_id: eventId,
        group_id: smallestGroup.id,
        stage: 'group',
        round: 1,
        match_number: matchNumber++,
        player1_id: pid,
        player2_id: newPlayer.id,
        status: 'pending',
      }));

      const { error: mErr } = await this.sb.from('matches').insert(newMatches);
      if (mErr) throw mErr;
    }

    return smallestGroup.name;
  }

  /** Generate all round-robin matches for a group */
  private async generateRoundRobinMatches(eventId: string, groupId: string, players: Player[]) {
    const matches = [];
    let matchNumber = 1;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          event_id: eventId,
          group_id: groupId,
          stage: 'group',
          round: 1,
          match_number: matchNumber++,
          player1_id: players[i].id,
          player2_id: players[j].id,
          status: 'pending',
        });
      }
    }
    const { error } = await this.sb.from('matches').insert(matches);
    if (error) throw error;
  }
}
