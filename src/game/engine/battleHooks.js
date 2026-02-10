// 创建轻量事件总线，用于战斗流程中的祝福钩子触发。
export const createHookBus = () => {
  const listeners = new Map();

  return {
    // 注册事件监听器。
    // eventName: 钩子名（如 onBeforeDamage/onCrit/onKill）。
    // listener: (ctx) => void，ctx 为战斗上下文对象，结构见下方 emit 注释。
    on(eventName, listener) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, []);
      }
      listeners.get(eventName).push(listener);
    },
    /*
    发射钩子事件。
    ctx（HookContext）在不同事件下字段会有差异，但核心结构统一：
    - session: number，当前战斗会话 id（用于区分重开后的旧事件）
    - round: number，当前回合数
    - actor: UnitInstance，触发方单位（如攻击者）
    - target: UnitInstance，目标单位（如受击者）
    - skill: SkillLike，本次触发关联技能/特长对象（可能是临时构造）
    - damage: number，伤害值（仅伤害相关事件存在；onBeforeDamage 可被改写）
    - isStrength: boolean，是否来自被动特长
    - criticalHit: boolean，是否暴击（onCrit/onKill 常用）
    - source: string，来源标识（如 skill_damage/strength_damage/skill_change）
    - meta: Record<string, any>，预留扩展字段
    - log: (text: string) => void，主战斗日志输出函数
    - sideLog: (text: string) => void，侧边短日志输出函数
    */
    emit(eventName, ctx) {
      const queue = listeners.get(eventName);
      if (!queue?.length) return;
      for (const listener of queue) {
        listener(ctx);
      }
    },
    // 清空所有监听器（通常在重置战斗时调用）。
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
