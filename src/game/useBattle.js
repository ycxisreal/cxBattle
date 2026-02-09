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
import { installBlessing } from "./systems/blessingSystem.js";
import { applyEquipmentsToUnit } from "./systems/equipmentSystem.js";
import {
  buildMidDraftCandidates,
  buildPreDraftCandidates,
  getBudgetByDifficulty,
} from "./systems/draftSystem.js";

const MAX_LOGS = 120;
const PRE_DRAFT_REFRESH_COST = 1;
const DEFAULT_MID_DRAFT_INTERVAL = 10;
const MAX_EQUIPMENT_SLOTS = 2;
const CHAIN_ENEMY_GROWTH_PER_KILL = 0.2;
const CHAIN_ENEMY_HEAL_BONUS_PER_KILL = 1;
const CHAIN_ENEMY_CRIT_HURT_BONUS_PER_KILL = 0.1;

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
  const growthMul = 1 + CHAIN_ENEMY_GROWTH_PER_KILL * level;
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
    if (state.log.length > MAX_LOGS) state.log.pop();
  },
});

export const useBattle = () => {
  let hookBus = createHookBus();
  const state = reactive({
    phase: "select",
    round: 1,
    maxRounds: 100,
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
    },
    log: [],
    effects: {
      playerHit: false,
      enemyHit: false,
      playerStatus: false,
      enemyStatus: false,
    },
  });

  const logger = createLogManager(state);
  const log = (text, type = "text") => {
    logger.push(text, type, state.round);
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
    log(
      `连战继续：第${state.enemyIndex}个敌人 ${state.enemy.name} 登场（连战成长层数 ${state.chainGrowthLevel}）`
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
    log(`战前构筑：可用点数 ${state.pointsTotal}，请选择祝福/装备。`);
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

  // 生成战中三选一候选并置为待选择。
  const openMidDraft = (reasonText) => {
    state.draft.midCandidates = buildMidDraftCandidates(getAvailableBlessingPool(), 3);
    state.draft.midPending = state.draft.midCandidates.length > 0;
    if (state.draft.midPending) {
      log(`祝福三选一触发：${reasonText}`);
    }
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
      log("点数不足，无法刷新候选。");
      return;
    }
    state.pointsUsed += state.draft.refreshCost;
    state.draft.preCandidates = buildPreDraftCandidates(
      getAvailableBlessingPool(),
      equipmentAffixes
    );
    state.draft.selectedPreIds = [];
    log(`已消耗${state.draft.refreshCost}点刷新候选。`);
  };

  // 确认战前构筑并应用属性/祝福。
  const confirmPreDraft = () => {
    if (!state.draft.prePending || !state.player) return;
    const pickSet = new Set(state.draft.selectedPreIds);
    const pickedItems = state.draft.preCandidates.filter((item) => pickSet.has(item.draftId));
    const totalCost = pickedItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    if (totalCost > pointsRemaining.value) {
      log("点数不足，无法确认当前构筑。");
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
      log(`装备槽位上限为${MAX_EQUIPMENT_SLOTS}，请减少装备选择。`);
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
    log(
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
      log(result?.message || "祝福获取失败");
      return;
    }
    state.draft.midPending = false;
    state.draft.midCandidates = [];
    const stackText = state.blessings.find((item) => item.id === blessingDef.id)?.stack || 1;
    log(`已获得祝福：${blessingDef.name}（当前层数 ${stackText}）`);
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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const triggerEffect = (target, type) => {
    const key = `${target}${type}`;
    state.effects[key] = false;
    setTimeout(() => {
      state.effects[key] = true;
      setTimeout(() => {
        state.effects[key] = false;
      }, 1000);
    }, 1000);
  };

  // 回合收尾：减少状态回合并推进回合计数。
  const finalizeRound = () => {
    emitBattleHook("onRoundEnd");
    reduceRound([state.player, state.enemy], log);
    state.round += 1;
    if (state.round > state.maxRounds && !state.over) {
      state.over = true;
      state.winner = "平局";
      log("回合数达到上限，判定为平局。");
      return;
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
    const defenderSide = defender === state.player ? "player" : "enemy";
    executeSkill(
      attacker,
      defender,
      skill,
      state.round,
      log,
      (event) => {
        if (event.type === "hit") {
          triggerEffect(defenderSide, "Hit");
        }
        if (event.type === "status") {
          triggerEffect(defenderSide, "Status");
        }
      },
      {
        hookBus,
        getSession: getHookSession,
      }
    );
    const overResult = checkOver(attacker, defender);
    if (overResult.ended || overResult.skipRemainingTurn) {
      return { skipRemainingTurn: overResult.skipRemainingTurn };
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
    await sleep(350);
    const firstResult = await act(
      first,
      first === state.player ? state.enemy : state.player,
      firstSkill
    );
    if (!state.over && !firstResult?.skipRemainingTurn) {
      state.activeTurn = second === state.player ? "player" : "enemy";
      await sleep(650);
      await act(
        second,
        second === state.player ? state.enemy : state.player,
        secondSkill
      );
    }
    if (!state.over) {
      await sleep(550);
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
      log(`难度已切换为${DIFFICULTY_OPTIONS.find((d) => d.key === difficultyKey)?.label}`);
    }
  };

  // 切换连战模式，开启后击败敌人会自动进入下一场。
  const toggleChainMode = () => {
    state.chainMode = !state.chainMode;
    log(state.chainMode ? "已开启连战模式" : "已关闭连战模式");
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
