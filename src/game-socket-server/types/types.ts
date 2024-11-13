export interface GameState {
  lobbyCode: string;
  isStarted: boolean;
  isPaused: boolean;
  currentRound: number;
  latestRoundResult: LatestRoundResult | null;
  players: Player[];
  winner: Player | null;
  timer: NodeJS.Timeout | null; // Timer for round timeouts
}

export interface GameStatePlayerSnapshot {
  players: Player[];
}

export interface Player {
  socketId: string;
  username: string;
  matchReady: boolean;
  roundReady: boolean;
  latestRoundAction?: LatestRoundAction;
  disconnected: boolean;
  reconnectTimeout?: NodeJS.Timeout;
  cards?: {
    //TODO THIS SHOULD NOT BE OPTIONAL
    activeChampion: ChampionCard;
    championCards: ChampionCard[];
    itemCards: ItemCard[];
  };
}

export interface LatestRoundResult {
  actionsToPlayOut: Action[];
  secondsToNextRound: number;
}

export interface LatestRoundAction {
  abilityCard?: AbilityCard;
  itemCard?: ItemCard;
  swapChampion?: ChampionCard;
}

export interface Action {
  description: string;
  gameState: GameStatePlayerSnapshot;
  playtime: number;
}

export interface ChampionCard {
  cardName: ChampionCardsEnum;
  health: number;
  defense: number;
  strength: number;
  speed: number;
  magic: number;
  abilityCards: AbilityCard[];
}

export interface AbilityCard {
  cardName: AbilityCardsEnum;
  tracker: number;
  trackerTotal: number;
  description: string;
  abilityPoints: number;
}

export interface ItemCard {
  cardName: ItemCardsEnum;
  description: string;
  used: boolean;
}

enum ChampionCardsEnum {
  Fighter = "fighter",
  Wizard = "wizard",
  Ranger = "ranger",
}

enum AbilityCardsEnum {
  AbilityOne = "abilityOne",
  AbilityTwo = "abilityTwo",
  AbilityThree = "abilityThree",
  AbilityFour = "abilityFour",
  AbilityUltimate = "abilityUltimate",
}

enum ItemCardsEnum {
  BasicHealthPotion = "basicHealthPotion",
}
