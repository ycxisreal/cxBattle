import { strengths } from "../data/strengths.js";

const ATTRIBUTE_LIMITS = {
  hpCount: { min: 30 },
  hp: { min: 0 },
  defence: { min: -100, max: 100 },
  attack: { min: 1, max: 100 },
  speed: { min: 0, max: 10 },
  criticalRate: { min: 0, max: 1 },
  missRate: { min: 0, max: 0.6 },
  criticalHurtRate: { min: 1 },
  healPerRound: { min: 0, max: 10 },
};

const getRandom = (originValue, rate) => {
  if (!rate) return originValue;
  const { low, high } = rate;
  return originValue * (Math.random() * (high - low) + low);
};

const clamp = (value, min, max) => {
  if (typeof min === "number") value = Math.max(value, min);
  if (typeof max === "number") value = Math.min(value, max);
  return value;
};

export const createUnitInstance = (base, owner) => {
  const unit = JSON.parse(JSON.stringify(base));
  unit.owner = owner ?? unit.owner ?? "";
  unit.hp = unit.hpCount;
  unit.weakStatus = null;
  unit.strongStatus = null;
  unit.armorStatus = null;
  unit.damageStatus = null;
  unit.stopRound = 0;
  return unit;
};

export const applyRandomMode = (unit) => {
  unit.hpCount = getRandom(unit.hpCount, unit.randomRate);
  unit.hp = unit.hpCount;
  unit.attack = getRandom(unit.attack, unit.randomRate);
  unit.defence = getRandom(unit.defence, unit.randomRate);
  unit.speed = getRandom(unit.speed, unit.randomRate);
  unit.criticalRate = getRandom(unit.criticalRate, unit.randomRate);
  unit.criticalHurtRate = getRandom(unit.criticalHurtRate, unit.randomRate);
  unit.missRate = getRandom(unit.missRate, unit.randomRate);
};

const normalizeSkill = (skill) => ({
  ...skill,
  accuracy: typeof skill.accuracy === "number" ? skill.accuracy : 1,
  criticalRate: typeof skill.criticalRate === "number" ? skill.criticalRate : 0,
});

const applyAttributeLimits = (unit, name) => {
  const limit = ATTRIBUTE_LIMITS[name];
  if (!limit) return;
  unit[name] = clamp(unit[name], limit.min, limit.max);
};

const outputBorderInfo = (unit, name, plus) =>
  `* ${unit.owner}的${unit.name} - ${name}已达到${plus ? "上" : "下"}限`;

const calculateStatus = (unit, attribute, baseValue = 1) => {
  switch (attribute) {
    case "atk":
      if (unit.damageStatus?.value) return baseValue + unit.damageStatus.value;
      break;
    case "def":
      if (unit.armorStatus?.value) return baseValue + unit.armorStatus.value;
      break;
    case "sp":
      if (unit.weakStatus?.powerRate) return unit.weakStatus.powerRate;
      if (unit.strongStatus?.powerRate) return unit.strongStatus.powerRate;
      break;
  }
  return baseValue;
};

const calculateDamage = (attacker, defender, rawSkill, isStrength = false) => {
  const skill = normalizeSkill(rawSkill);
  if (!skill.power) {
    return {
      damage: 0,
      isMissed: false,
      des: "伤害为0",
    };
  }

  // 命中判定（保持不变）
  const missRate = getRandom(defender.missRate, defender.randomRate);
  if (Math.random() <= missRate || Math.random() >= skill.accuracy) {
    return {
      damage: 0,
      isMissed: true,
      des: `${defender.owner}的${defender.name}闪避了${
        isStrength ? "被动特长" : ""
      }攻击`,
    };
  }

  // 暴击判定（保持不变）
  const criticalRate = getRandom(attacker.criticalRate, attacker.randomRate);
  const criticalValue = getRandom(attacker.criticalHurtRate, attacker.randomRate);
  const criticalHit =
    Math.random() <= criticalRate || Math.random() <= skill.criticalRate;

  // =========================
  // 核心：由“攻击-防御”改为“比例减伤”
  // 保持每个随机点与状态处理存在且位置基本一致：
  //  - random(skill.power) 仍然取一次
  //  - random(statusAtk(attacker.attack)) 仍然取一次
  //  - random(statusDef(defender.defence)) 仍然取一次
  //  - max(0, damage)、random(damage)、random(statusSp)、暴击倍率都保留
  // =========================

  let damage = 0;

  // 攻击侧（原先是 +power +atk）
  const powerPart = getRandom(skill.power, attacker.randomRate);
  const atkPart = getRandom(
    calculateStatus(attacker, "atk", attacker.attack),
    attacker.randomRate
  );
  const attackTotal = powerPart + atkPart;

  // 防御侧（原先是 -def）
  const defPart = getRandom(
    calculateStatus(defender, "def", defender.defence),
    defender.randomRate
  );

  // 比例减伤：mul = K/(K+def)
  // K 为内部常量，不新增/不减少数据结构
  const K = 50;
  const safeDef = Math.max(0, defPart); // 兼容防御为负的情况（你允许 defence 最低到 -100）
  const mitigationMul = K / (K + safeDef);

  damage = attackTotal * mitigationMul;

  // 保留原来的截断、随机、状态倍率、暴击（顺序保持一致）
  damage = Math.max(0, damage);
  damage = getRandom(damage, attacker.randomRate);
  damage *= getRandom(calculateStatus(attacker, "sp"), attacker.randomRate);
  if (criticalHit) damage *= criticalValue;

  // 吸血（保持不变）
  let heal = 0;
  if (skill.suckBloodRate) {
    heal = damage * skill.suckBloodRate;
    attacker.hp = Math.min(attacker.hp + heal, attacker.hpCount);
  }

  const text = isStrength
    ? `${attacker.owner}的${attacker.name}被动特长对${defender.owner}的${
      defender.name
    }造成${Math.floor(damage)}点伤害`
    : `${attacker.owner}的${attacker.name}对${defender.owner}的${
      defender.name
    }造成${Math.floor(damage)}点伤害${
      criticalHit ? "（暴击）" : ""
    }${heal > 0 ? `（吸血${Math.floor(heal)}）` : ""}`;

  return {
    damage,
    isMissed: false,
    des: text,
  };
};

