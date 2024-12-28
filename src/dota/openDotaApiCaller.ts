import {
	DotaMatchDataFull,
	DotaPlayerMatchDataSummary,
	OpenDotaMatchRawData,
	OpenDotaPlayerMatchRawData
} from "./matchDataTypes";
import {parseRawPlayerMatchData, parseRawPlayerMatchDataAndRawPlayerData} from "./matchParser";

export async function getDotaLastMatchesSummary(): Promise<DotaPlayerMatchDataSummary[]> {
	return fetch('https://api.opendota.com/api/players/73559043/recentMatches').then(async res => {
		const response: OpenDotaPlayerMatchRawData[] = await res.json()
		return response.map((rawData: OpenDotaPlayerMatchRawData) => parseRawPlayerMatchData(rawData)).slice(0, 10)
	});
}

async function getDotaLastMatchesRaw(): Promise<OpenDotaPlayerMatchRawData[]> {
	return fetch('https://api.opendota.com/api/players/73559043/recentMatches').then(async res => {
		return await res.json()
	});
}

export async function getLastDotaMatchData(): Promise<DotaMatchDataFull> {
	const lastDotaMatches = await getDotaLastMatchesRaw()
	return fetch(`https://api.opendota.com/api/matches/${lastDotaMatches[0].match_id}`).then(async res => {
		const response: OpenDotaMatchRawData = await res.json()
		return parseRawPlayerMatchDataAndRawPlayerData(lastDotaMatches[0], response)
	});
}