import { computed, reactive } from "vue";
import {
  units,
  skills,
  skillIndex,
  strengths,
  blessings,
  equipmentAffixes,
} from "./data/runtimeData.js";
import { createHookBus } from "./engine/battleHooks.js";
import {
  applyRandomMode,
  createUnitInstance,
  decideOrder,
  executeSkill,
  reduceRound,
} from "./engine/battle.js";
import {
  installBlessing,
  refreshBlessingOnStackChange,
} from "./systems/blessingSystem.js";
import { applyEquipmentsToUnit } from "./systems/equipmentSystem.js";
import {
  buildMidDraftCandidates,
  buildPreDraftCandidates,
  getMidDraftQualityWeights,
  getBudgetByDifficulty,
  refreshPreDraftCandidatesWithLocks,
} from "./systems/draftSystem.js";

const LOG_ROUND_SEGMENT_SIZE = 100;
const MAX_SIDE_LOGS = 10;
const PRE_DRAFT_REFRESH_COST = 1;
const DEFAULT_MID_DRAFT_INTERVAL = 10;
const MAX_EQUIPMENT_SLOTS = 2;
const CHAIN_ENEMY_GROWTH_STEP_PER_KILL = 0.05;
const CHAIN_ENEMY_GROWTH_MAX_RATE = 0.15;
const CHAIN_ENEMY_HEAL_BONUS_PER_KILL = 1;
const CHAIN_ENEMY_CRIT_HURT_BONUS_PER_KILL = 0.1;
const MID_DRAFT_HALF_HP_TRIGGER_START_ENEMY_INDEX = 5;
const FIRST_ACTION_DELAY_MS = 800;
const SECOND_ACTION_DELAY_MS = 800;
const ROUND_END_DELAY_MS = 1000;
const CRIT_FLOAT_TRIGGER_RATE = 0.75;
const CRIT_PAIN_TEXT_POOL = [
  "嘶...好疼！",
  "这一下真重！",
  "可恶，被打中了！",
  "痛痛痛！",
  "差点站不稳！",
];
const CRIT_TAUNT_TEXT_POOL = [
  "就这？再来！",
  "看到差距了吗？",
  "这才叫暴击！",
  "你防不住我。",
  "继续挣扎吧。",
];

const DIFFICULTY_OPTIONS = [
  { key: "normal", label: "普通" },
  { key: "hard", label: "困难" },
  { key: "extreme", label: "极难" },
  { key: "expert", label: "专家" },
  { key: "inferno", label: "炼狱" },
];

