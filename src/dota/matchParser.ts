import {
    DotaMatchDataFull,
    DotaPlayerMatchDataSummary,
    OpenDotaMatchRawData,
    OpenDotaPlayerMatchRawData
} from "./matchDataTypes";
import {heroes} from "dotaconstants/index";
import {GameCloseness, Team} from "./types";

export function parseRawPlayerMatchData(matchData: OpenDotaPlayerMatchRawData): DotaPlayerMatchDataSummary {
    let team: Team = Team.Radiant
    let didWin: boolean = false
    if (matchData.player_slot != null) {
        team = determineTeam(matchData.player_slot)
        didWin = determineWin(team, matchData.radiant_win)
    }

    const hero = convertHeroIdToString(matchData.hero_id)

    return {
        matchId: matchData.match_id,
        didWin: didWin,
        hero: hero,
        durationSeconds: matchData.duration,
        kills: matchData.kills,
        deaths: matchData.deaths,
        gameStartTimeUnix: matchData.start_time,
        team: team,
    }
}

// Gets more info on the match by calling the match API
export function parseRawPlayerMatchDataAndRawPlayerData(playerMatchData: OpenDotaPlayerMatchRawData, matchData: OpenDotaMatchRawData): DotaMatchDataFull {
    let team: Team = Team.Radiant
    if (playerMatchData.player_slot != null) {
        team = determineTeam(playerMatchData.player_slot)
    }
    const didWin = determineWin(team, playerMatchData.radiant_win)
    return {
        matchId: playerMatchData.match_id,
        didWin: didWin,
        team: team,
        durationSeconds: playerMatchData.duration,
        gameStartTimeUnix: playerMatchData.start_time,
        hero: convertHeroIdToString(playerMatchData.hero_id),
        kills: playerMatchData.kills,
        deaths: playerMatchData.deaths,
        assists: playerMatchData.assists,
        skill: playerMatchData.skill,
        radiantScore: matchData.radiant_score,
        direScore: matchData.dire_score,
        gameCloseness: determineGameCloseness(team, didWin, matchData.radiant_gold_adv, playerMatchData.duration)
    }
}

function determineTeam(playerSlot: number) {
    if (playerSlot <= 127) {
        return Team.Radiant
    } else {
        return Team.Dire
    }
}

function determineWin(team: Team, radiantWin: boolean | null): boolean {
    return radiantWin != null && (team == Team.Radiant && radiantWin || team == Team.Dire && !radiantWin);
}

function convertHeroIdToString(heroId: number): string {
    const heroKey = heroId.toString() as keyof typeof heroes;
    return heroes[heroKey]["localized_name"]
}

function determineGameCloseness(team: Team, didWin: boolean, radiantGoldAdvantage: number[] | null, duration: number): GameCloseness {
    if (radiantGoldAdvantage == null || radiantGoldAdvantage.length == 0) {
        return GameCloseness.UNKNOWN
    }

    // 15K GOLD difference in an average of 30 min game is the threshold
    // Threshold lowers when game is less than 30m, and increases when higher than 30 mins
    const closenessThreshold = 15000 * (duration / 1800)

    const goldAdvantage = radiantGoldAdvantage.map((advantage: number) => {
        if (team == Team.Dire) {
            return advantage * -1
        }
        return advantage
    });

    const maxDisadvantage = Math.min(...goldAdvantage) * -1;
    const maxAdvantage = Math.max(...goldAdvantage);

    if (maxDisadvantage > closenessThreshold && didWin) {
        return GameCloseness.COMEBACK;
    }

    if (maxAdvantage > closenessThreshold && !didWin) {
        return GameCloseness.THROW;
    }

    if (maxAdvantage > closenessThreshold && didWin) {
        return GameCloseness.STOMP_WIN
    }

    if (maxDisadvantage > closenessThreshold && !didWin) {
        return GameCloseness.STOMP_LOSS
    }

    return GameCloseness.CLOSE
}