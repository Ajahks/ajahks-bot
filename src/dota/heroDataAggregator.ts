import {AbilityStats, HeroData, HeroStats} from "./data/HeroData";
import {heroes, hero_abilities, abilities} from "dotaconstants";

export function aggregateAllHeroData(): HeroData[] {
    return Object.values(heroes).map(v => {
        const heroName = v.name;
        const stats: HeroStats = v;
        const abilityStats: AbilityStats[] = hero_abilities[heroName as keyof typeof hero_abilities].abilities.map(abilityName => {
            const abilityStats = abilities[abilityName as keyof typeof abilities]
            return {
                name: abilityName,
                stats: abilityStats
            }
        })

        return {
            id: v.id,
            name: v.name,
            primary_attr: v.primary_attr,
            attack_type: v.attack_type,
            roles: v.roles,
            stats: stats,
            abilities: abilityStats
        }
    })
}