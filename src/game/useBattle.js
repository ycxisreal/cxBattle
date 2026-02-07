import { computed, reactive } from "vue";
import { units } from "./data/units.js";
import { skills, skillIndex } from "./data/skills.js";
import {
  applyRandomMode,
  createUnitInstance,
  decideOrder,
  executeSkill,
  reduceRound,
} from "./engine/battle.js";

const MAX_LOGS = 120;

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

  const resetBattle = () => {
    const playerBase =
      units.find((unit) => unit.id === state.selectedPlayerId) ??
      getRandomUnit();
    const enemyBase = getRandomUnit(playerBase.id);
    state.phase = "battle";
    state.round = 1;
    state.over = false;
    state.winner = null;
    state.log = [];
    state.activeTurn = null;
    state.player = createUnitInstance(playerBase, "杨春潇");
    state.enemy = createUnitInstance(enemyBase, "对手");
    if (state.randomize) {
      applyRandomMode(state.player);
      applyRandomMode(state.enemy);
    }
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

  const checkOver = (attacker, defender) => {
    if (defender.hp <= 0) {
      state.over = true;
      state.winner = attacker.owner;
      log(`${attacker.owner}的${attacker.name}赢得了战斗！`);
      return true;
    }
    return false;
  };

  const act = async (attacker, defender, skill) => {
    if (attacker.stopRound > 0) {
      log(`${attacker.owner}的${attacker.name}无法行动`);
      return;
    }
    if (!skill) {
      log(`${attacker.owner}没有可用招式`);
      return;
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
    if (checkOver(attacker, defender)) return;
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
    await act(first, first === state.player ? state.enemy : state.player, firstSkill);
    if (!state.over) {
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
    state.player = createUnitInstance(playerBase, "杨春潇");
    state.enemy = createUnitInstance(enemyBase, "对手");
    if (state.randomize) {
      applyRandomMode(state.player);
      applyRandomMode(state.enemy);
    }
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
    resetBattle,
    chooseSkill,
    toggleRandomize,
    startBattleWithSelection,
    backToSelect,
  };
};
