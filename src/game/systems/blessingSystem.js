// 输出祝福日志：优先侧边短日志，其次主战斗日志。
const outputBlessingLog = (ctx, text) => {
  if (typeof ctx?.sideLog === "function") {
    ctx.sideLog(text);
    return;
  }
  ctx?.log?.(text);
};

const HOLY_SHIELD_STRENGTH_ID = 22;
const SOUL_HARVEST_SKILL_ID = 27;

// 获取祝福当前层数，默认至少为1层。
const getBlessingStack = (state, blessingId) =>
  Math.max(1, Number(state?.blessings?.find((item) => item.id === blessingId)?.stack || 1));

// 为玩家恢复生命值，返回实际恢复量。
const healPlayer = (state, amount) => {
  if (!state?.player || state.player.hp <= 0) return 0;
  const before = Number(state.player.hp || 0);
  state.player.hp = Math.min(before + Math.max(0, Number(amount || 0)), Number(state.player.hpCount || 0));
  return Math.max(0, Math.floor(state.player.hp - before));
};

// 统一判定玩家触发，避免敌方事件误触发。
const isPlayerActor = (ctx, state) => ctx?.actor && state?.player && ctx.actor === state.player;

/*
创建祝福实现注册表，返回 implKey -> handlerFactory 的映射。
handlerFactory 入参结构：
- state: BattleState（useBattle.js 的响应式状态）
  - player: UnitInstance，玩家单位
  - enemy: UnitInstance，敌方单位
  - blessings: BlessingInstance[]，已拥有祝福实例列表
  - 其他回合/构筑字段（round、draft 等）
- blessingDef: BlessingDef（静态定义）
  - id: number
  - name: string
  - implKey: string
  - quality/cost/desc/repeatable/maxStack 等配置字段
- instance: BlessingInstance（本次安装返回的运行时实例）
  - id: number（对应 blessingDef.id）
  - stack: number（当前层数）
  - cooldown: number
  - state: Record<string, any>（实例私有状态）

事件处理器签名：handler(ctx)
ctx 来自 hookBus.emit，常用字段：
- actor/target/skill/damage/isStrength/criticalHit/source
- round/session/meta
- log/sideLog（日志函数）
*/
const createBlessingRegistry = () => ({
  // 玩家造成伤害时按层数增伤。
  player_damage_boost: ({ state, blessingDef }) => ({
    // onBeforeDamage: 可直接改写 ctx.damage。
    onBeforeDamage(ctx) {
      if (ctx.actor !== state.player) return;
      if (!Number.isFinite(ctx.damage)) return;
      const stack =
        Number(state.blessings.find((item) => item.id === blessingDef.id)?.stack || 1);
      const bonusRate = 0.12 * Math.max(1, stack);
      ctx.damage *= 1 + bonusRate;
      outputBlessingLog(
        ctx,
        `[祝福] ${blessingDef.name}触发：技能伤害提高${Math.floor(bonusRate * 100)}%`
      );
    },
  }),
  // 回合开始时按层数恢复生命。
  round_heal: ({ state, blessingDef }) => ({
    // onRoundStart: 这里不依赖伤害字段，仅使用 state.player。
    onRoundStart(ctx) {
      const stack = getBlessingStack(state, blessingDef.id);
      const healed = healPlayer(state, 5 * stack);
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：恢复${healed}点生命`);
      }
    },
  }),
  // 暴击后追加攻击力系数伤害，系数随层数提升，最高100%攻击力。
  chain_critical_hit: ({ state, blessingDef }) => ({
    onCrit(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || ctx.target.hp <= 0) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const ratio = Math.min(1, 0.2 * stack);
      const extraDamage = Math.max(0, Math.floor(Number(state.player.attack || 0) * ratio));
      if (!extraDamage) return;
      ctx.target.hp = Math.max(0, Number(ctx.target.hp || 0) - extraDamage);
      outputBlessingLog(
        ctx,
        `[祝福] ${blessingDef.name}触发：追加${extraDamage}点伤害`
      );
    },
  }),
  // 击杀时提升攻击力，单次+5，累计上限随祝福层数成长（每层+5）。
  on_kill_gain_power: ({ state, blessingDef, instance }) => ({
    onKill(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const cap = 5 * stack;
      const gained = Number(instance.state.attackGain || 0);
      if (gained >= cap) return;
      state.player.attack = Number(state.player.attack || 0) + 5;
      instance.state.attackGain = Math.min(cap, gained + 5);
      outputBlessingLog(
        ctx,
        `[祝福] ${blessingDef.name}触发：攻击+5（${instance.state.attackGain}/${cap}）`
      );
    },
  }),
  // 击杀时回复已损失生命值20%。
  life_steal_on_hit: ({ state, blessingDef }) => ({
    onKill(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      const missingHp = Math.max(0, Number(state.player.hpCount || 0) - Number(state.player.hp || 0));
      if (!missingHp) return;
      const healed = healPlayer(state, Math.floor(missingHp * 0.2));
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：恢复${healed}点生命`);
      }
    },
  }),
  // 回合开始自动造成固定伤害，随层数叠加。
  interval_auto_fire: ({ state, blessingDef }) => ({
    onRoundStart(ctx) {
      if (!state?.enemy || state.enemy.hp <= 0) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const damage = 10 * stack;
      state.enemy.hp = Math.max(0, Number(state.enemy.hp || 0) - damage);
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：对敌方造成${damage}点伤害`);
    },
  }),
  // 使用无威力技能时恢复生命。
  knight_valor: ({ state, blessingDef }) => ({
    onBeforeAction(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (Number(ctx?.skill?.power || 0) > 0) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const healed = healPlayer(state, 4 * stack);
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：恢复${healed}点生命`);
      }
    },
  }),
  // 回合结束时若存在正面增益则恢复生命。
  local_knowledge: ({ state, blessingDef }) => ({
    onRoundEnd(ctx) {
      if (!state?.player || state.player.hp <= 0) return;
      const hasBuff =
        Number(state.player.strongStatus?.round || 0) > 0 ||
        Number(state.player.armorStatus?.round || 0) > 0 ||
        Number(state.player.damageStatus?.round || 0) > 0;
      if (!hasBuff) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const healed = healPlayer(state, 3 * stack);
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：恢复${healed}点生命`);
      }
    },
  }),
  // 暴击时有概率追加目标当前生命值比例伤害。
  heavy_trample_hit: ({ state, blessingDef }) => ({
    onCrit(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || ctx.target.hp <= 0) return;
      if (Math.random() > 0.2) return;
      const extraDamage = Math.max(0, Math.floor(Number(ctx.target.hp || 0) * 0.3));
      if (!extraDamage) return;
      ctx.target.hp = Math.max(0, Number(ctx.target.hp || 0) - extraDamage);
      outputBlessingLog(
        ctx,
        `[祝福] ${blessingDef.name}触发：追加${extraDamage}点生命值伤害`
      );
    },
  }),
  // 安装时给玩家添加神圣护盾被动。
  add_holy_shield: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const list = Array.isArray(state.player.strength) ? state.player.strength : [];
      if (!list.includes(HOLY_SHIELD_STRENGTH_ID)) {
        state.player.strength = [...list, HOLY_SHIELD_STRENGTH_ID];
      }
      instance.state.installed = true;
    },
  }),
  // 安装时给玩家添加灵魂收割技能。
  soul_harvest: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const list = Array.isArray(state.player.skillList) ? state.player.skillList : [];
      if (!list.includes(SOUL_HARVEST_SKILL_ID)) {
        state.player.skillList = [...list, SOUL_HARVEST_SKILL_ID];
      }
      instance.state.installed = true;
    },
  }),
  // 提升防御：支持重复获取，按当前层数补齐未生效增量。
  reinforced_armor: ({ state, blessingDef, instance }) => ({
    // 中文注释：统一补齐层数增量，供安装/回合开始/层数变化复用。
    applyStackDelta() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.defence = Number(state.player.defence || 0) + 10 * deltaStack;
      instance.state.appliedStack = stack;
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 安装时立刻获得10回合15%强化状态。
  great_katana: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      state.player.strongStatus = { round: 10, powerRate: 1.15 };
      instance.state.installed = true;
    },
  }),
  // 安装时提升随机倍率上下限。
  dice_improve_plan_a: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const current = state.player.randomRate || { low: 1, high: 1 };
      state.player.randomRate = {
        low: Number(current.low || 0) + 0.15,
        high: Number(current.high || 0) + 0.15,
      };
      instance.state.installed = true;
    },
  }),
  dice_improve_plan_b: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const current = state.player.randomRate || { low: 1, high: 1 };
      state.player.randomRate = {
        low: Number(current.low || 0) + 0.1,
        high: Number(current.high || 0) + 0.1,
      };
      instance.state.installed = true;
    },
  }),
  dice_improve_plan_c: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const current = state.player.randomRate || { low: 1, high: 1 };
      state.player.randomRate = {
        low: Number(current.low || 0) + 0.05,
        high: Number(current.high || 0) + 0.05,
      };
      instance.state.installed = true;
    },
  }),
  // 造成伤害后按层数吸血（每层2%）。
  bloodthirst: ({ state, blessingDef }) => ({
    onAfterDamage(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      const dealt = Number(ctx?.damage || 0);
      if (dealt <= 0) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const healed = healPlayer(state, Math.floor(dealt * 0.02 * stack));
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：吸血恢复${healed}点生命`);
      }
    },
  }),
  // 按层数提升暴击率（每层+5%）。
  bloodletting: ({ state, blessingDef, instance }) => ({
    // 中文注释：层数增加后立即补上暴击率增益，确保 UI 实时更新。
    applyStackDelta() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.criticalRate = Math.min(
        1,
        Number(state.player.criticalRate || 0) + 0.05 * deltaStack
      );
      instance.state.appliedStack = stack;
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 对低血量目标造成伤害前增伤（主动技能生效）。
  execute_low_hp_target: ({ state, blessingDef }) => ({
    onBeforeDamage(ctx) {
      if (!isPlayerActor(ctx, state) || ctx?.isStrength) return;
      if (!ctx?.target || !Number.isFinite(ctx.damage)) return;
      const hpCount = Number(ctx.target.hpCount || 0);
      if (hpCount <= 0) return;
      const hpRate = Number(ctx.target.hp || 0) / hpCount;
      if (hpRate >= 0.3) return;
      ctx.damage *= 1.2;
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：对低血量目标伤害+20%`);
    },
  }),
  // 安装时强制修正暴击/闪避/暴击伤害。
  heavy_war_club: ({ state, instance }) => ({
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      state.player.criticalRate = Math.max(0.5, Number(state.player.criticalRate || 0));
      state.player.missRate = 0;
      state.player.criticalHurtRate = 1.25;
      instance.state.installed = true;
    },
  }),
  // 按层提升暴击伤害倍率（每层+0.2）。
  crit_damage_increase: ({ state, blessingDef, instance }) => ({
    // 中文注释：暴击倍率层数增益统一在这里补齐，避免只在下回合才生效。
    applyStackDelta() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.criticalHurtRate = Number(state.player.criticalHurtRate || 1) + 0.2 * deltaStack;
      instance.state.appliedStack = stack;
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 伤害前比较双方生命比例并调整伤害。
  hp_compare_damage_adjust: ({ state, blessingDef }) => ({
    onBeforeDamage(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || !Number.isFinite(ctx.damage)) return;
      const playerHpRate =
        Number(state.player.hpCount || 0) > 0
          ? Number(state.player.hp || 0) / Number(state.player.hpCount || 1)
          : 0;
      const enemyHpRate =
        Number(ctx.target.hpCount || 0) > 0
          ? Number(ctx.target.hp || 0) / Number(ctx.target.hpCount || 1)
          : 0;
      if (enemyHpRate < playerHpRate) {
        ctx.damage *= 1.15;
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：伤害提升15%`);
        return;
      }
      ctx.damage *= 0.9;
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：伤害降低10%`);
    },
  }),
  // 暴击命中更快目标时，概率使其停止行动1回合。
  break_enemy_turn_on_crit: ({ state, blessingDef }) => ({
    onCrit(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || Number(ctx.target.hp || 0) <= 0) return;
      if (Number(ctx.target.speed || 0) <= Number(state.player.speed || 0)) return;
      if (Math.random() > 0.8) return;
      ctx.target.stopRound = Number(ctx.target.stopRound || 0) + 1;
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：敌人停止行动1回合`);
    },
  }),
  // 按层数提升护甲并降低每回合回复。
  venom_cake: ({ state, blessingDef, instance }) => ({
    // 中文注释：同步叠层带来的护甲与回复变化，避免属性显示延迟。
    applyStackDelta() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.defence = Number(state.player.defence || 0) + 6 * deltaStack;
      state.player.healPerRound = Number(state.player.healPerRound || 0) - 3 * deltaStack;
      instance.state.appliedStack = stack;
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 获得时立刻叠加10回合护甲状态，可随层数追加。
  heavy_armor: ({ state, blessingDef, instance }) => ({
    // 中文注释：每次叠层都立即刷新护甲状态值，持续回合重置为10。
    applyStackDelta() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      const current = state.player.armorStatus || { round: 0, value: 0 };
      state.player.armorStatus = {
        round: 10,
        value: Number(current.value || 0) + 10 * deltaStack,
      };
      instance.state.appliedStack = stack;
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 安装时按“当前生命上限”的20%同时提升生命值与生命上限，并使自己停止行动3回合。
  renewal: ({ state, instance }) => ({
    // 中文注释：生命值增量与生命上限增量保持一致，均基于生效前生命上限计算。
    onInstall() {
      if (!state?.player || instance.state.installed) return;
      const baseHpCount = Number(state.player.hpCount || 0);
      const hpDelta = baseHpCount * 0.2;
      state.player.hpCount = baseHpCount + hpDelta;
      state.player.hp = Math.min(
        Number(state.player.hp || 0) + hpDelta,
        Number(state.player.hpCount || 0)
      );
      state.player.stopRound = Number(state.player.stopRound || 0) + 3;
      instance.state.installed = true;
    },
  }),
  // 按层数提升速度（每层+1.5，最高10）。
  ice_skates: ({ state, blessingDef, instance }) => ({
    // 中文注释：速度由基础速度+层数计算，叠层时即时重算并限制上限10。
    applyStackDelta() {
      if (!state?.player) return;
      if (!Number.isFinite(instance.state.baseSpeed)) {
        instance.state.baseSpeed = Number(state.player.speed || 0);
      }
      const stack = getBlessingStack(state, blessingDef.id);
      state.player.speed = Math.min(10, Number(instance.state.baseSpeed || 0) + 1.5 * stack);
    },
    onInstall() {
      this.applyStackDelta();
    },
    onRoundStart() {
      this.applyStackDelta();
    },
    onStackChange() {
      this.applyStackDelta();
    },
  }),
  // 伤害后有概率均衡双方攻击力：高者向低者分出2点。
  balance_path_ATK: ({ state, blessingDef }) => ({
    onAfterDamage(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || Number(ctx?.damage || 0) <= 0) return;
      if (Math.random() > 0.7) return;
      const playerAtk = Number(state.player.attack || 0);
      const enemyAtk = Number(ctx.target.attack || 0);
      if (playerAtk === enemyAtk) return;
      if (playerAtk > enemyAtk) {
        state.player.attack = Math.max(0, playerAtk - 2);
        ctx.target.attack = enemyAtk + 2;
      } else {
        state.player.attack = playerAtk + 2;
        ctx.target.attack = Math.max(0, enemyAtk - 2);
      }
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：双方攻击力趋于均衡`);
    },
  }),
  // 伤害后有概率均衡双方防御力：高者向低者分出2点。
  balance_path_def: ({ state, blessingDef }) => ({
    onAfterDamage(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!ctx?.target || Number(ctx?.damage || 0) <= 0) return;
      if (Math.random() > 0.7) return;
      const playerDef = Number(state.player.defence || 0);
      const enemyDef = Number(ctx.target.defence || 0);
      if (playerDef === enemyDef) return;
      if (playerDef > enemyDef) {
        state.player.defence = playerDef - 2;
        ctx.target.defence = enemyDef + 2;
      } else {
        state.player.defence = playerDef + 2;
        ctx.target.defence = enemyDef - 2;
      }
      outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：双方防御力趋于均衡`);
    },
  }),
  // 伤害前献祭当前生命值的10%，将其按层数转化为附加伤害。
  burning_origin_sacrifice_damage: ({ state, blessingDef }) => ({
    onBeforeDamage(ctx) {
      if (!isPlayerActor(ctx, state)) return;
      if (!Number.isFinite(ctx.damage)) return;
      const currentHp = Number(state.player.hp || 0);
      if (currentHp <= 1) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const sacrifice = Math.min(currentHp - 1, Math.floor(currentHp * 0.1));
      if (sacrifice <= 0) return;
      state.player.hp = currentHp - sacrifice;
      const ratio = 1.2 + (stack - 1) * 0.1;
      const bonusDamage = Math.floor(sacrifice * ratio);
      if (bonusDamage <= 0) return;
      ctx.damage += bonusDamage;
      outputBlessingLog(
        ctx,
        `[祝福] ${blessingDef.name}触发：献祭${sacrifice}生命，追加${bonusDamage}点伤害`
      );
    },
  }),
});

