import { GOODS } from '../data/goods';

export interface MarketCrisis {
  id: string;
  goodId: string;
  title: string;
  description: string;
  severity: number;
  remainingTicks: number;
  totalTicks: number;
  chainReactionAffected: string[];
}

export interface CrisisGoodState {
  consecutiveDeclineTicks: number;
}

export const CRISIS_TRIGGER_DECLINE_TICKS = 10;
export const CRISIS_MIN_DURATION = 20;
export const CRISIS_MAX_DURATION = 30;
export const CRISIS_PRICE_DROP_MULTIPLIER = 0.4;
export const CRISIS_CHAIN_REACTION_CHANCE = 0.5;

const CRISIS_TEMPLATES: Record<string, { titles: string[]; descriptions: string[] }> = {
  ore: {
    titles: ['矿石产能过剩危机', '矿业泡沫破裂'],
    descriptions: ['大量矿业公司盲目扩产，导致矿石市场供过于求，价格暴跌。'],
  },
  crystal: {
    titles: ['水晶星产能过剩', '能量水晶市场崩盘'],
    descriptions: ['新发现的水晶矿脉导致供应激增，能量水晶价格一落千丈。'],
  },
  weapons: {
    titles: ['军火市场萧条', '和平条约冲击军工业'],
    descriptions: ['星际和平协议签署后，武器需求大幅下降，军工业陷入危机。'],
  },
  medicine: {
    titles: ['医疗物资滞销', '医药行业产能过剩'],
    descriptions: ['各大药企集中投产，医疗物资供应远超需求，价格腰斩。'],
  },
  food: {
    titles: ['食品价格崩盘', '农业大丰收危机'],
    descriptions: ['农业星球迎来史无前例的大丰收，食品价格暴跌。'],
  },
  luxury: {
    titles: ['奢侈品市场寒冬', '高端消费泡沫破裂'],
    descriptions: ['经济下行导致高端消费锐减，奢侈品行业遭受重创。'],
  },
};

export const createInitialCrisisStates = (
  goodIds: string[]
): Record<string, CrisisGoodState> => {
  const states: Record<string, CrisisGoodState> = {};
  for (const id of goodIds) {
    states[id] = { consecutiveDeclineTicks: 0 };
  }
  return states;
};

export const createCrisisForGood = (goodId: string): MarketCrisis => {
  const good = GOODS.find((g) => g.id === goodId);
  const templates = CRISIS_TEMPLATES[goodId] ?? {
    titles: [`${good?.name ?? goodId}市场危机`],
    descriptions: ['市场出现严重动荡，价格剧烈波动。'],
  };
  const titleIdx = Math.floor(Math.random() * templates.titles.length);
  const descIdx = Math.floor(Math.random() * templates.descriptions.length);
  const duration =
    CRISIS_MIN_DURATION + Math.floor(Math.random() * (CRISIS_MAX_DURATION - CRISIS_MIN_DURATION + 1));

  return {
    id: `crisis-${goodId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    goodId,
    title: templates.titles[titleIdx],
    description: templates.descriptions[descIdx],
    severity: 0.6 + Math.random() * 0.4,
    remainingTicks: duration,
    totalTicks: duration,
    chainReactionAffected: [],
  };
};

const getChainReactionCandidates = (
  crisisGoodId: string,
  activeCrises: MarketCrisis[]
): string[] => {
  const crisisIds = new Set(activeCrises.map((c) => c.goodId));
  return GOODS.filter((g) => g.id !== crisisGoodId && !crisisIds.has(g.id)).map((g) => g.id);
};

export const triggerChainReaction = (
  crisis: MarketCrisis,
  activeCrises: MarketCrisis[]
): MarketCrisis[] => {
  const newCrises: MarketCrisis[] = [];
  const candidates = getChainReactionCandidates(crisis.goodId, activeCrises);

  for (const candidateId of candidates) {
    if (Math.random() < CRISIS_CHAIN_REACTION_CHANCE * crisis.severity * 0.5) {
      const chainCrisis = createCrisisForGood(candidateId);
      chainCrisis.severity *= 0.6;
      chainCrisis.totalTicks = Math.floor(chainCrisis.totalTicks * 0.7);
      chainCrisis.remainingTicks = chainCrisis.totalTicks;
      newCrises.push(chainCrisis);
      crisis.chainReactionAffected.push(candidateId);
    }
  }

  return newCrises;
};

export const updateCrisisStates = (
  crisisStates: Record<string, CrisisGoodState>,
  trendValues: Record<string, number>,
  crises: MarketCrisis[]
): {
  states: Record<string, CrisisGoodState>;
  newCrises: MarketCrisis[];
} => {
  const newStates: Record<string, CrisisGoodState> = {};
  const newCrises: MarketCrisis[] = [];
  const activeCrisisIds = new Set(crises.map((c) => c.goodId));

  for (const goodId of Object.keys(trendValues)) {
    const prevState = crisisStates[goodId] ?? { consecutiveDeclineTicks: 0 };
    const currentTrend = trendValues[goodId];

    let consecutiveTicks = prevState.consecutiveDeclineTicks;
    if (currentTrend < 0) {
      consecutiveTicks += 1;
    } else {
      consecutiveTicks = 0;
    }

    if (
      consecutiveTicks >= CRISIS_TRIGGER_DECLINE_TICKS &&
      !activeCrisisIds.has(goodId)
    ) {
      const crisis = createCrisisForGood(goodId);
      newCrises.push(crisis);
      activeCrisisIds.add(goodId);
      consecutiveTicks = 0;
    }

    newStates[goodId] = {
      consecutiveDeclineTicks: consecutiveTicks,
    };
  }

  return { states: newStates, newCrises };
};

export const tickCrises = (crises: MarketCrisis[]): { active: MarketCrisis[]; ended: MarketCrisis[] } => {
  const active: MarketCrisis[] = [];
  const ended: MarketCrisis[] = [];

  for (const crisis of crises) {
    const remaining = crisis.remainingTicks - 1;
    if (remaining <= 0) {
      ended.push(crisis);
    } else {
      active.push({ ...crisis, remainingTicks: remaining });
    }
  }

  return { active, ended };
};

export const getCrisisPriceMultiplier = (goodId: string, crises: MarketCrisis[]): number => {
  let multiplier = 1;
  for (const crisis of crises) {
    if (crisis.goodId === goodId) {
      const progress = 1 - crisis.remainingTicks / crisis.totalTicks;
      const recoveryFactor = progress > 0.7 ? (progress - 0.7) / 0.3 : 0;
      const drop = CRISIS_PRICE_DROP_MULTIPLIER * crisis.severity * (1 - recoveryFactor * 0.5);
      multiplier *= 1 - drop;
    }
  }
  return multiplier;
};
