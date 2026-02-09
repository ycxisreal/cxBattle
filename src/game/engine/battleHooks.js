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
