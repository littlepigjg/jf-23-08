import { GOODS } from '../data/goods';
import { PLANETS } from '../data/planets';
import type { Planet, PlanetType } from '../types/game';

export interface GoodTrend {
  value: number;
  momentum: number;
}

export type PlanetSD = Record<string, number>;

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
  lastTrendValue: number;
}

export interface PriceMarketState {
  version: number;
  lastTickAt: number;
  globalTrends: Record<string, GoodTrend>;
  planetSupplyDemand: Record<string, PlanetSD>;
  crises: MarketCrisis[];
  crisisStates: Record<string, CrisisGoodState>;
}

export const MARKET_STATE_VERSION = 3;

export const CRISIS_TRIGGER_DECLINE_TICKS = 10;
export const CRISIS_MIN_DURATION = 20;
export const CRISIS_MAX_DURATION = 30;
export const CRISIS_PRICE_DROP_MULTIPLIER = 0.4;
export const CRISIS_CHAIN_REACTION_CHANCE = 0.5;
export const TICK_MINUTES = 1;
export const MAX_OFFLINE_TICKS = 60 * 24 * 3;

const planetTypeMultiplier: Record<PlanetType, Record<string, number>> = {
  home: { food: 1.3, luxury: 1.5, weapons: 1.2, medicine: 1.1, ore: 0.9, crystal: 0.95 },
  resource: { ore: 0.6, crystal: 0.7, food: 1.4, luxury: 1.6, medicine: 1.3, weapons: 1.3 },
  industrial: { ore: 1.5, crystal: 1.3, weapons: 0.7, food: 1.2, luxury: 1.2, medicine: 1.0 },
  trade: { ore: 1.0, crystal: 1.0, weapons: 1.0, food: 1.0, luxury: 0.85, medicine: 0.9 },
};

