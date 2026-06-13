import type {
  NightTravelChoice,
  NightTravelOption,
  NightTravelResult,
  NightPass,
  Player,
  GameEvent,
  Route,
} from '../../shared/types';

export const NIGHT_PASS_COST = 200;
export const NIGHT_PASS_REPUTATION_REQUIRED = 300;
export const NIGHT_PASS_MAX_COUNT = 5;
export const BRIBE_BASE_COST = 150;
export const BRIBE_LAND_MULTIPLIER = 1.5;
export const WAIT_DAWN_HOURS = 6;

export const CURFEW_START_HOUR = 21;
export const CURFEW_END_HOUR = 5;

export const LAND_NIGHT_SPEED_PENALTY = 1.15;
export const WATER_NIGHT_SPEED_BONUS = 0.8;

export const NIGHT_EVENT_PROBABILITY_MULTIPLIER = {
  night_pass: 1.2,
  bribe: 1.5,
  wait_dawn: 0,
  normal: 1,
};

export const isNightTime = (timeOfDay: Player['timeOfDay']): boolean => {
  return timeOfDay === 'night' || timeOfDay === 'evening';
};

export const isCurfewActive = (timeOfDay: Player['timeOfDay'], routeType: 'land' | 'water'): boolean => {
  if (routeType === 'land') {
    return timeOfDay === 'night';
  }
  return false;
};

export const getCurfewRiskLevel = (
  timeOfDay: Player['timeOfDay'],
  routeType: 'land' | 'water',
  choice: NightTravelChoice
): 'low' | 'medium' | 'high' | 'none' => {
  if (!isNightTime(timeOfDay) || choice === 'wait_dawn') return 'none';
  if (choice === 'night_pass') return 'low';
  if (choice === 'bribe') return routeType === 'land' ? 'medium' : 'high';
  return 'none';
};

export const getNightTravelOptions = (
  player: Player,
  routeType: 'land' | 'water'
): NightTravelOption[] => {
  const isNight = isNightTime(player.timeOfDay);

  if (!isNight) {
    return [];
  }

  const nightPass = player.nightPass || { count: 0 };
  const hasPass = nightPass.count > 0;
  const bribeCost = routeType === 'land' 
    ? Math.floor(BRIBE_BASE_COST * BRIBE_LAND_MULTIPLIER) 
    : BRIBE_BASE_COST;

  if (routeType === 'water') {
    return [
      {
        choice: 'night_pass',
        label: '使用夜行牌',
        description: '合法夜航，风险较低，速度提升20%',
        costModifier: 0,
        timeModifier: -0.2,
        reputationModifier: 0,
        riskLevel: 'low',
        available: hasPass,
        reason: hasPass ? undefined : '无夜行牌可用',
      },
      {
        choice: 'bribe',
        label: '打点水巡',
        description: '贿赂沿岸巡防，速度提升25%，但有损声望',
        costModifier: bribeCost,
        timeModifier: -0.25,
        reputationModifier: -10,
        riskLevel: 'high',
        available: player.gold >= bribeCost,
        reason: player.gold < bribeCost ? '金币不足' : undefined,
      },
      {
        choice: 'wait_dawn',
        label: '等到天亮',
        description: '在码头休息等待天亮，无夜航风险，延误6小时',
        costModifier: 0,
        timeModifier: WAIT_DAWN_HOURS,
        reputationModifier: 0,
        riskLevel: 'none',
        available: true,
      },
    ];
  }

  return [
    {
      choice: 'night_pass',
      label: '出示夜行牌',
      description: '合法通行，盘问较少，略微延误，提升声望',
      costModifier: 0,
      timeModifier: 0.1,
      reputationModifier: 5,
      riskLevel: 'low',
      available: hasPass,
      reason: hasPass ? undefined : '无夜行牌可用',
    },
    {
      choice: 'bribe',
      label: '贿赂守门人',
      description: '塞银子通关，费用高，有损声望，可能被盘问',
      costModifier: bribeCost,
      timeModifier: 0.3,
      reputationModifier: -15,
      riskLevel: 'medium',
      available: player.gold >= bribeCost,
      reason: player.gold < bribeCost ? '金币不足' : undefined,
    },
    {
      choice: 'wait_dawn',
      label: '等到天亮',
      description: '在城门外等待天亮，无风险，延误6小时',
      costModifier: 0,
      timeModifier: WAIT_DAWN_HOURS,
      reputationModifier: 0,
      riskLevel: 'none',
      available: true,
    },
  ];
};

