const QUALITY_WEIGHTS = [
  { quality: "A", weight: 10, cost: 6 },
  { quality: "B", weight: 30, cost: 4 },
  { quality: "C", weight: 60, cost: 2 },
];

const QUALITY_BASE_VALUE = {
  A: 12,
  B: 8,
  C: 5,
};

const RATE_KEYS = new Set(["missRate", "criticalRate"]);
const QUALITY_BASE_RATE_VALUE = {
  A: 0.08,
  B: 0.05,
  C: 0.03,
};

const pickByWeight = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
};

const clampRate = (key, value) => {
  if (key === "missRate") return Math.min(0.6, Math.max(0, value));
  if (key === "criticalRate") return Math.min(1, Math.max(0, value));
  return value;
};

// 归一化词条值：概率词条统一按小数处理，并兼容历史整数配置（如 5 => 0.05）。
const normalizeModifierValue = (key, rawValue) => {
  if (!Number.isFinite(rawValue)) return 0;
  if (!RATE_KEYS.has(key)) return rawValue;
  if (Math.abs(rawValue) > 1) return rawValue / 100;
  return rawValue;
};

// 生成一件装备（当前仅保留占位策略，后续可替换为品质曲线与词条池精细算法）。
export const generateEquipment = (affixPool = [], seed = Date.now()) => {
  const qualityInfo = pickByWeight(QUALITY_WEIGHTS);
  const affix = affixPool[Math.floor(Math.random() * affixPool.length)];
  if (!affix) return null;
  const value = RATE_KEYS.has(affix.key)
    ? QUALITY_BASE_RATE_VALUE[qualityInfo.quality]
    : QUALITY_BASE_VALUE[qualityInfo.quality];
  return {
    id: `eq-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    quality: qualityInfo.quality,
    name: `${qualityInfo.quality}级${affix.label}装置`,
    cost: qualityInfo.cost,
    modifiers: [{ key: affix.key, mode: "add", value }],
  };
};

// 将装备词条一次性应用到单位实例（战中不换装时可直接改值）。
export const applyEquipmentsToUnit = (unit, equipments = []) => {
  if (!unit) return;
  for (const equipment of equipments) {
    for (const modifier of equipment.modifiers || []) {
      if (!Object.prototype.hasOwnProperty.call(unit, modifier.key)) continue;
      if (!Number.isFinite(unit[modifier.key])) continue;
      const normalizedValue = normalizeModifierValue(modifier.key, modifier.value);
      if (modifier.mode === "mul") {
        unit[modifier.key] = unit[modifier.key] * normalizedValue;
      } else {
        unit[modifier.key] = unit[modifier.key] + normalizedValue;
      }
      unit[modifier.key] = clampRate(modifier.key, unit[modifier.key]);
    }
  }
  if (unit.hp > unit.hpCount) {
    unit.hp = unit.hpCount;
  }
};
