import { computed, reactive } from "vue";
import { units, skills, skillIndex, strengths } from "./data/runtimeData.js";
import {
  applyRandomMode,
  createUnitInstance,
  decideOrder,
  executeSkill,
  reduceRound,
} from "./engine/battle.js";

const MAX_LOGS = 120;
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
    player: null,
    enemy: null,
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

  // 基于当前难度创建敌方实例。
  const createEnemyByDifficulty = (enemyBase) => {
    const enemyWithDifficulty = applyDifficultyToEnemyBase(enemyBase, state.difficulty);
    const enemy = createUnitInstance(enemyWithDifficulty, "对手");
    if (state.randomize) applyRandomMode(enemy);
    return enemy;
  };

  // 生成下一位连战敌人，并继承当前难度与随机模式配置。
  const spawnNextEnemy = () => {
    const nextEnemyBase = getRandomUnit(state.selectedPlayerId);
    state.selectedEnemyId = nextEnemyBase.id;
    state.enemy = createEnemyByDifficulty(nextEnemyBase);
    state.enemyIndex += 1;
    log(`连战继续：第${state.enemyIndex}个敌人 ${state.enemy.name} 登场`);
  };

  // 同步更新当前战斗中的敌人面板数值与被动。
  const refreshEnemyByDifficulty = () => {
    if (!state.enemy || !state.selectedEnemyId) return;
    const enemyBase = units.find((unit) => unit.id === state.selectedEnemyId);
    if (!enemyBase) return;
    const hpRate = state.enemy.hpCount > 0 ? state.enemy.hp / state.enemy.hpCount : 1;
    const nextEnemy = createEnemyByDifficulty(enemyBase);
    nextEnemy.hp = clamp(nextEnemy.hpCount * hpRate, 0, nextEnemy.hpCount);
    state.enemy = nextEnemy;
  };

  const resetBattle = () => {
    const playerBase =
      units.find((unit) => unit.id === state.selectedPlayerId) ??
      getRandomUnit();
    const enemyBase = getRandomUnit(playerBase.id);
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
    log("请选择招式，玩家先手。");
    logger.push(`第 ${state.round} 回合`, "round", state.round);
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

  const finalizeRound = () => {
    reduceRound([state.player, state.enemy], log);
    state.round += 1;
    if (state.round > state.maxRounds && !state.over) {
      state.over = true;
      state.winner = "平局";
      log("回合数达到上限，判定为平局。");
      return;
    }
    logger.push(`第 ${state.round} 回合`, "round", state.round);
  };

  // 检查战斗是否结束；连战模式下击败敌人会直接切入下一名敌人。
  const checkOver = (attacker, defender) => {
    if (defender.hp <= 0) {
      if (defender === state.enemy && state.chainMode) {
        log(`${attacker.owner}击败了第${state.enemyIndex}个敌人`);
        spawnNextEnemy();
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
    state.busy = true;
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
    const enemyBase = getRandomUnit(playerBase.id);
    state.selectedEnemyId = enemyBase.id;
    state.player = createUnitInstance(playerBase, "杨春潇");
    state.enemy = createEnemyByDifficulty(enemyBase);
    state.enemyIndex = 1;
    if (state.randomize) applyRandomMode(state.player);
    state.selectedPlayerId = playerBase.id;
    state.phase = "battle";
    state.round = 1;
    state.over = false;
    state.winner = null;
    state.log = [];
    state.activeTurn = null;
    log(`战斗初始化：${state.player.name} vs ${state.enemy.name}`);
    log("请选择招式，玩家先手。");
    logger.push(`第 ${state.round} 回合`, "round", state.round);
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
  };

  return {
    state,
    skills,
    playerSkills,
    availableUnits,
    difficultyOptions: DIFFICULTY_OPTIONS,
    resetBattle,
    setDifficulty,
    toggleChainMode,
    chooseSkill,
    toggleRandomize,
    startBattleWithSelection,
    backToSelect,
  };
};