const planetTypeNaturalSD: Record<PlanetType, Record<string, number>> = {
  home: { food: 0.4, luxury: 0.5, weapons: 0.2, medicine: 0.15, ore: -0.15, crystal: -0.1 },
  resource: { ore: -0.55, crystal: -0.5, food: 0.35, luxury: 0.5, medicine: 0.3, weapons: 0.3 },
  industrial: { ore: 0.5, crystal: 0.4, weapons: -0.5, food: 0.2, luxury: 0.2, medicine: 0.05 },
  trade: { ore: 0, crystal: 0, weapons: 0, food: 0, luxury: -0.3, medicine: -0.2 },
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const createInitialMarketState = (
  now: number = Date.now()
): PriceMarketState => {
  const globalTrends: PriceMarketState['globalTrends'] = {};
  const crisisStates: PriceMarketState['crisisStates'] = {};
  for (const g of GOODS) {
    const initValue = (Math.random() - 0.5) * 0.4;
    globalTrends[g.id] = {
      value: initValue,
      momentum: (Math.random() - 0.5) * 0.05,
    };
    crisisStates[g.id] = {
      consecutiveDeclineTicks: 0,
      lastTrendValue: initValue,
    };
  }

  const planetSupplyDemand: PriceMarketState['planetSupplyDemand'] = {};
  for (const p of PLANETS) {
    const sd: PlanetSD = {};
    const natural = planetTypeNaturalSD[p.type] ?? {};
    for (const g of GOODS) {
      const base = natural[g.id] ?? 0;
      sd[g.id] = clamp(base + (Math.random() - 0.5) * 0.2, -1, 1);
    }
    planetSupplyDemand[p.id] = sd;
  }

  return {
    version: MARKET_STATE_VERSION,
    lastTickAt: now,
    globalTrends,
    planetSupplyDemand,
    crises: [],
    crisisStates,
  };
};

const tickTrend = (trend: GoodTrend): GoodTrend => {
  const shock = (Math.random() - 0.5) * 0.06;
  let momentum = clamp(trend.momentum * 0.88 + shock, -0.08, 0.08);
  const value = clamp(trend.value + momentum, -1, 1);
  if (Math.abs(value) > 0.95) momentum *= -0.5;
  return { value, momentum };
};

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

const createCrisisForGood = (goodId: string): MarketCrisis => {
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

const triggerChainReaction = (
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

const MIN_DECLINE_DELTA = 0.005;

const updateCrisisStates = (
  crisisStates: Record<string, CrisisGoodState>,
  trends: Record<string, GoodTrend>,
  crises: MarketCrisis[]
): {
  states: Record<string, CrisisGoodState>;
  newCrises: MarketCrisis[];
} => {
  const newStates: Record<string, CrisisGoodState> = {};
  const newCrises: MarketCrisis[] = [];
  const activeCrisisIds = new Set(crises.map((c) => c.goodId));

  for (const goodId of Object.keys(trends)) {
    const prevState = crisisStates[goodId] ?? {
      consecutiveDeclineTicks: 0,
      lastTrendValue: 0,
    };
    const currentTrend = trends[goodId].value;
    const declineDelta = prevState.lastTrendValue - currentTrend;

    let consecutiveTicks = prevState.consecutiveDeclineTicks;
    if (declineDelta > MIN_DECLINE_DELTA) {
      consecutiveTicks += 1;
    } else if (declineDelta < -MIN_DECLINE_DELTA) {
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
      lastTrendValue: currentTrend,
    };
  }

  return { states: newStates, newCrises };
};

const tickCrises = (crises: MarketCrisis[]): { active: MarketCrisis[]; ended: MarketCrisis[] } => {
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

const getCrisisPriceMultiplier = (goodId: string, crises: MarketCrisis[]): number => {
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

const tickPlanetSD = (planet: Planet, sd: PlanetSD): PlanetSD => {
  const natural = planetTypeNaturalSD[planet.type] ?? {};
  const next: PlanetSD = {};
  for (const g of GOODS) {
    const cur = sd[g.id] ?? 0;
    const nat = natural[g.id] ?? 0;
    const pull = (nat - cur) * 0.035;
    const noise = (Math.random() - 0.5) * 0.045;
    next[g.id] = clamp(cur + pull + noise, -1, 1);
  }
  return next;
};

export interface TickMarketResult {
  state: PriceMarketState;
  newCrises: MarketCrisis[];
  endedCrises: MarketCrisis[];
}

export const tickMarketState = (
  state: PriceMarketState,
  ticks: number,
  now: number = Date.now()
): PriceMarketState => {
  return tickMarketStateWithEvents(state, ticks, now).state;
};

export const tickMarketStateWithEvents = (
  state: PriceMarketState,
  ticks: number,
  now: number = Date.now()
): TickMarketResult => {
  if (ticks <= 0) {
    return { state: { ...state, lastTickAt: now }, newCrises: [], endedCrises: [] };
  }

  let trends = { ...state.globalTrends };
  let sdMap = { ...state.planetSupplyDemand };
  let crises = [...(state.crises ?? [])];
  let crisisStates = { ...(state.crisisStates ?? {}) };
  const allNewCrises: MarketCrisis[] = [];
  const allEndedCrises: MarketCrisis[] = [];

  for (let i = 0; i < ticks; i++) {
    const crisisGoodMap = new Map(crises.map((c) => [c.goodId, c]));

    const nextTrends: PriceMarketState['globalTrends'] = {};
    for (const gid of Object.keys(trends)) {
      let trend = tickTrend(trends[gid]);
      const crisis = crisisGoodMap.get(gid);
      if (crisis) {
        const pull = -0.015 * crisis.severity;
        const newMomentum = clamp(trend.momentum + pull, -0.08, 0.08);
        const newValue = clamp(trend.value + pull, -1, 1);
        trend = { value: newValue, momentum: newMomentum };
      }
      nextTrends[gid] = trend;
    }
    trends = nextTrends;

    const nextSD: PriceMarketState['planetSupplyDemand'] = {};
    for (const planet of PLANETS) {
      const planetSD = tickPlanetSD(planet, sdMap[planet.id] ?? {});
      for (const [gid, crisis] of crisisGoodMap) {
        const cur = planetSD[gid] ?? 0;
        const oversupplyPull = -0.02 * crisis.severity;
        planetSD[gid] = clamp(cur + oversupplyPull, -1, 1);
      }
      nextSD[planet.id] = planetSD;
    }
    sdMap = nextSD;

    const { active: activeCrises, ended } = tickCrises(crises);
    crises = activeCrises;
    allEndedCrises.push(...ended);

    const crisisUpdate = updateCrisisStates(crisisStates, trends, crises);
    crisisStates = crisisUpdate.states;

    if (crisisUpdate.newCrises.length > 0) {
      const chainReactions: MarketCrisis[] = [];
      for (const newCrisis of crisisUpdate.newCrises) {
        const chains = triggerChainReaction(newCrisis, [
          ...crises,
          ...crisisUpdate.newCrises,
          ...chainReactions,
        ]);
        chainReactions.push(...chains);
      }
      const allNew = [...crisisUpdate.newCrises, ...chainReactions];
      crises.push(...allNew);
      allNewCrises.push(...allNew);
    }
  }

  return {
    state: {
      ...state,
      lastTickAt: now,
      globalTrends: trends,
      planetSupplyDemand: sdMap,
      crises,
      crisisStates,
    },
    newCrises: allNewCrises,
    endedCrises: allEndedCrises,
  };
};

export const computePrice = (
  goodId: string,
  planetId: string,
  market: PriceMarketState,
  randomness: number = 0.08
): number => {
  const good = GOODS.find((g) => g.id === goodId);
  const planet = PLANETS.find((p) => p.id === planetId);
  if (!good || !planet) return 0;

  const typeMult = planetTypeMultiplier[planet.type]?.[goodId] ?? 1;
  const sd = market.planetSupplyDemand[planetId]?.[goodId] ?? 0;
  const trend = market.globalTrends[goodId]?.value ?? 0;
  const jitter = 1 + (Math.random() - 0.5) * 2 * randomness;
  const crisisMult = getCrisisPriceMultiplier(goodId, market.crises ?? []);

  const sdFactor = 1 + sd * 0.65;
  const trendFactor = 1 + trend * 0.3;

  const raw =
    good.basePrice * typeMult * sdFactor * trendFactor * crisisMult * jitter;

  return Math.max(1, Math.round(raw));
};

export const regeneratePlanetPricesFromMarket = (
  market: PriceMarketState
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};
  for (const p of PLANETS) {
    out[p.id] = {};
    for (const g of GOODS) {
      out[p.id][g.id] = computePrice(g.id, p.id, market);
    }
  }
  return out;
};

export const regeneratePartialPrices = (
  existing: Record<string, Record<string, number>>,
  planetIds: string[],
  market: PriceMarketState
): Record<string, Record<string, number>> => {
  const result = { ...existing };
  for (const pid of planetIds) {
    result[pid] = {};
    for (const g of GOODS) {
      result[pid][g.id] = computePrice(g.id, pid, market);
    }
  }
  return result;
};

export const getTicksForOffline = (
  lastTickAt: number,
  now: number = Date.now()
): number => {
  const minutes = Math.max(0, (now - lastTickAt) / 1000 / 60);
  const ticks = Math.floor(minutes / TICK_MINUTES);
  return Math.min(MAX_OFFLINE_TICKS, ticks);
};

export const formatPrice = (price: number): string => {
  return `₵ ${price.toLocaleString()}`;
};

export const describeTrend = (trendValue: number): { label: string; color: string } => {
  if (trendValue > 0.35) return { label: '大涨 📈', color: 'text-rose-400' };
  if (trendValue > 0.12) return { label: '上涨 ↗', color: 'text-rose-300' };
  if (trendValue > -0.12) return { label: '平稳 →', color: 'text-slate-400' };
  if (trendValue > -0.35) return { label: '下跌 ↘', color: 'text-emerald-300' };
  return { label: '暴跌 📉', color: 'text-emerald-400' };
};

export const describeSD = (sdValue: number): { label: string; color: string } => {
  if (sdValue > 0.35) return { label: '缺货 🔥', color: 'text-rose-400' };
  if (sdValue > 0.1) return { label: '偏紧', color: 'text-amber-300' };
  if (sdValue > -0.1) return { label: '正常', color: 'text-slate-400' };
  if (sdValue > -0.35) return { label: '充足', color: 'text-cyan-300' };
  return { label: '过剩 💧', color: 'text-emerald-400' };
};