export const resolveNightTravel = (
  choice: NightTravelChoice,
  player: Player,
  routeType: 'land' | 'water',
  baseCost: number,
  baseTime: number
): NightTravelResult => {
  if (!choice || !isNightTime(player.timeOfDay)) {
    return {
      choice: null,
      extraCost: 0,
      extraTimeHours: 0,
      reputationChange: 0,
      eventPool: 'normal',
      eventProbabilityMultiplier: 1,
    };
  }

  switch (choice) {
    case 'night_pass': {
      const timeModifier = routeType === 'water' ? WATER_NIGHT_SPEED_BONUS : LAND_NIGHT_SPEED_PENALTY;
      const timeChange = Math.round(baseTime * (timeModifier - 1));
      return {
        choice: 'night_pass',
        extraCost: 0,
        extraTimeHours: timeChange,
        reputationChange: routeType === 'land' ? 5 : 0,
        eventPool: routeType === 'water' ? 'night_water' : 'night_land',
        eventProbabilityMultiplier: NIGHT_EVENT_PROBABILITY_MULTIPLIER.night_pass,
      };
    }
    case 'bribe': {
      const bribeCost = routeType === 'water' 
        ? BRIBE_BASE_COST 
        : Math.floor(BRIBE_BASE_COST * BRIBE_LAND_MULTIPLIER);
      const timeModifier = routeType === 'water' ? 0.75 : 1.3;
      const timeChange = Math.round(baseTime * (timeModifier - 1));
      return {
        choice: 'bribe',
        extraCost: bribeCost,
        extraTimeHours: timeChange,
        reputationChange: routeType === 'water' ? -10 : -15,
        eventPool: routeType === 'water' ? 'night_water' : 'night_land',
        eventProbabilityMultiplier: NIGHT_EVENT_PROBABILITY_MULTIPLIER.bribe,
      };
    }
    case 'wait_dawn': {
      return {
        choice: 'wait_dawn',
        extraCost: 0,
        extraTimeHours: WAIT_DAWN_HOURS,
        reputationChange: 0,
        eventPool: 'normal',
        eventProbabilityMultiplier: 0,
      };
    }
    default:
      return {
        choice: null,
        extraCost: 0,
        extraTimeHours: 0,
        reputationChange: 0,
        eventPool: 'normal',
        eventProbabilityMultiplier: 1,
      };
  }
};

export const canPurchaseNightPass = (player: Player): { can: boolean; reason?: string } => {
  const nightPass = player.nightPass || { count: 0 };
  if (nightPass.count >= NIGHT_PASS_MAX_COUNT) {
    return { can: false, reason: `夜行牌持有数量已达上限(${NIGHT_PASS_MAX_COUNT})` };
  }
  if (player.gold < NIGHT_PASS_COST) {
    return { can: false, reason: '金币不足' };
  }
  if (player.reputation < NIGHT_PASS_REPUTATION_REQUIRED) {
    return { can: false, reason: `声望不足${NIGHT_PASS_REPUTATION_REQUIRED}` };
  }
  return { can: true };
};

export const purchaseNightPass = (player: Player): Player => {
  const check = canPurchaseNightPass(player);
  if (!check.can) return player;

  const nightPass = player.nightPass || { count: 0 };
  return {
    ...player,
    gold: player.gold - NIGHT_PASS_COST,
    nightPass: { count: nightPass.count + 1 },
  };
};

export const consumeNightPass = (nightPass: NightPass): NightPass => {
  const safeNightPass = nightPass || { count: 0 };
  return { count: Math.max(0, safeNightPass.count - 1) };
};

export const filterNightEvents = (
  nightEvents: GameEvent[],
  pool: 'night_land' | 'night_water' | 'normal'
): GameEvent[] => {
  if (pool === 'normal') return [];
  return nightEvents.filter(e => (e as any).pool === pool);
};

export const getNightEventPoolLabel = (pool: 'night_land' | 'night_water' | 'normal'): string => {
  switch (pool) {
    case 'night_land': return '陆路夜行';
    case 'night_water': return '水路夜航';
    case 'normal': return '日间正常';
  }
};

export const getRiskLevelLabel = (level: 'low' | 'medium' | 'high' | 'none'): string => {
  switch (level) {
    case 'low': return '低风险';
    case 'medium': return '中风险';
    case 'high': return '高风险';
    case 'none': return '无风险';
  }
};

export const getRiskLevelColor = (level: 'low' | 'medium' | 'high' | 'none'): string => {
  switch (level) {
    case 'low': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-amber-600 bg-amber-100';
    case 'high': return 'text-red-600 bg-red-100';
    case 'none': return 'text-slate-500 bg-slate-100';
  }
};

export const calculateNightTimeModifier = (
  routeType: 'land' | 'water',
  choice: NightTravelChoice
): number => {
  if (!choice) return 1;
  if (choice === 'wait_dawn') return 1;

  if (routeType === 'water') {
    if (choice === 'night_pass') return WATER_NIGHT_SPEED_BONUS;
    if (choice === 'bribe') return 0.75;
  }

  if (routeType === 'land') {
    if (choice === 'night_pass') return LAND_NIGHT_SPEED_PENALTY;
    if (choice === 'bribe') return 1.3;
  }

  return 1;
};

export const calculateNightCost = (
  routeType: 'land' | 'water',
  choice: NightTravelChoice
): number => {
  if (!choice || choice === 'night_pass' || choice === 'wait_dawn') return 0;

  if (choice === 'bribe') {
    return routeType === 'water' 
      ? BRIBE_BASE_COST 
      : Math.floor(BRIBE_BASE_COST * BRIBE_LAND_MULTIPLIER);
  }

  return 0;
};

export const getCurfewInterrogationChance = (
  choice: NightTravelChoice,
  reputation: number
): number => {
  if (choice === 'wait_dawn' || choice === null) return 0;
  
  let baseChance = 0;
  if (choice === 'night_pass') baseChance = 0.15;
  if (choice === 'bribe') baseChance = 0.35;
  
  const reputationReduction = Math.min(0.2, reputation / 2000);
  
  return Math.max(0.05, baseChance - reputationReduction);
};

export const isRouteAvailableAtNight = (
  route: Route,
  timeOfDay: Player['timeOfDay'],
  choice: NightTravelChoice
): { available: boolean; reason?: string } => {
  if (!isNightTime(timeOfDay)) {
    return { available: true };
  }

  if (choice === 'wait_dawn') {
    return { available: true };
  }

  if (route.type === 'land' && isCurfewActive(timeOfDay, 'land')) {
    if (choice === 'night_pass' || choice === 'bribe') {
      return { available: true };
    }
    return { available: false, reason: '夜间宵禁，陆路不可通行' };
  }

  return { available: true };
};
