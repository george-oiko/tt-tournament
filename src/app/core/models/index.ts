// src/app/core/models/index.ts

export type UserRole = 'admin' | 'event_manager' | 'viewer';
export type EventType = 'groups' | 'knockout' | 'groups_knockout';
export type EventStatus = 'draft' | 'active' | 'completed';
export type MatchStage = 'group' | 'knockout' | 'consolation' | 'knockout_plate' | 'consolation_plate';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'walkover';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface TournamentEvent {
  id: string;
  name: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  group_size: number;
  groups_advance: number;
  sets_to_win: number;
  points_per_win: number;
  points_per_loss: number;
  points_per_no_show: number;
  has_consolation: boolean;
  event_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventManager {
  event_id: string;
  user_id: string;
  assigned_at: string;
}

export interface Player {
  id: string;
  event_id: string;
  name: string;
  ranking: number;
  seed_position?: number;
  club?: string;
  email?: string;
  created_by: string;
  created_at: string;
}

export interface Group {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
  players?: GroupPlayer[];
}

export interface GroupPlayer {
  group_id: string;
  player_id: string;
  seed_in_group: number;
  player?: Player;
}

export interface Match {
  id: string;
  event_id: string;
  group_id?: string;
  stage: MatchStage;
  round: number;
  match_number?: number;
  player1_id?: string;
  player2_id?: string;
  winner_id?: string;
  status: MatchStatus;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
  // joined
  player1?: Player;
  player2?: Player;
  winner?: Player;
  sets?: MatchSet[];
}

export interface MatchSet {
  id: string;
  match_id: string;
  set_number: number;
  score_p1: number;
  score_p2: number;
}

export interface GroupStanding {
  group_id: string;
  event_id: string;
  group_name: string;
  player_id: string;
  player_name: string;
  ranking: number;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

// DTO for creating/updating
export interface CreateEventDto {
  name: string;
  description?: string;
  type: EventType;
  group_size: number;
  groups_advance: number;
  sets_to_win: number;
  points_per_win: number;
  points_per_loss: number;
  points_per_no_show: number;
  has_consolation: boolean;
  event_date?: string;
}

export interface CreatePlayerDto {
  event_id: string;
  name: string;
  ranking?: number;
  club?: string;
  email?: string;
}

export interface ScoreEntryDto {
  match_id: string;
  sets: { set_number: number; score_p1: number; score_p2: number }[];
}
