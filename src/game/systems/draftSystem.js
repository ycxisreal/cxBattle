import { generateEquipment } from "./equipmentSystem.js";

const PRE_DRAFT_COUNT = 6;
const PRE_DRAFT_BLESSING_COUNT = 4;
const PRE_DRAFT_EQUIPMENT_COUNT = 2;
const MID_DRAFT_PROGRESS_MAX_COUNT = 12;
const MID_DRAFT_BASE_QUALITY_WEIGHTS = {
  A: 8,
  B: 30,
  C: 62,
};
const MID_DRAFT_FINAL_QUALITY_WEIGHTS = {
  A: 45,
  B: 35,
  C: 20,
};
const QUALITY_PRIORITY_ASC = ["C", "B", "A"];

const BUDGET_BY_DIFFICULTY = {
  normal: 6,
  hard: 9,
  extreme: 12,
  expert: 15,
  inferno: 18,
};

const shuffle = (list = []) => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const pickManyWithReplacement = (source = [], count = 0) => {
  if (!source.length || count <= 0) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(source[Math.floor(Math.random() * source.length)]);
  }
  return result;
};

const toQualityKey = (quality) => String(quality || "C").toUpperCase();

const pickOne = (source = []) => {
  if (!source.length) return null;
  return source[Math.floor(Math.random() * source.length)];
};

const createBlessingDraftItem = (blessingDef, token) => {
  if (!blessingDef) return null;
  return {
    draftId: `pre-blessing-${blessingDef.id}-${token}`,
    type: "blessing",
    quality: blessingDef.quality,
    cost: blessingDef.cost,
    payload: blessingDef,
  };
};

const createEquipmentDraftItem = (equipment, token) => {
  if (!equipment) return null;
  return {
    draftId: `pre-equipment-${equipment.id}-${token}`,
    type: "equipment",
    quality: equipment.quality,
    cost: equipment.cost,
    payload: equipment,
  };
};

const pickByWeight = (weightMap = {}) => {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  if (!entries.length) return null;
  const totalWeight = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  let cursor = Math.random() * totalWeight;
  for (const [key, weight] of entries) {
    cursor -= Number(weight);
    if (cursor <= 0) return key;
  }
  return entries[entries.length - 1][0];
};

const getUpwardQualityChain = (quality) => {
  const target = toQualityKey(quality);
  const startIndex = QUALITY_PRIORITY_ASC.indexOf(target);
  if (startIndex < 0) return ["C", "B", "A"];
  return QUALITY_PRIORITY_ASC.slice(startIndex);
};

// 根据三选一次数返回当前品质权重，次数越高 A 级权重越接近终值。
export const getMidDraftQualityWeights = (midDraftCount = 0) => {
  const count = Math.max(0, Number(midDraftCount || 0));
  const progress = Math.min(1, count / MID_DRAFT_PROGRESS_MAX_COUNT);
  const result = {};
  for (const key of ["A", "B", "C"]) {
    const base = Number(MID_DRAFT_BASE_QUALITY_WEIGHTS[key] || 0);
    const final = Number(MID_DRAFT_FINAL_QUALITY_WEIGHTS[key] || 0);
    result[key] = base + (final - base) * progress;
  }
  return result;
};

// 按难度返回战前构筑预算。
export const getBudgetByDifficulty = (difficulty) =>
  BUDGET_BY_DIFFICULTY[difficulty] ?? BUDGET_BY_DIFFICULTY.normal;

// 生成战前构筑候选（4祝福+2装备）。
export const buildPreDraftCandidates = (blessingPool = [], affixPool = []) => {
  const blessingCandidates = pickManyWithReplacement(
    blessingPool,
    PRE_DRAFT_BLESSING_COUNT
  )
    .map((blessingDef, index) => ({
      draftId: `pre-blessing-${blessingDef.id}-${index}`,
      type: "blessing",
      quality: blessingDef.quality,
      cost: blessingDef.cost,
      payload: blessingDef,
    }));

  const equipmentCandidates = [];
  while (equipmentCandidates.length < PRE_DRAFT_EQUIPMENT_COUNT) {
    const equipment = generateEquipment(affixPool, Date.now() + equipmentCandidates.length);
    if (!equipment) break;
    equipmentCandidates.push({
      draftId: `pre-equipment-${equipment.id}`,
      type: "equipment",
      quality: equipment.quality,
      cost: equipment.cost,
      payload: equipment,
    });
  }

  return shuffle([...blessingCandidates, ...equipmentCandidates]).slice(0, PRE_DRAFT_COUNT);
};

// 刷新战前候选：已锁定项保持不变，仅替换未锁定项。
export const refreshPreDraftCandidatesWithLocks = (
  currentCandidates = [],
  lockedDraftIds = [],
  blessingPool = [],
  affixPool = []
) => {
  if (!Array.isArray(currentCandidates) || !currentCandidates.length) {
    return buildPreDraftCandidates(blessingPool, affixPool);
  }
  const lockedSet = new Set(lockedDraftIds || []);
  const seedBase = Date.now();
  return currentCandidates.map((item, index) => {
    if (!item || lockedSet.has(item.draftId)) return item;
    const token = `${seedBase}-${index}-${Math.floor(Math.random() * 10000)}`;
    if (item.type === "equipment") {
      const equipment = generateEquipment(affixPool, `${seedBase}-${index}`);
      return createEquipmentDraftItem(equipment, token) || item;
    }
    const blessing = pickOne(blessingPool);
    return createBlessingDraftItem(blessing, token) || item;
  });
};

// 生成战中三选一候选（仅祝福，按品质权重抽取）。
export const buildMidDraftCandidates = (blessingPool = [], count = 3, options = {}) => {
  if (!Array.isArray(blessingPool) || !blessingPool.length || count <= 0) return [];
  const midDraftCount = Number(options?.midDraftCount || 0);
  const qualityWeights = options?.qualityWeights || getMidDraftQualityWeights(midDraftCount);
  const qualityGroups = { A: [], B: [], C: [] };
  blessingPool.forEach((item) => {
    const key = toQualityKey(item?.quality);
    if (qualityGroups[key]) {
      qualityGroups[key].push(item);
    } else {
      qualityGroups.C.push(item);
    }
  });

  const result = [];
  const usedBlessingIds = new Set();
  for (let i = 0; i < count; i += 1) {
    const availableWeights = {};
    for (const key of ["A", "B", "C"]) {
      if (qualityGroups[key].length) {
        availableWeights[key] = Number(qualityWeights[key] || 0);
      }
    }
    const pickedQuality = pickByWeight(availableWeights);
    let pickedBlessing = null;
    for (const qualityKey of getUpwardQualityChain(pickedQuality)) {
      const candidates = qualityGroups[qualityKey].filter(
        (item) => !usedBlessingIds.has(item.id)
      );
      if (candidates.length) {
        pickedBlessing = pickOne(candidates);
        break;
      }
    }
    // 兜底：如果升级链路也没有可用项，尽量从任意品质选择未出现过的祝福，避免三选一重复。
    if (!pickedBlessing) {
      const fallbackCandidates = blessingPool.filter((item) => !usedBlessingIds.has(item.id));
      pickedBlessing = pickOne(fallbackCandidates);
    }
    if (!pickedBlessing) break;
    result.push(pickedBlessing);
    usedBlessingIds.add(pickedBlessing.id);
  }
  return result;
};
