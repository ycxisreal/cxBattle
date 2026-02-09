// 创建祝福实现注册表，返回 implKey 对应的事件处理器集合。
const outputBlessingLog = (ctx, text) => {
  if (typeof ctx?.sideLog === "function") {
    ctx.sideLog(text);
    return;
  }
  ctx?.log?.(text);
};

const createBlessingRegistry = () => ({
  player_damage_boost: ({ state, blessingDef }) => ({
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
  round_heal: ({ state, blessingDef }) => ({
    onRoundStart(ctx) {
      if (!state.player || state.player.hp <= 0) return;
      const stack =
        Number(state.blessings.find((item) => item.id === blessingDef.id)?.stack || 1);
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.hp + 8 * Math.max(1, stack), state.player.hpCount);
      const healed = Math.floor(state.player.hp - before);
      if (healed > 0) {
        outputBlessingLog(ctx, `[祝福] ${blessingDef.name}触发：恢复${healed}点生命`);
      }
    },
  }),
});

// 根据祝福定义创建运行时实例。
export const createBlessingInstance = (blessingDef) => ({
  id: blessingDef.id,
  stack: 1,
  cooldown: 0,
  state: {},
});

// 安装祝福监听器，返回祝福运行时实例。
export const installBlessing = ({ blessingDef, hookBus, state }) => {
  const registry = createBlessingRegistry();
  const factory = registry[blessingDef.implKey];
  const instance = createBlessingInstance(blessingDef);
  if (!factory) return instance;
  const handlers = factory({ state, blessingDef, instance });
  for (const [eventName, handler] of Object.entries(handlers)) {
    hookBus.on(eventName, (ctx) => handler(ctx));
  }
  return instance;
};