//todo 目前施加状态的对象都是默认的，比如weak就是默认对方，damage默认是自己，后期需要修改一下数据结构，改为对象可以为双方
const applyStatus = (attacker, defender, rawSkill, isStrength = false) => {
  const skill = normalizeSkill(rawSkill);
  if (Math.random() >= skill.accuracy) {
    return {
      isMissed: true,
      des: `${attacker.owner}的${attacker.name}${
        isStrength ? "的被动特长" : ""
      }施加状态失败`,
    };
  }

  const outputs = [];
  for (const status of skill.putStatus || []) {
    let statusRound = status.round + 1;
    switch (status.name) {
      case "weak": {
        if (Math.random() <= defender.missRate) {
          return {
            isMissed: true,
            des: `${attacker.owner}的${attacker.name}${
              isStrength ? "的被动特长" : ""
            }施加状态失败`,
          };
        }
        if (defender.strongStatus?.round >= 0) {
          if (defender.strongStatus.round >= statusRound) {
            defender.strongStatus.round -= statusRound;
            if (defender.strongStatus.round === 0) defender.strongStatus = null;
          } else {
            statusRound -= defender.strongStatus.round;
            defender.strongStatus = null;
            defender.weakStatus = { round: statusRound, powerRate: status.rate };
          }
        } else {
          defender.weakStatus = { round: statusRound, powerRate: status.rate };
        }
        outputs.push(
          `${attacker.owner}的${attacker.name}对${defender.owner}的${
            defender.name
          }施加${status.rate}弱化，持续${status.round}回合`
        );
        break;
      }
      case "strong": {
        if (attacker.weakStatus?.round >= 0) {
          if (attacker.weakStatus.round >= statusRound) {
            attacker.weakStatus.round -= statusRound;
            if (attacker.weakStatus.round === 0) attacker.weakStatus = null;
          } else {
            statusRound -= attacker.weakStatus.round;
            attacker.weakStatus = null;
            attacker.strongStatus = {
              round: statusRound,
              powerRate: status.rate,
            };
          }
        } else {
          attacker.strongStatus = { round: statusRound, powerRate: status.rate };
        }
        outputs.push(
          `${attacker.owner}的${attacker.name}对自己施加${status.rate}强化，持续${status.round}回合`
        );
        break;
      }
      case "armor": {
        attacker.armorStatus = { round: statusRound, value: status.value };
        outputs.push(
          `${attacker.owner}的${attacker.name}对自己施加${status.value}护甲，持续${status.round}回合`
        );
        break;
      }
      case "damage": {
        attacker.damageStatus = { round: statusRound, value: status.value };
        outputs.push(
          `${attacker.owner}的${attacker.name}对自己施加${status.value}伤害加成，持续${status.round}回合`
        );
        break;
      }
    }
  }

  return {
    isMissed: false,
    des: outputs.join("；"),
  };
};

