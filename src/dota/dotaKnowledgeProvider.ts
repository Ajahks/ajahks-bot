import abilities from "dotaconstants/build/abilities.json"
import heroAbilties from "dotaconstants/build/hero_abilities.json"
import heroes from "dotaconstants/build/heroes.json"
import patchOverview from "dotaconstants/build/patch.json"
import patchDetails from "dotaconstants/build/patchnotes.json"
import items from "dotaconstants/build/items.json"

export function getAllCurrentDotaStats() {
    const intro = "Here are all the dota stats i know of in JSON format: \n"
    return intro +
        getAllAbilities() +
        getAllHeroAbilities() +
        getAllHeroStats() +
        getItemDetails() +
        getPatchOverview() +
        getPatchDetails()
}

export function getAllAbilities(): string {
    const intro = "\nHere is the Ability JSON. It contains all the abilities with their stats in JSON format:\n"
    return intro + JSON.stringify(abilities)
}

export function getAllHeroAbilities(): string {
    const intro = "\nHere is the HeroAbility JSON. It contains a mapping of each heroes ability names (the stats of the abilities can be found in the ability JSON)\n"
    return intro + JSON.stringify(heroAbilties)
}

export function getAllHeroStats(): string {
    const intro = "\nHere is the HeroStats JSON. It contains the stats of each hero in dota in JSON format. Users may ask for heroes in their localized name:\n"
    return intro + JSON.stringify(heroes)
}

export function getPatchOverview(): string {
    const intro = "\nHere is the PatchOverview JSON. It contains high level details on each patch: \n"
    return intro + JSON.stringify(patchOverview)
}

export function getPatchDetails(): string {
    const intro = "\nHere is the PatchDetails JSON. It contains the patch notes that include changes to each item and hero in JSON format: \n"
    return intro + JSON.stringify(patchDetails)
}

export function getItemDetails(): string {
    const intro = "\nHere is the Item JSON. It contains the stats on each item in dota in JSON format: \n"
    return intro + JSON.stringify(items)
}
