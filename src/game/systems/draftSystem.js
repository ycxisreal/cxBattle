import { generateEquipment } from "./equipmentSystem.js";

const PRE_DRAFT_COUNT = 6;
const PRE_DRAFT_BLESSING_COUNT = 4;
const PRE_DRAFT_EQUIPMENT_COUNT = 2;

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

// 生成战中三选一候选（仅祝福）。
export const buildMidDraftCandidates = (blessingPool = [], count = 3) =>
  pickManyWithReplacement(blessingPool, count);
