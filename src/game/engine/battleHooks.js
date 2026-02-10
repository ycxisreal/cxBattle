// 创建轻量事件总线，用于战斗流程中的祝福钩子触发。
export const createHookBus = () => {
  const listeners = new Map();

  return {
    on(eventName, listener) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, []);
      }
      listeners.get(eventName).push(listener);
    },
    emit(eventName, ctx) {
      const queue = listeners.get(eventName);
      if (!queue?.length) return;
      for (const listener of queue) {
        listener(ctx);
      }
    },
    clear() {
      listeners.clear();
    },
  };
};
/*
hook 节点
- `onBattleStart` 战斗开始
- `onBeforeAction` 行动开始前
- `onRoundStart` 回合开始
- `onBeforeDamage` 造成伤害前
- `onAfterDamage` 造成伤害后
- `onCrit` 暴击命中后
- `onKill` 击杀目标后
- `onRoundEnd` 回合结束
* */