const applyChangeValue = (attacker, defender, rawSkill) => {
  const skill = normalizeSkill(rawSkill);
  const logs = [];
  for (const value of skill.changeValue || []) {
    if (Math.random() >= skill.accuracy) {
      logs.push(`${attacker.owner}的${attacker.name}属性变化失败`);
      continue;
    }
    if (value.self) {
      if (["missRate", "criticalRate"].includes(value.name)) {
        attacker[value.name] += value.rate ?? 0;
        logs.push(
          `${attacker.owner}的${attacker.name}的${value.name}增加${value.rate}`
        );
      } else {
        attacker[value.name] += value.value ?? 0;
        logs.push(
          `${attacker.owner}的${attacker.name}的${value.name}增加${value.value}`
        );
      }
      applyAttributeLimits(attacker, value.name);
      if (value.name === "hp" && attacker.hp > attacker.hpCount) {
        attacker.hp = attacker.hpCount;
        logs.push(outputBorderInfo(attacker, value.name, true));
      }
      if (value.name === "hpCount" && attacker.hp > attacker.hpCount) {
        attacker.hp = attacker.hpCount;
      }
      continue;
    }

    if (Math.random() <= defender.missRate) {
      logs.push(`${attacker.owner}的${attacker.name}属性变化失败`);
      continue;
    }

    if (value.name === "stopRound") {
      defender.stopRound += value.value ?? 0;
      logs.push(
        `${attacker.owner}的${attacker.name}使${defender.owner}的${
          defender.name
        }的${value.name}增加${value.value}`
      );
      continue;
    }

    if (["missRate", "criticalRate"].includes(value.name)) {
      defender[value.name] -= value.rate ?? 0;
      logs.push(
        `${attacker.owner}的${attacker.name}使${defender.owner}的${
          defender.name
        }的${value.name}降低${value.rate}`
      );
    } else {
      defender[value.name] -= value.value ?? 0;
      logs.push(
        `${attacker.owner}的${attacker.name}使${defender.owner}的${
          defender.name
        }的${value.name}减少${value.value}`
      );
    }

    applyAttributeLimits(defender, value.name);
    if (value.name === "hp" && defender.hp < 0) {
      defender.hp = 0;
      logs.push(outputBorderInfo(defender, value.name, false));
    }
    if (value.name === "hpCount") {
      if (defender.hp > defender.hpCount) defender.hp = defender.hpCount;
      if (defender.hpCount === ATTRIBUTE_LIMITS.hpCount.min) {
        logs.push(outputBorderInfo(defender, value.name, false));
      }
    }
  }
  return logs;
};

const executeStrength = (attacker, defender, round, addLog, onEvent) => {
  for (const strengthId of attacker.strength || []) {
    const strength = strengths.find((item) => item.id === strengthId);
    if (!strength) continue;
    const pass = checkCondition(attacker, defender, round, strength.condition);
    if (!pass) continue;
    const skill = {
      id: -1,
      name: strength.name,
      des: "",
      power: strength.power,
      putStatus: strength.status,
      changeValue: strength.changeValue,
      accuracy: strength.accuracy ?? 1,
      criticalRate: 0,
    };
    if (strength.power) {
      const msg = calculateDamage(attacker, defender, skill, true);
      defender.hp -= msg.damage;
      if (msg.damage > 0 && onEvent) {
        onEvent({ type: "hit" });
      }
      addLog(msg.des);
    }
    if (strength.status) {
      const msg = applyStatus(attacker, defender, skill, true);
      if (msg.des.trim()) addLog(msg.des);
      if (msg.des.trim() && onEvent) {
        onEvent({ type: "status" });
      }
    }
    if (strength.changeValue) {
      addLog("* 执行被动特长属性变化");
      const changeLogs = applyChangeValue(attacker, defender, skill);
      changeLogs.forEach(addLog);
      if (changeLogs.length && onEvent) {
        onEvent({ type: "status" });
      }
    }
  }
};