// 根据祝福定义创建运行时实例（BlessingInstance）。
export const createBlessingInstance = (blessingDef) => ({
  id: blessingDef.id,
  stack: 1,
  cooldown: 0,
  state: {},
});

/*
安装祝福监听器，返回祝福运行时实例。
参数结构：
- blessingDef: BlessingDef，决定 implKey 和展示文案
- hookBus: HookBus，提供 on/emit/clear
- state: BattleState，供处理器读取当前战斗数据
*/
export const installBlessing = ({ blessingDef, hookBus, state }) => {
  const registry = createBlessingRegistry();
  const factory = registry[blessingDef.implKey];
  const instance = createBlessingInstance(blessingDef);
  if (!factory) return instance;
  const handlers = factory({ state, blessingDef, instance });
  if (typeof handlers.onInstall === "function") {
    handlers.onInstall();
  }
  for (const [eventName, handler] of Object.entries(handlers)) {
    if (eventName === "onInstall" || eventName === "onStackChange") continue;
    hookBus.on(eventName, (ctx) => handler.call(handlers, ctx));
  }
  return instance;
};

// 祝福层数变化后立即刷新对应实现（用于实时更新卡片属性展示）。
export const refreshBlessingOnStackChange = ({ blessing, state }) => {
  const registry = createBlessingRegistry();
  const factory = registry[blessing?.implKey];
  if (!factory) return;
  const handlers = factory({
    state,
    blessingDef: blessing,
    instance: blessing,
  });
  if (typeof handlers.onStackChange === "function") {
    handlers.onStackChange({
      actor: state?.player,
      target: state?.enemy,
    });
  }
};
