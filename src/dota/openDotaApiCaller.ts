import {
	DotaMatchDataFull,
	DotaPlayerMatchDataSummary,
	OpenDotaMatchRawData,
	OpenDotaPlayerMatchRawData
} from "./matchDataTypes";
import {parseRawPlayerMatchData, parseRawPlayerMatchDataAndRawPlayerData} from "./matchParser";
import {PLAYER_IDS_MAP} from "./openai/playerIds";

export async function getDotaLastMatchesSummary(discordUsername: string): Promise<DotaPlayerMatchDataSummary[]> {
	const steamId = PLAYER_IDS_MAP.get(discordUsername);
	if (steamId === undefined) {
		console.log(`No steam id found for discord username ${discordUsername}`)
		return [];
	}
	return fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`).then(async res => {
		const response: OpenDotaPlayerMatchRawData[] = await res.json()
		return response.map((rawData: OpenDotaPlayerMatchRawData) => parseRawPlayerMatchData(rawData)).slice(0, 10)
	});
}

async function getDotaLastMatchesRaw(discordUsername: string): Promise<OpenDotaPlayerMatchRawData[]> {
	const steamId = PLAYER_IDS_MAP.get(discordUsername);
	if (steamId === undefined) {
		console.log(`No steam id found for discord username ${discordUsername}`)
		return [];
	}
	return fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`).then(async res => {
		return await res.json()
	});
}

export async function getLastDotaMatchData(discordUserName: string): Promise<DotaMatchDataFull | null> {
	const lastDotaMatches = await getDotaLastMatchesRaw(discordUserName)
	if (lastDotaMatches.length == 0) {
		return null;
	}
	return fetch(`https://api.opendota.com/api/matches/${lastDotaMatches[0].match_id}`).then(async res => {
		const response: OpenDotaMatchRawData = await res.json()
		return parseRawPlayerMatchDataAndRawPlayerData(lastDotaMatches[0], response)
	});
}