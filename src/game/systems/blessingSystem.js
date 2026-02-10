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
    onInstall() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.defence = Number(state.player.defence || 0) + 10 * deltaStack;
      instance.state.appliedStack = stack;
    },
    onRoundStart() {
      if (!state?.player) return;
      const stack = getBlessingStack(state, blessingDef.id);
      const appliedStack = Number(instance.state.appliedStack || 0);
      if (stack <= appliedStack) return;
      const deltaStack = stack - appliedStack;
      state.player.defence = Number(state.player.defence || 0) + 10 * deltaStack;
      instance.state.appliedStack = stack;
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
    if (eventName === "onInstall") continue;
    hookBus.on(eventName, (ctx) => handler(ctx));
  }
  return instance;
};
