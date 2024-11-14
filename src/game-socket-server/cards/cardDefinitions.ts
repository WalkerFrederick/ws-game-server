import { AbilityCardsEnum, ChampionCardsEnum, ItemCardsEnum } from "../types/types";

const FighterChampionCard = {
    cardName: ChampionCardsEnum.Fighter,
    health: 20,
    defense: 14,
    strength: 3,
    speed: 3,
    magic: 3,
    abilityCards: [
        {
            cardName: AbilityCardsEnum.AbilityOne,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityTwo,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityThree,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityFour,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityUltimate,
            tracker: 0,
            trackerTotal: 5,
            description: "Deal 1 Damage",
            abilityPoints: 1,
        },
    ]
}

const WizardChampionCard = {
    cardName: ChampionCardsEnum.Ranger,
    health: 20,
    defense: 14,
    strength: 3,
    speed: 3,
    magic: 3,
    abilityCards: [
        {
            cardName: AbilityCardsEnum.AbilityOne,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityTwo,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityThree,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityFour,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityUltimate,
            tracker: 0,
            trackerTotal: 5,
            description: "Deal 1 Damage",
            abilityPoints: 1,
        },
    ]
}

const RangerChampionCard = {
    cardName: ChampionCardsEnum.Ranger,
    health: 20,
    defense: 14,
    strength: 3,
    speed: 3,
    magic: 3,
    abilityCards: [
        {
            cardName: AbilityCardsEnum.AbilityOne,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityTwo,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityThree,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityFour,
            tracker: 0,
            trackerTotal: 0,
            description: "Deal 1 Damage",
            abilityPoints: 3,
        },
        {
            cardName: AbilityCardsEnum.AbilityUltimate,
            tracker: 0,
            trackerTotal: 5,
            description: "Deal 1 Damage",
            abilityPoints: 1,
        },
    ]
}

export const EXAMPLE_DECK = {
    activeChampion: FighterChampionCard,
    championCards: [WizardChampionCard, RangerChampionCard],
    itemCards: [
        {
            cardName: ItemCardsEnum.BasicHealthPotion,
            description: "Restores //1d6 health",
            used: false,
        },
    ],
};