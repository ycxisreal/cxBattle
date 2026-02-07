import { skillList, units, strengths } from "./units.js";
import * as readline from "node:readline";

let round = 1;
let end = false;

/** @type {Unit} */
let testUnit = {
  id: 111,
  name: "Nothing",
  owner: "",
  hpCount: 200,
  hp: 200,
  defence: 35,
  defenceDefault: 35,
  attack: 10,
  attackDefault: 10,
  strength: [2],
  skillList: [111],
  missRate: 0.0,
  criticalRate: 0.1,
  criticalHurtRate: 1.5,
  healPerRound: 0,
  speed: 4,
  randomRate: { low: 0.8, high: 1.2 },
  weakStatus: null,
  strongStatus: null,
  armorStatus: null,
  damageStatus: null,
  stopRound: 0,
  des: "A test unit.",
};

let eUnit = {
  ...units[Math.floor(Math.random() * units.length)],
};
let pUnit = {
  ...units[Math.floor(Math.random() * units.length)],
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * TODO
 * - 考虑技能触发时机或使用次数
 * - 流派
 * - 多单位需要重写大部分代码
 * - 减少 hp 用一个函数封装（可处理反弹）
 * - 可视化优先级：高
 * - 数据库
 */

/**
 * 开始战斗主循环
 * @param {Unit} u1
 * @param {Unit} u2
 */
const handleStartBattle = (u1, u2) => {
  applyRandomMode([u1, u2]);
  while (!end) {
    console.log(`-- 回合: ${round} --`);
    console.log(
      `${u1.owner} 的 ${u1.name}: ${u1.hp.toFixed(2)} 血量, ${u1.defence.toFixed(
        1
      )} 防御, ${u1.attack.toFixed(1)} 攻击, ${u1.criticalRate.toFixed(
        1
      )} 暴击率, ${u1.missRate.toFixed(2)} 闪避率.`
    );
    console.log(
      `${u2.owner} 的 ${u2.name}: ${u2.hp.toFixed(2)} 血量, ${u2.defence.toFixed(
        1
      )} 防御, ${u2.attack.toFixed(1)} 攻击, ${u2.criticalRate.toFixed(
        1
      )} 暴击率, ${u2.missRate.toFixed(2)} 闪避率.`
    );

    let sk1 = chooseSkillRandomMode(u1);
    let sk2 = chooseSkillRandomMode(u2);

    // TODO 执行后刷新血量展示
    if (u1.speed > u2.speed) {
      if (u1.stopRound === 0) {
        executeSkill(sk1, u1, u2);
      }
      if (end) break;
      if (u2.stopRound === 0) {
        executeSkill(sk2, u2, u1);
      }
    } else if (u1.speed < u2.speed) {
      if (u2.stopRound === 0) {
        executeSkill(sk2, u2, u1);
      }
      if (end) break;
      if (u1.stopRound === 0) {
        executeSkill(sk1, u1, u2);
      }
    } else if (u1.speed === u2.speed) {
      if (Math.random() < 0.5) {
        if (u1.stopRound === 0) {
          executeSkill(sk1, u1, u2);
        }
        if (end) break;
        if (u2.stopRound === 0) {
          executeSkill(sk2, u2, u1);
        }
      } else {
        if (u1.stopRound === 0) {
          executeSkill(sk1, u1, u2);
        }
        if (end) break;
        if (u2.stopRound === 0) {
          executeSkill(sk2, u2, u1);
        }
      }
    }
    reduceRound([u1, u2]);
    round++;
    if (round > 100) {
      console.warn("回合数达到上限，判定为平局");
      end = true;
    }
  }
  rl.close();
};

/**
 * 按随机倍率调整单位属性
 * @param {Unit[]} units
 */
const applyRandomMode = (units) => {
  for (const unit of units) {
    unit.hpCount = getRandom(unit.hpCount, unit.randomRate);
    unit.hp = unit.hpCount;
    unit.attack = getRandom(unit.attack, unit.randomRate);
    unit.defence = getRandom(unit.defence, unit.randomRate);
    unit.speed = getRandom(unit.speed, unit.randomRate);
    unit.criticalRate = getRandom(unit.criticalRate, unit.randomRate);
    unit.criticalHurtRate = getRandom(unit.criticalHurtRate, unit.randomRate);
    unit.missRate = getRandom(unit.missRate, unit.randomRate);
  }
};

/**
 * 选择技能（玩家/AI）
 * @param {boolean} player
 * @param {Unit} u
 * @returns {number} - skillList 索引
 */
const chooseSkill = (player, u) => {
  let number = -1;
  if (player) {
    rl.question("选择技能编号：", (input) => {
      number = parseFloat(input);
      rl.close();
    });
  } else {
    let count = u.skillList.length;
    number = Math.floor(Math.random() * count);
  }
  return number;
};

/**
 * 随机选择技能
 * @param {Unit} u
 * @returns {number}
 */
const chooseSkillRandomMode = (u) => {
  let number = -1;
  if (u.skillList === null || u.skillList.length === 0) return number;
  let count = u.skillList.length;
  number = Math.floor(Math.random() * count);
  return number;
};

/**
 * 执行技能（伤害/状态/属性变更）
 * @param {number} index
 * @param {Unit} u1
 * @param {Unit} u2
 */
const executeSkill = (index, u1, u2) => {
  let skillId = u1.skillList[index];
  let skill = skillList.find((i) => {
    return i.id === skillId;
  });
  let isMiss = false;
  console.log(`${u1.owner} 的 ${u1.name} 使用了 ${skill.name}`);
  // 三种效果可并存，依次执行
  if (skill.power !== null && skill.power !== undefined && skill.power !== 0) {
    let damageInfo = calculateDamage(u1, u2, skill);
    console.log(damageInfo.des);
    u2.hp -= damageInfo.damage;
    isMiss = damageInfo.isMissed;
  }
  if (!isMiss && skill.putStatus && skill.putStatus.length !== 0) {
    let statusInfo = putStatus(u1, u2, skill);
    if (statusInfo.des.trim() !== "") console.log(statusInfo.des);
    isMiss = statusInfo.isMissed;
  }
  if (!isMiss && skill.changeValue && skill.changeValue.length !== 0) {
    // 这里需要 for 循环每一项都要独立判断 miss
    changeValue(u1, u2, skill);
  }

  // 回合结束治疗
  u1.hp += u1.healPerRound;
  if (u1.hp > u1.hpCount) u1.hp = u1.hpCount;

  if (u1.strength && u1.strength.length > 0)
    executeUnitStrength(u1, u2, round);

  if (u2.hp <= 0) over(u1);
};

/**
 * 结束战斗
 * @param {Unit} u
 */
const over = (u) => {
  end = true;
  console.warn(`${u.owner} 的 ${u.name} 赢得了战斗！`);
};

/**
 * 施加状态
 * @param {Unit} u1
 * @param {Unit} u2
 * @param {Skill} skill
 * @param {boolean} isStrength
 * @returns {DamageDesc}
 */
const putStatus = (u1, u2, skill, isStrength = false) => {
  if (Math.random() >= skill.accuracy) {
    return {
      damage: 0,
      isMissed: true,
      des: `${u1.owner} 的 ${u1.name}${
        isStrength ? " 的连招" : ""
      } 施加状态失败！`,
    };
  }
  let statuses = skill.putStatus;
  for (const status of statuses) {
    let round = status.round + 1; // 多加 1，循环结束前会 -1
    switch (status.name) {
      case "weak": {
        if (Math.random() <= u2.missRate) {
          return {
            damage: 0,
            isMissed: true,
            des: `${u1.owner} 的 ${u1.name}${
              isStrength ? " 的连招" : ""
            } 施加状态失败！`,
          };
        }
        // 与 strong 抵消
        if (u2.strongStatus && u2.strongStatus.round >= 0) {
          if (u2.strongStatus.round >= round) {
            u2.strongStatus.round -= round;
            if (u2.strongStatus.round === 0) u2.strongStatus = null;
          } else {
            round -= u2.strongStatus.round;
            u2.strongStatus = null;
            u2.weakStatus = {
              round: round,
              powerRate: status.rate,
            };
          }
        } else {
          u2.weakStatus = {
            round: round,
            powerRate: status.rate,
          };
        }
        console.log(
          `${u1.owner} 的 ${u1.name} 对 ${u2.owner} 的 ${u2.name} 施加 ${status.rate} 弱化，持续 ${status.round} 回合`
        );
        break;
      }
      case "strong": {
        if (u1.weakStatus && u1.weakStatus.round >= 0) {
          if (u1.weakStatus.round >= round) {
            u1.weakStatus.round -= round;
            if (u1.weakStatus.round === 0) u1.weakStatus = null;
          } else {
            round -= u1.weakStatus.round;
            u1.weakStatus = null;
            u1.strongStatus = {
              round: round,
              powerRate: status.rate,
            };
          }
        } else {
          u1.strongStatus = {
            round: round,
            powerRate: status.rate,
          };
        }
        console.log(
          `${u1.owner} 的 ${u1.name} 对自己施加 ${status.rate} 强化，持续 ${status.round} 回合`
        );
        break;
      }
      case "armor": {
        u1.armorStatus = {
          round: round,
          value: status.value,
        };
        console.log(
          `${u1.owner} 的 ${u1.name} 对自己施加 ${status.value} 护甲，持续 ${status.round} 回合`
        );
        break;
      }
      case "damage": {
        u1.damageStatus = {
          round: round,
          value: status.value,
        };
        console.log(
          `${u1.owner} 的 ${u1.name} 对自己施加 ${status.value} 伤害加成，持续 ${status.round} 回合`
        );
        break;
      }
    }
  }
  return {
    damage: 0,
    isMissed: false,
    des: "",
  };
};

/**
 * 执行属性变更
 * @param {Unit} u1
 * @param {Unit} u2
 * @param {Skill} skill
 */
const changeValue = (u1, u2, skill) => {
  let cvs = skill.changeValue;
  for (const cv of cvs) {
    let changeInfo = attributeChange(u1, u2, cv, skill.accuracy);
    if (changeInfo.des.trim() !== "") console.log(changeInfo.des);
  }
};

/**
 * 单条属性变更
 * @param {Unit} u1
 * @param {Unit} u2
 * @param {ChangeValue} value
 * @param {number} accuracy
 * @returns {DamageDesc}
 */
const attributeChange = (u1, u2, value, accuracy) => {
  if (Math.random() >= accuracy) {
    return {
      damage: 0,
      isMissed: true,
      des: `${u1.owner} 的 ${u1.name} 的属性变化失败！`,
    };
  }
  if (value.self) {
    if (
      [
        "hp",
        "hpCount",
        "defence",
        "attack",
        "speed",
        "criticalHurtRate",
        "healPerRound",
        "stopRound",
      ].includes(value.name)
    ) {
      u1[value.name] += value.value;
      console.log(
        `${u1.owner} 的 ${u1.name} 的 ${value.name} 增加 ${value.value}`
      );
      if (value.name === "hp" && u1.hp > u1.hpCount) {
        u1.hp = u1.hpCount;
        outputAttributeBorderInfo(u1, value.name, true);
      } else if (value.name === "defence" && u1.defence > 100) {
        u1.defence = 100;
        outputAttributeBorderInfo(u1, value.name, true);
      } else if (value.name === "attack" && u1.attack > 100) {
        u1.attack = 100;
        outputAttributeBorderInfo(u1, value.name, true);
      } else if (value.name === "speed" && u1.speed > 10) {
        u1.speed = 10;
        outputAttributeBorderInfo(u1, value.name, true);
      } else if (value.name === "healPerRound" && u1.healPerRound > 10) {
        u1.healPerRound = 10;
        outputAttributeBorderInfo(u1, value.name, true);
      }
    } else if (["missRate", "criticalRate"].includes(value.name)) {
      u1[value.name] += value.rate;
      console.log(
        `${u1.owner} 的 ${u1.name} 的 ${value.name} 增加 ${value.rate}`
      );
      if (value.name === "missRate" && u1.missRate > 0.6) {
        u1.missRate = 0.6;
        outputAttributeBorderInfo(u1, value.name, true);
      } else if (value.name === "criticalRate" && u1.criticalRate > 1) {
        u1.criticalRate = 1;
        outputAttributeBorderInfo(u1, value.name, true);
      }
    }
  } else {
    if (Math.random() <= u2.missRate) {
      return {
        damage: 0,
        isMissed: true,
        des: `${u1.owner} 的 ${u1.name} 的属性变化失败！`,
      };
    }
    // hpCount 需要特殊处理，hp 也要跟着变
    if (
      [
        "hp",
        "hpCount",
        "defence",
        "attack",
        "speed",
        "criticalHurtRate",
        "healPerRound",
        "stopRound",
      ].includes(value.name)
    ) {
      if (value.name === "stopRound") {
        u2[value.name] += value.value;
        console.log(
          `${u1.owner} 的 ${u1.name} 使 ${u2.owner} 的 ${u2.name} 的 ${value.name} 增加 ${value.value}`
        );
        return {
          damage: 0,
          isMissed: false,
          des: "",
        };
      }
      u2[value.name] -= value.value;
      console.log(
        `${u1.owner} 的 ${u1.name} 使 ${u2.owner} 的 ${u2.name} 的 ${value.name} 减少 ${value.value}`
      );
      if (value.name === "hp" && u2.hp < 0) {
        u2.hp = 0;
        outputAttributeBorderInfo(u2, value.name, false);
      } else if (value.name === "hpCount") {
        if (u2.hpCount < 30) {
          u2.hpCount = 30;
          outputAttributeBorderInfo(u2, value.name, false);
        }
        if (u2.hp > u2.hpCount) u2.hp = u2.hpCount;
      } else if (value.name === "defence" && u2.defence < -100) {
        u2.defence = -100;
        outputAttributeBorderInfo(u2, value.name, false);
      } else if (value.name === "attack" && u2.attack < 1) {
        u2.attack = 1;
        outputAttributeBorderInfo(u2, value.name, false);
      } else if (value.name === "speed" && u2.speed < 0) {
        u2.speed = 0;
      } else if (value.name === "criticalHurtRate" && u2.criticalHurtRate < 1) {
        u2.criticalHurtRate = 1;
        outputAttributeBorderInfo(u2, value.name, false);
      } else if (value.name === "healPerRound" && u2.healPerRound < 0) {
        u2.healPerRound = 0;
        outputAttributeBorderInfo(u2, value.name, false);
      }
    } else if (["missRate", "criticalRate"].includes(value.name)) {
      u2[value.name] -= value.rate;
      console.log(
        `${u1.owner} 的 ${u1.name} 使 ${u2.owner} 的 ${u2.name} 的 ${value.name} 降低 ${value.rate}`
      );
      if (value.name === "missRate" && u2.missRate < 0) {
        u2.missRate = 0;
        outputAttributeBorderInfo(u2, value.name, false);
      } else if (value.name === "criticalRate" && u2.criticalRate < 0) {
        u2.criticalRate = 0;
        outputAttributeBorderInfo(u2, value.name, false);
      }
    }
  }
  return {
    damage: 0,
    isMissed: false,
    des: "",
  };
};

/**
 * 输出属性达到边界的信息
 * @param {Unit} u
 * @param {string} name
 * @param {boolean} plus
 */
const outputAttributeBorderInfo = (u, name, plus) => {
  if (plus) {
    console.log(`* ${u.owner} 的 ${u.name} - ${name} 已达到上限`);
  } else {
    console.log(`* ${u.owner} 的 ${u.name} - ${name} 已达到下限`);
  }
};

/**
 * 计算伤害
 * @param {Unit} u1
 * @param {Unit} u2
 * @param {Skill} skill
 * @param {boolean} isStrength
 * @returns {DamageDesc} damage
 */
const calculateDamage = (u1, u2, skill, isStrength = false) => {
  if (skill.power === null || skill.power === 0)
    return {
      damage: 0,
      des: "伤害为 0",
      isMissed: false,
    };
  let p = skill.power;
  let damage = 0;
  let randomRate1 = u1.randomRate;
  let randomRate2 = u2.randomRate;
  let missRate = getRandom(u2.missRate, randomRate2);
  if (Math.random() <= missRate)
    return {
      damage: 0,
      des: `${u2.name} 闪避了${isStrength ? "连招" : ""}攻击`,
      isMissed: true,
    };
  if (Math.random() >= skill.accuracy) {
    return {
      damage: 0,
      des: `${u2.name} 闪避了${isStrength ? "连招" : ""}攻击`,
      isMissed: true,
    };
  }
  let criticRate = getRandom(u1.criticalRate, randomRate1);
  let isCritical = false;
  let criticalValue = getRandom(u1.criticalHurtRate, randomRate1);
  if (Math.random() <= criticRate) isCritical = true;
  if (!isCritical && Math.random() <= skill.criticalRate) isCritical = true;
  damage += getRandom(p, randomRate1);
  damage += getRandom(calculateStatus(u1, "atk", u1.attack), randomRate1);
  damage -= getRandom(calculateStatus(u2, "def", u2.defence), randomRate2);
  if (damage < 0) damage = 0;
  damage = getRandom(damage, randomRate1);
  damage *= getRandom(calculateStatus(u1, "sp"), randomRate1);
  if (isCritical) damage *= criticalValue;
  let heal = 0;
  if (skill.suckBloodRate) {
    heal = damage * skill.suckBloodRate;
    u1.hp += heal;
    if (u1.hp > u1.hpCount) u1.hp = u1.hpCount;
  }
  if (!isStrength)
    return {
      damage: damage,
      des: `${u1.owner} 的 ${u1.name} 对 ${u2.owner} 的 ${
        u2.name
      } 造成 ${Math.floor(damage)} 点伤害。` +
        `${isCritical ? " 暴击！" : ""}` +
        `${heal > 0 ? ` 吸血 ${Math.floor(heal)} 点。` : ""}`,
      isMissed: false,
    };
  else
    return {
      damage: damage,
      des: `${u1.owner} 的 ${u1.name} 的连招对 ${u2.owner} 的 ${
        u2.name
      } 造成 ${Math.floor(damage)} 点伤害。`,
      isMissed: false,
    };
};

/**
 * 获取随机倍率后的数值
 * @param {number} originValue
 * @param {RandomRate} r
 * @returns {number}
 */
const getRandom = (originValue, r) => {
  let { low, high } = r;
  return originValue * (Math.random() * (high - low) + low);
};

/**
 * 执行单位的连招/额外动作
 * @param {Unit} u1
 * @param {Unit} u2
 * @param {number} round
 */
const executeUnitStrength = (u1, u2, round) => {
  for (const nst of u1.strength) {
    let strength = strengths.find((i) => {
      return i.id === nst;
    });
    let pass = false; // 是否通过单次判定
    let passCase = true; // 是否通过之前的判定
    // 判断 condition
    if (strength.condition !== null) {
      let less = strength.condition.type === "<";
      if (strength.condition.selfCondition) {
        for (const key in strength.condition.selfCondition) {
          switch (key) {
            case "health": {
              if (less) {
                pass = u1.hp < strength.condition.selfCondition.health;
              } else {
                pass = u1.hp >= strength.condition.selfCondition.health;
              }
              break;
            }
            case "healthRate": {
              if (less) {
                if (u1.hp / u1.hpCount < strength.condition.selfCondition.healthRate)
                  pass = true;
              } else {
                if (u1.hp / u1.hpCount >= strength.condition.selfCondition.healthRate)
                  pass = true;
              }
              break;
            }
            case "attack": {
              if (less) {
                pass = u1.attack < strength.condition.selfCondition.attack;
              } else {
                pass = u1.attack >= strength.condition.selfCondition.attack;
              }
              break;
            }
            case "attackRate": {
              if (less) {
                pass =
                  u1.attack / u1.attackDefault <
                  strength.condition.selfCondition.attackRate;
              } else {
                pass =
                  u1.attack / u1.attackDefault >=
                  strength.condition.selfCondition.attackRate;
              }
              break;
            }
            case "defence": {
              if (less) {
                pass = u1.defence < strength.condition.selfCondition.defence;
              } else {
                pass = u1.defence >= strength.condition.selfCondition.defence;
              }
              break;
            }
            case "defenceRate": {
              if (less) {
                pass =
                  u1.defence / u1.defenceDefault <
                  strength.condition.selfCondition.defenceRate;
              } else {
                pass =
                  u1.defence / u1.defenceDefault >=
                  strength.condition.selfCondition.defenceRate;
              }
              break;
            }
          }
          passCase = passCase && pass;
        }
      }
      if (strength.condition.enemyCondition) {
        for (const key in strength.condition.enemyCondition) {
          switch (key) {
            case "health": {
              if (less) {
                pass = u2.hp < strength.condition.enemyCondition.health;
              } else {
                pass = u2.hp >= strength.condition.enemyCondition.health;
              }
              break;
            }
            case "healthRate": {
              if (less) {
                if (u2.hp / u2.hpCount < strength.condition.enemyCondition.healthRate)
                  pass = true;
              } else {
                if (u2.hp / u2.hpCount >= strength.condition.enemyCondition.healthRate)
                  pass = true;
              }
              break;
            }
            case "attack": {
              if (less) {
                pass = u2.attack < strength.condition.enemyCondition.attack;
              } else {
                pass = u2.attack >= strength.condition.enemyCondition.attack;
              }
              break;
            }
            case "attackRate": {
              if (less) {
                pass =
                  u2.attack / u2.attackDefault <
                  strength.condition.enemyCondition.attackRate;
              } else {
                pass =
                  u2.attack / u2.attackDefault >=
                  strength.condition.enemyCondition.attackRate;
              }
              break;
            }
            case "defence": {
              if (less) {
                pass = u2.defence < strength.condition.enemyCondition.defence;
              } else {
                pass = u2.defence >= strength.condition.enemyCondition.defence;
              }
              break;
            }
            case "defenceRate": {
              if (less) {
                pass =
                  u2.defence / u2.defenceDefault <
                  strength.condition.enemyCondition.defenceRate;
              } else {
                pass =
                  u2.defence / u2.defenceDefault >=
                  strength.condition.enemyCondition.defenceRate;
              }
              break;
            }
          }
          passCase = passCase && pass;
        }
      }
      if (strength.condition.round) {
        if (less) {
          pass = round < strength.condition.round;
        } else {
          pass = round >= strength.condition.round;
        }
        passCase = passCase && pass;
      }
      if (strength.condition.interval) {
        // 例如 interval 3：每 3 回合触发一次，即第 1/4/7/10 回合
        if (strength.condition.interval === 1) pass = true;
        else pass = round % strength.condition.interval === 1;
        passCase = passCase && pass;
      }
      if (strength.condition.dice) {
        if (less) {
          pass = Math.random() < strength.condition.dice;
        } else {
          pass = Math.random() >= strength.condition.dice;
        }
        passCase = passCase && pass;
      }
    }
    if (!passCase) continue;
    let skill = {
      id: -1,
      name: strength.name,
      des: "",
      power: strength.power,
      putStatus: strength.status,
      changeValue: strength.changeValue,
      accuracy: strength.accuracy,
      criticalRate: 0,
    };
    if (strength.power) {
      let msg = calculateDamage(u1, u2, skill, true);
      u2.hp -= msg.damage;
      console.log(msg.des);
    }
    if (strength.status) {
      let msg = putStatus(u1, u2, skill, true);
      if (msg.des.trim() !== "") console.log(msg.des);
    }
    if (strength.changeValue) {
      // TODO 后面改
      console.log("* 执行连招属性变化");
      changeValue(u1, u2, skill);
    }
  }
};

/**
 * 计算状态对属性的影响
 * @param {Unit} u
 * @param {string} attribute
 * @param {number?} v
 * @returns {number}
 */
const calculateStatus = (u, attribute, v = 1) => {
  switch (attribute) {
    case "atk": {
      if (u.damageStatus && u.damageStatus.value) {
        let damage = u.damageStatus.value;
        return v + damage;
      }
      break;
    }
    case "def": {
      if (u.armorStatus && u.armorStatus.value) {
        let def = u.armorStatus.value;
        return v + def;
      }
      break;
    }
    case "sp": {
      if (u.weakStatus && u.weakStatus.powerRate) return u.weakStatus.powerRate;
      if (u.strongStatus && u.strongStatus.powerRate)
        return u.strongStatus.powerRate;
      break;
    }
  }
  return v;
};

/**
 * 回合结束时减少状态回合数
 * @param {Unit[]} units
 */
const reduceRound = (units) => {
  for (const unit of units) {
    if (unit.stopRound && unit.stopRound !== 0) {
      unit.stopRound--;
      if (unit.stopRound <= 0) {
        // round 不能为 null
        unit.stopRound = 0;
        console.log(`${unit.owner} 的 ${unit.name} 不再被停止行动`);
      }
    }
    if (unit.strongStatus) {
      unit.strongStatus.round--;
      if (unit.strongStatus.round <= 0) {
        unit.strongStatus = null;
        console.log(`${unit.owner} 的 ${unit.name} 不再处于强化状态`);
      }
    }
    if (unit.weakStatus) {
      unit.weakStatus.round--;
      if (unit.weakStatus.round <= 0) {
        unit.weakStatus = null;
        console.log(`${unit.owner} 的 ${unit.name} 不再处于弱化状态`);
      }
    }
    if (unit.damageStatus) {
      unit.damageStatus.round--;
      if (unit.damageStatus.round <= 0) {
        unit.damageStatus = null;
        console.log(`${unit.owner} 的 ${unit.name} 不再有伤害加成`);
      }
    }
    if (unit.armorStatus) {
      unit.armorStatus.round--;
      if (unit.armorStatus.round <= 0) {
        unit.armorStatus = null;
        console.log(`${unit.owner} 的 ${unit.name} 不再有护甲加成`);
      }
    }
  }
};

eUnit.owner = "ycx";
pUnit.owner = "test";

// 执行
handleStartBattle(eUnit, testUnit);