const checkCondition = (selfUnit, enemyUnit, round, condition) => {
  if (!condition) return false;
  let passCase = true;
  const less = condition.type === "<";
  const evalCompare = (value, target) =>
    less ? value < target : value >= target;
  const evalRate = (value, target) =>
    less ? value < target : value >= target;

  if (condition.selfCondition) {
    for (const key of Object.keys(condition.selfCondition)) {
      const target = condition.selfCondition[key];
      switch (key) {
        case "health":
          passCase = passCase && evalCompare(selfUnit.hp, target);
          break;
        case "healthRate":
          passCase =
            passCase &&
            evalRate(selfUnit.hp / selfUnit.hpCount, target);
          break;
        case "attack":
          passCase = passCase && evalCompare(selfUnit.attack, target);
          break;
        case "attackRate":
          passCase =
            passCase &&
            evalRate(selfUnit.attack / selfUnit.attackDefault, target);
          break;
        case "defence":
          passCase = passCase && evalCompare(selfUnit.defence, target);
          break;
        case "defenceRate":
          passCase =
            passCase &&
            evalRate(selfUnit.defence / selfUnit.defenceDefault, target);
          break;
      }
    }
  }

  if (condition.enemyCondition) {
    for (const key of Object.keys(condition.enemyCondition)) {
      const target = condition.enemyCondition[key];
      switch (key) {
        case "health":
          passCase = passCase && evalCompare(enemyUnit.hp, target);
          break;
        case "healthRate":
          passCase =
            passCase &&
            evalRate(enemyUnit.hp / enemyUnit.hpCount, target);
          break;
        case "attack":
          passCase = passCase && evalCompare(enemyUnit.attack, target);
          break;
        case "attackRate":
          passCase =
            passCase &&
            evalRate(enemyUnit.attack / enemyUnit.attackDefault, target);
          break;
        case "defence":
          passCase = passCase && evalCompare(enemyUnit.defence, target);
          break;
        case "defenceRate":
          passCase =
            passCase &&
            evalRate(enemyUnit.defence / enemyUnit.defenceDefault, target);
          break;
      }
    }
  }

  if (typeof condition.round === "number") {
    passCase = passCase && evalCompare(round, condition.round);
  }
  if (typeof condition.interval === "number") {
    passCase =
      passCase &&
      (condition.interval === 1 ? true : round % condition.interval === 1);
  }
  if (typeof condition.dice === "number") {
    passCase =
      passCase &&
      (less ? Math.random() < condition.dice : Math.random() >= condition.dice);
  }
  return passCase;
};

export const executeSkill = (
  attacker,
  defender,
  skill,
  round,
  addLog,
  onEvent
) => {
  if (!skill) {
    addLog(`${attacker.owner}没有可用招式`);
    return;
  }
  addLog(`${attacker.owner}的${attacker.name}使用了${skill.name}`);
  let isMissed = false;

  if (skill.power) {
    const damageInfo = calculateDamage(attacker, defender, skill);
    addLog(damageInfo.des);
    defender.hp -= damageInfo.damage;
    if (damageInfo.damage > 0 && onEvent) {
      onEvent({ type: "hit" });
    }
    isMissed = damageInfo.isMissed;
  }

  if (!isMissed && skill.putStatus?.length) {
    const statusInfo = applyStatus(attacker, defender, skill);
    if (statusInfo.des.trim()) addLog(statusInfo.des);
    if (statusInfo.des.trim() && onEvent) {
      onEvent({ type: "status" });
    }
    isMissed = statusInfo.isMissed;
  }

  if (!isMissed && skill.changeValue?.length) {
    const changeLogs = applyChangeValue(attacker, defender, skill);
    changeLogs.forEach(addLog);
    if (changeLogs.length && onEvent) {
      onEvent({ type: "status" });
    }
  }

  attacker.hp = Math.min(
    attacker.hp + (attacker.healPerRound ?? 0),
    attacker.hpCount
  );
  if (attacker.strength?.length) {
    executeStrength(attacker, defender, round, addLog, onEvent);
  }
};

export const reduceRound = (units, addLog) => {
  for (const unit of units) {
    if (unit.stopRound && unit.stopRound !== 0) {
      unit.stopRound -= 1;
      if (unit.stopRound <= 0) {
        unit.stopRound = 0;
        addLog(`${unit.owner}的${unit.name}不再被停止行动`);
      }
    }
    if (unit.strongStatus) {
      unit.strongStatus.round -= 1;
      if (unit.strongStatus.round <= 0) {
        unit.strongStatus = null;
        addLog(`${unit.owner}的${unit.name}不再处于强化状态`);
      }
    }
    if (unit.weakStatus) {
      unit.weakStatus.round -= 1;
      if (unit.weakStatus.round <= 0) {
        unit.weakStatus = null;
        addLog(`${unit.owner}的${unit.name}不再处于弱化状态`);
      }
    }
    if (unit.damageStatus) {
      unit.damageStatus.round -= 1;
      if (unit.damageStatus.round <= 0) {
        unit.damageStatus = null;
        addLog(`${unit.owner}的${unit.name}不再有伤害加成`);
      }
    }
    if (unit.armorStatus) {
      unit.armorStatus.round -= 1;
      if (unit.armorStatus.round <= 0) {
        unit.armorStatus = null;
        addLog(`${unit.owner}的${unit.name}不再有护甲加成`);
      }
    }
  }
};

export const decideOrder = (player, enemy) => {
  if (player.speed > enemy.speed) return [player, enemy];
  if (player.speed < enemy.speed) return [enemy, player];
  return Math.random() < 0.5 ? [player, enemy] : [enemy, player];
};
