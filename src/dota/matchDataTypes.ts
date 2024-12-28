// match data from player api
import {GameCloseness, Team} from "./types";

export interface OpenDotaPlayerMatchRawData {
    readonly match_id: number;
    readonly player_slot: number | null;
    readonly radiant_win: boolean | null;
    readonly duration: number;
    readonly game_mode: number;
    readonly lobby_type: number;
    readonly hero_id: number;
    readonly start_time: number;
    readonly version: number | null;
    readonly kills: number;
    readonly deaths: number;
    readonly assists: number;
    readonly skill: number | null;
    readonly average_rank: number | null;
    readonly leaver_status: number;
    readonly party_size: number;
    readonly hero_variant: number;
}

// match data from match api
export interface OpenDotaMatchRawData {
    readonly match_id: number;
    readonly dire_score: number;
    readonly duration: number;
    readonly first_blood_time: number;
    readonly game_mode: number;
    readonly radiant_gold_adv: number[];
    readonly radiant_score: number;
    readonly radiant_win: boolean;
    readonly radiant_xp_adv: number[];
    readonly start_time: number;
    readonly teamfights: object[] | null;
    readonly tower_status_dire: number;
    readonly tower_status_radiant: number;
    readonly radiant_team: object;
    readonly dire_team: object;
    readonly skill: number;
}

export interface DotaPlayerMatchDataSummary {
    readonly matchId: number;
    readonly didWin: boolean;
    readonly hero: string;
    readonly durationSeconds: number;
    readonly kills: number;
    readonly deaths: number;
    readonly gameStartTimeUnix: number;
    readonly team: Team;
}

export interface DotaMatchDataFull {
    readonly matchId: number;
    readonly didWin: boolean;
    readonly hero: string;
    readonly team: Team;
    readonly durationSeconds: number;
    readonly kills: number;
    readonly deaths: number;
    readonly assists: number;
    readonly skill: number | null;
    readonly gameStartTimeUnix: number;
    readonly radiantScore: number;
    readonly direScore: number;
    readonly gameCloseness: GameCloseness;
}