const DIFFICULTY_CONFIG = {
  normal: {
    hpMultiplier: 1,
    attackMultiplier: 1,
    defenceMultiplier: 1,
    healBonus: 0,
    missRateBonus: 0,
    criticalRateBonus: 0,
    extraStrengthCount: 0,
  },
  hard: {
    hpMultiplier: 1.2,
    attackMultiplier: 1.2,
    defenceMultiplier: 1.05,
    healBonus: 0,
    missRateBonus: 0,
    criticalRateBonus: 0,
    extraStrengthCount: 0,
  },
  extreme: {
    hpMultiplier: 1.5,
    attackMultiplier: 1.5,
    defenceMultiplier: 1.05,
    healBonus: 3,
    missRateBonus: 0.05,
    criticalRateBonus: 0.05,
    extraStrengthCount: 0,
  },
  expert: {
    hpMultiplier: 1.7,
    attackMultiplier: 1.7,
    defenceMultiplier: 1.15,
    healBonus: 7,
    missRateBonus: 0.08,
    criticalRateBonus: 0.08,
    extraStrengthCount: 1,
  },
  inferno: {
    hpMultiplier: 2,
    attackMultiplier: 2,
    defenceMultiplier: 1.15,
    healBonus: 12,
    missRateBonus: 0.1,
    criticalRateBonus: 0.1,
    extraStrengthCount: 1,
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// 中文注释：从文本池里随机挑选一条文案，用于浮字输出。
const pickRandomText = (pool, fallback = "") => {
  if (!Array.isArray(pool) || !pool.length) return fallback;
  return String(pool[Math.floor(Math.random() * pool.length)] || fallback);
};

// 连战生命/攻击/防御成长率：首次5%，之后每击杀+5%，最高15%。
const getChainEnemyGrowthRate = (growthLevel = 0) => {
  const level = Math.max(0, Number(growthLevel || 0));
  if (!level) return 0;
  return Math.min(level * CHAIN_ENEMY_GROWTH_STEP_PER_KILL, CHAIN_ENEMY_GROWTH_MAX_RATE);
};

// 为指定单位补充不重复的随机被动特长。
const pickExtraStrengthIds = (ownedStrengthIds = [], count = 0) => {
  if (!count) return [];
  const owned = new Set(ownedStrengthIds);
  const pool = strengths
    .map((item) => item.id)
    .filter((id) => Number.isFinite(id) && !owned.has(id));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

// 根据难度对敌方基础模板做数值加成。
const applyDifficultyToEnemyBase = (enemyBase, difficultyKey) => {
  const config = DIFFICULTY_CONFIG[difficultyKey] ?? DIFFICULTY_CONFIG.normal;
  const next = JSON.parse(JSON.stringify(enemyBase));
  next.hpCount = Number(next.hpCount ?? 0) * config.hpMultiplier;
  next.hp = next.hpCount;
  next.attack = Number(next.attack ?? 0) * config.attackMultiplier;
  next.attackDefault = Number(next.attackDefault ?? next.attack) * config.attackMultiplier;
  next.defence = Number(next.defence ?? 0) * config.defenceMultiplier;
  next.defenceDefault =
    Number(next.defenceDefault ?? next.defence) * config.defenceMultiplier;
  next.healPerRound = Number(next.healPerRound ?? 0) + config.healBonus;
  next.missRate = clamp(
    Number(next.missRate ?? 0) + config.missRateBonus,
    0,
    0.6
  );
  next.criticalRate = clamp(
    Number(next.criticalRate ?? 0) + config.criticalRateBonus,
    0,
    1
  );
  const originalStrengths = Array.from(new Set(next.strength || []));
  const extraStrengths = pickExtraStrengthIds(
    originalStrengths,
    config.extraStrengthCount
  );
  next.strength = [...originalStrengths, ...extraStrengths];
  return next;
};

// 按连战击败数对下一名敌人追加成长倍率。
const applyChainGrowthToEnemyBase = (enemyBase, growthLevel = 0) => {
  const level = Math.max(0, Number(growthLevel || 0));
  if (!level) return enemyBase;
  const next = JSON.parse(JSON.stringify(enemyBase));
  const growthRate = getChainEnemyGrowthRate(level);
  const growthMul = 1 + growthRate;
  next.hpCount = Number(next.hpCount ?? 0) * growthMul;
  next.hp = next.hpCount;
  next.attack = Number(next.attack ?? 0) * growthMul;
  next.attackDefault = Number(next.attackDefault ?? next.attack) * growthMul;
  next.defence = Number(next.defence ?? 0) * growthMul;
  next.defenceDefault = Number(next.defenceDefault ?? next.defence) * growthMul;
  next.healPerRound = Number(next.healPerRound ?? 0) + CHAIN_ENEMY_HEAL_BONUS_PER_KILL * level;
  next.criticalHurtRate =
    Number(next.criticalHurtRate ?? 1) + CHAIN_ENEMY_CRIT_HURT_BONUS_PER_KILL * level;
  return next;
};

const getRandomUnit = (excludeId) => {
  const pool = excludeId ? units.filter((unit) => unit.id !== excludeId) : units;
  const list = pool.length ? pool : units;
  const pick = list[Math.floor(Math.random() * list.length)];
  return JSON.parse(JSON.stringify(pick));
};

const createLogManager = (state) => ({
  push: (text, type = "text", round = null) => {
    state.log.unshift({
      id: `${Date.now()}-${Math.random()}`,
      text,
      type,
      round,
    });
  },
});

// 侧边短日志，仅用于设置变更与祝福相关提示。
const createSideLogManager = (state) => ({
  push: (text) => {
    state.sideLog.unshift({
      id: `${Date.now()}-${Math.random()}`,
      text,
    });
    if (state.sideLog.length > MAX_SIDE_LOGS) state.sideLog.pop();
  },
});

export const useBattle = () => {
  let hookBus = createHookBus();
  const state = reactive({
    phase: "select",
    round: 1,
    over: false,
    winner: null,
    randomize: true,
    busy: false,
    activeTurn: null,
    selectedPlayerId: null,
    selectedEnemyId: null,
    difficulty: "normal",
    chainMode: false,
    enemyIndex: 1,
    chainGrowthLevel: 0,
    pointsTotal: 0,
    pointsUsed: 0,
    player: null,
    enemy: null,
    blessings: [],
    equipments: [],
    draft: {
      prePending: false,
      midPending: false,
      preCandidates: [],
      midCandidates: [],
      selectedPreIds: [],
      refreshCost: PRE_DRAFT_REFRESH_COST,
      midDraftRoundInterval: DEFAULT_MID_DRAFT_INTERVAL,
      midDraftOpenCount: 0,
      midDraftQualityWeights: getMidDraftQualityWeights(0),
      halfHpTriggerEnemyStartIndex: MID_DRAFT_HALF_HP_TRIGGER_START_ENEMY_INDEX,
      enemyHalfHpTriggered: false,
    },
    log: [],
    sideLog: [],
    effects: {
      playerHitToken: 0,
      enemyHitToken: 0,
      playerStatusToken: 0,
      enemyStatusToken: 0,
      playerFloatToken: 0,
      enemyFloatToken: 0,
      playerFloatText: "",
      enemyFloatText: "",
      playerFloatConfig: {},
      enemyFloatConfig: {},
    },
  });

  const logger = createLogManager(state);
  const sideLogger = createSideLogManager(state);
  const log = (text, type = "text") => {
    logger.push(text, type, state.round);
  };
  const sideLog = (text) => {
    sideLogger.push(text);
  };

  // 构造祝福钩子上下文中的会话快照。
  const getHookSession = () => ({
    difficulty: state.difficulty,
    round: state.round,
    chainMode: state.chainMode,
    enemyIndex: state.enemyIndex,
    chainGrowthLevel: state.chainGrowthLevel,
    player: state.player,
    enemy: state.enemy,
    blessings: state.blessings,
    equipments: state.equipments,
  });

  // 对 hookBus 统一发射事件，降低调用点重复代码。
  const emitBattleHook = (eventName, payload = {}) => {
    hookBus.emit(eventName, {
      session: getHookSession(),
      round: state.round,
      log,
      sideLog,
      meta: {},
      ...payload,
    });
  };

  // 初始化战斗内的构筑状态。
  const resetDraftState = () => {
    state.pointsTotal = 0;
    state.pointsUsed = 0;
    state.chainGrowthLevel = 0;
    state.blessings = [];
    state.equipments = [];
    state.draft.prePending = false;
    state.draft.midPending = false;
    state.draft.preCandidates = [];
    state.draft.midCandidates = [];
    state.draft.selectedPreIds = [];
    state.draft.midDraftOpenCount = 0;
    state.draft.midDraftQualityWeights = getMidDraftQualityWeights(0);
    state.draft.enemyHalfHpTriggered = false;
    state.sideLog = [];
  };

  const pointsRemaining = computed(() =>
    Math.max(0, Number(state.pointsTotal || 0) - Number(state.pointsUsed || 0))
  );

  // 读取祝福重复规则，repeatable=false 时强制上限为1。
  const getBlessingLimit = (blessingDef) => {
    const parsedMaxStack = Number(blessingDef?.maxStack);
    const hasValidMaxStack = Number.isFinite(parsedMaxStack) && parsedMaxStack > 0;
    const repeatable = blessingDef?.repeatable !== false;
    const maxStack = hasValidMaxStack
      ? Math.max(1, Math.floor(parsedMaxStack))
      : repeatable
        ? 1
        : 1;
    return { repeatable, maxStack };
  };

  // 查询当前已拥有的祝福层数。
  const getOwnedBlessingStack = (blessingId) =>
    Number(state.blessings.find((item) => item.id === blessingId)?.stack || 0);

  // 过滤仍可进入候选池的祝福。
  const getAvailableBlessingPool = () =>
    blessings.filter((blessingDef) => {
      const { maxStack } = getBlessingLimit(blessingDef);
      return getOwnedBlessingStack(blessingDef.id) < maxStack;
    });

  // 基于当前难度创建敌方实例。
  const createEnemyByDifficulty = (enemyBase, growthLevel = state.chainGrowthLevel) => {
    const enemyWithDifficulty = applyDifficultyToEnemyBase(enemyBase, state.difficulty);
    const enemyWithChainGrowth = applyChainGrowthToEnemyBase(enemyWithDifficulty, growthLevel);
    const enemy = createUnitInstance(enemyWithChainGrowth, "对手");
    if (state.randomize) applyRandomMode(enemy);
    return enemy;
  };

  // 生成下一位连战敌人，并继承当前难度与随机模式配置。
  const spawnNextEnemy = () => {
    const nextEnemyBase = getRandomUnit(state.selectedPlayerId);
    state.selectedEnemyId = nextEnemyBase.id;
    state.chainGrowthLevel += 1;
    state.enemy = createEnemyByDifficulty(nextEnemyBase, state.chainGrowthLevel);
    state.enemyIndex += 1;
    state.draft.enemyHalfHpTriggered = false;
    sideLog(
      `连战继续：第${state.enemyIndex}个敌人 ${state.enemy.name} 登场（连战成长层数 ${state.chainGrowthLevel}）`
    );
    sideLog(
      `连战成长：下一敌人生命/攻击/防御 +${Math.round(
        getChainEnemyGrowthRate(state.chainGrowthLevel) * 100
      )}%，回复 +${state.chainGrowthLevel}`
    );
  };

  // 同步更新当前战斗中的敌人面板数值与被动。
  const refreshEnemyByDifficulty = () => {
    if (!state.enemy || !state.selectedEnemyId) return;
    const enemyBase = units.find((unit) => unit.id === state.selectedEnemyId);
    if (!enemyBase) return;
    const hpRate = state.enemy.hpCount > 0 ? state.enemy.hp / state.enemy.hpCount : 1;
    const nextEnemy = createEnemyByDifficulty(enemyBase, state.chainGrowthLevel);
    nextEnemy.hp = clamp(nextEnemy.hpCount * hpRate, 0, nextEnemy.hpCount);
    state.enemy = nextEnemy;
  };

  // 生成战前构筑候选，并进入待确认状态。
  const startPreDraft = () => {
    state.pointsTotal = getBudgetByDifficulty(state.difficulty);
    state.pointsUsed = 0;
    state.draft.preCandidates = buildPreDraftCandidates(
      getAvailableBlessingPool(),
      equipmentAffixes
    );
    state.draft.selectedPreIds = [];
    state.draft.prePending = true;
    sideLog(`战前构筑：可用点数 ${state.pointsTotal}，请选择祝福/装备。`);
  };

  // 安装祝福并写入运行时列表。
  const grantBlessing = (blessingDef) => {
    const existed = state.blessings.find((item) => item.id === blessingDef.id);
    const { maxStack } = getBlessingLimit(blessingDef);
    if (existed) {
      if (Number(existed.stack || 1) >= maxStack) {
        return { ok: false, message: `${blessingDef.name}已达最大层数` };
      }
      existed.stack = Number(existed.stack || 1) + 1;
      // 中文注释：叠层后立刻刷新祝福的叠层增益，确保卡片属性实时更新。
      refreshBlessingOnStackChange({
        blessing: existed,
        state,
      });
      return { ok: true, stacked: true };
    }
    const instance = installBlessing({
      blessingDef,
      hookBus,
      state,
    });
    state.blessings.push({
      ...blessingDef,
      ...instance,
    });
    return { ok: true, stacked: false };
  };

  // 生成战中三选一候选并置为待选择；返回是否成功打开三选一。
  const openMidDraft = (reasonText) => {
    if (state.over || state.draft.prePending || state.draft.midPending) return false;
    const availablePool = getAvailableBlessingPool();
    // 若可获取祝福已全部达上限，则改为发放生命上限与生命值奖励。
    if (!availablePool.length) {
      if (state.player) {
        state.player.hpCount = Number(state.player.hpCount || 0) + 10;
        state.player.hp = Math.min(
          Number(state.player.hp || 0) + 10,
          state.player.hpCount
        );
        sideLog(`祝福池已满：${reasonText}，改为获得 +10 生命上限与 +10 生命值。`);
      }
      return false;
    }
    const qualityWeights = getMidDraftQualityWeights(state.draft.midDraftOpenCount);
    state.draft.midCandidates = buildMidDraftCandidates(availablePool, 3, {
      midDraftCount: state.draft.midDraftOpenCount,
      qualityWeights,
    });
    state.draft.midPending = state.draft.midCandidates.length > 0;
    if (state.draft.midPending) {
      state.draft.midDraftOpenCount += 1;
      state.draft.midDraftQualityWeights = getMidDraftQualityWeights(state.draft.midDraftOpenCount);
      sideLog(`祝福三选一触发：${reasonText}`);
      return true;
    }
    return false;
  };

  // 初始化战斗（共用主流程），并进入战前构筑阶段。
  const initBattle = (playerBase) => {
    const enemyBase = getRandomUnit(playerBase.id);
    hookBus = createHookBus();
    resetDraftState();
    state.selectedEnemyId = enemyBase.id;
    state.phase = "battle";
    state.round = 1;
    state.over = false;
    state.winner = null;
    state.log = [];
    state.activeTurn = null;
    state.player = createUnitInstance(playerBase, "杨春潇");
    state.enemy = createEnemyByDifficulty(enemyBase);
    state.enemyIndex = 1;
    state.draft.enemyHalfHpTriggered = false;
    if (state.randomize) applyRandomMode(state.player);
    log(`战斗初始化：${state.player.name} vs ${state.enemy.name}`);
    logger.push(`第 ${state.round} 回合`, "round", state.round);
    startPreDraft();
  };

  // 切换战前候选项选中状态。
  const togglePreDraftItem = (draftId) => {
    if (!state.draft.prePending) {
      return { ok: false, message: "当前不在战前构筑阶段。" };
    }
    const exists = state.draft.selectedPreIds.includes(draftId);
    if (exists) {
      state.draft.selectedPreIds = state.draft.selectedPreIds.filter((id) => id !== draftId);
      return { ok: true };
    }
    const candidate = state.draft.preCandidates.find((item) => item.draftId === draftId);
    if (!candidate) {
      return { ok: false, message: "未找到该候选项。" };
    }
    const selectedItems = state.draft.preCandidates.filter((item) =>
      state.draft.selectedPreIds.includes(item.draftId)
    );
    const selectedCost = selectedItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    if (selectedCost + Number(candidate.cost || 0) > pointsRemaining.value) {
      return { ok: false, message: "点数不足，无法选择该项。" };
    }
    if (candidate.type === "equipment") {
      const selectedEquipments = selectedItems.filter((item) => item.type === "equipment").length;
      if (state.equipments.length + selectedEquipments + 1 > MAX_EQUIPMENT_SLOTS) {
        return { ok: false, message: `装备槽位上限为${MAX_EQUIPMENT_SLOTS}。` };
      }
    }
    if (candidate.type === "blessing") {
      const blessingId = candidate.payload.id;
      const { maxStack } = getBlessingLimit(candidate.payload);
      const selectedSameBlessing = selectedItems.filter(
        (item) => item.type === "blessing" && item.payload.id === blessingId
      ).length;
      if (getOwnedBlessingStack(blessingId) + selectedSameBlessing + 1 > maxStack) {
        return { ok: false, message: `${candidate.payload.name}已达可获取上限。` };
      }
    }
    state.draft.selectedPreIds = [...state.draft.selectedPreIds, draftId];
    return { ok: true };
  };

  // 刷新战前候选，消耗1点预算。
  const refreshPreDraftCandidates = () => {
    if (!state.draft.prePending) return;
    if (pointsRemaining.value < state.draft.refreshCost) {
      sideLog("点数不足，无法刷新候选。");
      return;
    }
    const lockedDraftIds = [...state.draft.selectedPreIds];
    state.pointsUsed += state.draft.refreshCost;
    state.draft.preCandidates = refreshPreDraftCandidatesWithLocks(
      state.draft.preCandidates,
      lockedDraftIds,
      getAvailableBlessingPool(),
      equipmentAffixes
    );
    state.draft.selectedPreIds = state.draft.preCandidates
      .filter((item) => lockedDraftIds.includes(item.draftId))
      .map((item) => item.draftId);
    sideLog(
      `已消耗${state.draft.refreshCost}点刷新候选（已固定${state.draft.selectedPreIds.length}项）。`
    );
  };

  // 确认战前构筑并应用属性/祝福。
  const confirmPreDraft = () => {
    if (!state.draft.prePending || !state.player) return;
    const pickSet = new Set(state.draft.selectedPreIds);
    const pickedItems = state.draft.preCandidates.filter((item) => pickSet.has(item.draftId));
    const totalCost = pickedItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    if (totalCost > pointsRemaining.value) {
      sideLog("点数不足，无法确认当前构筑。");
      return;
    }

    const nextEquipments = [];
    const nextBlessings = [];
    for (const item of pickedItems) {
      if (item.type === "equipment") {
        nextEquipments.push(item.payload);
      } else if (item.type === "blessing") {
        nextBlessings.push(item.payload);
      }
    }
    if (state.equipments.length + nextEquipments.length > MAX_EQUIPMENT_SLOTS) {
      sideLog(`装备槽位上限为${MAX_EQUIPMENT_SLOTS}，请减少装备选择。`);
      return;
    }

    state.pointsUsed += totalCost;
    state.equipments = [...state.equipments, ...nextEquipments];
    applyEquipmentsToUnit(state.player, nextEquipments);
    let grantedBlessingCount = 0;
    nextBlessings.forEach((blessingDef) => {
      const result = grantBlessing(blessingDef);
      if (result?.ok) grantedBlessingCount += 1;
    });
    state.draft.prePending = false;
    state.draft.selectedPreIds = [];
    sideLog(
      `构筑完成：获得${grantedBlessingCount}个祝福、${nextEquipments.length}件装备，剩余点数${pointsRemaining.value}。`
    );
    emitBattleHook("onBattleStart");
  };

  // 选择战中三选一祝福并安装。
  const chooseMidDraftBlessing = (blessingId) => {
    if (!state.draft.midPending) return;
    const blessingDef = state.draft.midCandidates.find((item) => item.id === blessingId);
    if (!blessingDef) return;
    const result = grantBlessing(blessingDef);
    if (!result?.ok) {
      sideLog(result?.message || "祝福获取失败");
      return;
    }
    state.draft.midPending = false;
    state.draft.midCandidates = [];
    const stackText = state.blessings.find((item) => item.id === blessingDef.id)?.stack || 1;
    sideLog(`已获得祝福：${blessingDef.name}（当前层数 ${stackText}）`);
  };

  // 从第5个敌人起：敌方生命首次降至50%及以下时触发一次祝福三选一，换敌后重置。
  const tryOpenMidDraftByEnemyHalfHp = () => {
    if (!state.enemy || state.enemy.hpCount <= 0) return false;
    if (state.enemyIndex < state.draft.halfHpTriggerEnemyStartIndex) return false;
    if (state.draft.enemyHalfHpTriggered) return false;
    if (state.enemy.hp <= 0) return false;
    if (state.enemy.hp > state.enemy.hpCount / 2) return false;
    state.draft.enemyHalfHpTriggered = true;
    return openMidDraft(`第${state.enemyIndex}个敌人生命首次降至50%`);
  };

  const resetBattle = () => {
    const playerBase =
      units.find((unit) => unit.id === state.selectedPlayerId) ??
      getRandomUnit();
    state.selectedPlayerId = playerBase.id;
    initBattle(playerBase);
  };

  const playerSkills = computed(() => {
    if (!state.player) return [];
    const ids = Array.from(new Set(state.player.skillList || []));
    const resolved = ids
      .map((id) => skillIndex.get(id))
      .filter(Boolean)
      .filter((skill) => !skill.hidden);
    if (resolved.length) return resolved;
    return ids.map((id) => skillIndex.get(id)).filter(Boolean);
  });

  const chooseEnemySkill = () => {
    const skillIds = state.enemy?.skillList || [];
    const available = skillIds.map((id) => skillIndex.get(id)).filter(Boolean);
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  // 战斗流程停顿函数：统一控制“行动前摇/两次行动间隔/回合结算前等待”的节奏。
  // 以后如需调快或调慢手感，优先修改上方 *_DELAY_MS 常量，再看是否需要改这里。
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 触发受击/状态动画：通过递增 token 驱动 UI 重播动画，避免布尔翻转丢帧。
  const triggerEffect = (target, type) => {
    const key = `${target}${type}Token`;
    state.effects[key] = Number(state.effects[key] || 0) + 1;
  };

  // 中文注释：触发卡片浮字（支持大小/位置/时长/缓动/动画预设/样式预设等配置）。
  // 参数可传 string（仅文本）或对象：
  // { text, size, x, y, duration, easing, animation, style, distance, keyframes }
  const triggerFloatingText = (target, payload) => {
    const tokenKey = `${target}FloatToken`;
    const textKey = `${target}FloatText`;
    const configKey = `${target}FloatConfig`;
    const parsed = typeof payload === "string" ? { text: payload } : { ...(payload || {}) };
    state.effects[textKey] = String(parsed.text || "");
    state.effects[configKey] = {
      ...parsed,
    };
    state.effects[tokenKey] = Number(state.effects[tokenKey] || 0) + 1;
  };

  // 回合收尾：减少状态回合并推进回合计数。
  const finalizeRound = () => {
    emitBattleHook("onRoundEnd");
    reduceRound([state.player, state.enemy], log);
    state.round += 1;
    // 每进入新的100回合区间时清空日志，仅保留当前区间（如101-200）。
    if (state.round > 1 && (state.round - 1) % LOG_ROUND_SEGMENT_SIZE === 0) {
      state.log = [];
    }
    logger.push(`第 ${state.round} 回合`, "round", state.round);
    if (state.round % state.draft.midDraftRoundInterval === 0) {
      openMidDraft(`到达第${state.round}回合`);
    }
  };

  // 检查战斗是否结束；连战模式下击败敌人会直接切入下一名敌人。
  const checkOver = (attacker, defender) => {
    if (defender.hp <= 0) {
      if (defender === state.enemy && state.chainMode) {
        log(`${attacker.owner}击败了第${state.enemyIndex}个敌人`);
        spawnNextEnemy();
        openMidDraft(`连战击败第${state.enemyIndex - 1}个敌人`);
        return { ended: false, skipRemainingTurn: true };
      }
      state.over = true;
      state.winner = attacker.owner;
      log(`${attacker.owner}的${attacker.name}赢得了战斗！`);
      return { ended: true, skipRemainingTurn: true };
    }
    return { ended: false, skipRemainingTurn: false };
  };

  // 执行单次行动，返回是否需要跳过本回合剩余行动。
  const act = async (attacker, defender, skill) => {
    if (attacker.stopRound > 0) {
      log(`${attacker.owner}的${attacker.name}无法行动`);
      return { skipRemainingTurn: false };
    }
    if (!skill) {
      log(`${attacker.owner}没有可用招式`);
      return { skipRemainingTurn: false };
    }
    const attackerSide = attacker === state.player ? "player" : "enemy";
    const defenderSide = defender === state.player ? "player" : "enemy";
    // 中文注释：行动开始时在出招方卡片显示技能名浮字提示（可配置样式与动画）。
    triggerFloatingText(attackerSide, {
      text: skill.name,
      style: "skill",
      animation: "floatUp",
      size: 20,
      y: 75,
      x:'75%',
      duration: 3000,
      easing: "cubic-bezier(0.2, 0.65, 0.22, 1)",
      distance: 30,
    });
    executeSkill(
      attacker,
      defender,
      skill,
      state.round,
      log,
      (event) => {
        if (event.type === "hit") {
          triggerEffect(defenderSide, "Hit");
          // 中文注释：造成伤害时在受击方显示伤害数字浮字。
          triggerFloatingText(defenderSide, {
            text: `-${Math.max(0, Number(event?.damage || 0))}`,
            style: "damage",
            animation: event?.criticalHit ? "riseFast" : "floatUp",
            size: event?.criticalHit ? 17 : 14,
            distance: event?.criticalHit ? 24 : 18,
            y: 12,
          });
          // 中文注释：暴击时双方各有75%概率触发文案浮字（受击吃痛/攻击嘲讽）。
          if (event?.criticalHit) {
            if (Math.random() < CRIT_FLOAT_TRIGGER_RATE) {
              triggerFloatingText(defenderSide, {
                text: pickRandomText(CRIT_PAIN_TEXT_POOL, "好痛！"),
                style: "damage",
                animation: "driftLeft",
                y: 34,
              });
            }
            if (Math.random() < CRIT_FLOAT_TRIGGER_RATE) {
              triggerFloatingText(attackerSide, {
                text: pickRandomText(CRIT_TAUNT_TEXT_POOL, "太弱了。"),
                style: "taunt",
                animation: "driftRight",
                y: 34,
              });
            }
          }
        }
        if (event.type === "status") {
          triggerEffect(defenderSide, "Status");
        }
        if (event.type === "miss") {
          // 中文注释：闪避事件时，在防守方显示“闪避”浮字。
          triggerFloatingText(defenderSide, {
            text: "闪避",
            style: "buff",
            animation: "pop",
            y: 12,
          });
        }
      },
      {
        hookBus,
        getSession: getHookSession,
        sideLog,
      }
    );
    const overResult = checkOver(attacker, defender);
    if (overResult.ended || overResult.skipRemainingTurn) {
      return { skipRemainingTurn: overResult.skipRemainingTurn };
    }
    if (defender === state.enemy && tryOpenMidDraftByEnemyHalfHp()) {
      return { skipRemainingTurn: true };
    }
    return { skipRemainingTurn: false };
  };

  const chooseSkill = async (skillId) => {
    if (state.over || state.busy || !state.player || !state.enemy) return;
    if (state.draft.prePending || state.draft.midPending) return;
    state.busy = true;
    emitBattleHook("onRoundStart");
    const playerSkill = skillIndex.get(skillId);
    const enemySkill = chooseEnemySkill();
    const [first, second] = decideOrder(state.player, state.enemy);
    const firstSkill = first === state.player ? playerSkill : enemySkill;
    const secondSkill = second === state.player ? playerSkill : enemySkill;

    state.activeTurn = first === state.player ? "player" : "enemy";
    // 第一段停顿：展示先手方轮到谁行动。
    await sleep(FIRST_ACTION_DELAY_MS);
    const firstResult = await act(
      first,
      first === state.player ? state.enemy : state.player,
      firstSkill
    );
    if (!state.over && !firstResult?.skipRemainingTurn) {
      state.activeTurn = second === state.player ? "player" : "enemy";
      // 第二段停顿：两次行动之间的间隔。
      await sleep(SECOND_ACTION_DELAY_MS);
      await act(
        second,
        second === state.player ? state.enemy : state.player,
        secondSkill
      );
    }
    if (!state.over) {
      // 第三段停顿：回合收尾前预留日志与动画展示时间。
      await sleep(ROUND_END_DELAY_MS);
      finalizeRound();
    }
    state.activeTurn = null;
    state.busy = false;
  };

  const toggleRandomize = () => {
    state.randomize = !state.randomize;
    resetBattle();
  };

  const startBattleWithSelection = (playerId) => {
    const playerBase = units.find((unit) => unit.id === playerId) || units[0];
    state.selectedPlayerId = playerBase.id;
    initBattle(playerBase);
  };

  // 设置难度后，对当前战斗中的敌人立即生效。
  const setDifficulty = (difficultyKey) => {
    if (!DIFFICULTY_CONFIG[difficultyKey]) return;
    if (state.difficulty === difficultyKey) return;
    state.difficulty = difficultyKey;
    if (state.phase === "battle" && state.enemy) {
      refreshEnemyByDifficulty();
      sideLog(`难度已切换为${DIFFICULTY_OPTIONS.find((d) => d.key === difficultyKey)?.label}`);
    }
  };

  // 切换连战模式，开启后击败敌人会自动进入下一场。
  const toggleChainMode = () => {
    state.chainMode = !state.chainMode;
    sideLog(state.chainMode ? "已开启连战模式" : "已关闭连战模式");
  };

  const availableUnits = computed(() => units);

  const backToSelect = () => {
    state.phase = "select";
    state.over = false;
    state.busy = false;
    state.activeTurn = null;
    state.log = [];
    resetDraftState();
  };

  return {
    state,
    skills,
    playerSkills,
    availableUnits,
    difficultyOptions: DIFFICULTY_OPTIONS,
    pointsRemaining,
    resetBattle,
    setDifficulty,
    toggleChainMode,
    chooseSkill,
    toggleRandomize,
    startBattleWithSelection,
    backToSelect,
    togglePreDraftItem,
    refreshPreDraftCandidates,
    confirmPreDraft,
    chooseMidDraftBlessing,
  };
};
