import { units as unitsJs } from "./units.js";
import { skills as skillsJs } from "./skills.js";
import { strengths as strengthsJs } from "./strengths.js";
import { blessings as blessingsJs } from "./blessings.js";
import { equipmentAffixes as equipmentAffixesJs } from "./equipmentAffixes.js";
import { progression as progressionJs } from "./progression.js";

// 获取 Electron 端注入的数据
const getElectronData = () => {
  if (typeof window === "undefined") return null;
  const data = window.demo?.getData?.();
  if (!data || typeof data !== "object") return null;
  return data;
};

// 处理数组数据回退逻辑
const resolveArray = (data, key, fallback) => {
  if (Array.isArray(data?.[key]) && data[key].length) return data[key];
  return fallback;
};

const resolveObject = (data, key, fallback) => {
  if (data?.[key] && typeof data[key] === "object" && !Array.isArray(data[key])) {
    return data[key];
  }
  return fallback;
};

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

// 祝福字段兼容：优先用运行时数据，再用静态定义补齐缺失字段。
const normalizeBlessings = (list = [], fallback = []) => {
  const fallbackMap = new Map((fallback || []).map((item) => [item.id, item]));
  return (list || []).map((item) => {
    const base = fallbackMap.get(item?.id) || {};
    return {
      ...base,
      ...item,
      repeatable: item?.repeatable ?? base?.repeatable ?? false,
      maxStack: Number(item?.maxStack ?? base?.maxStack ?? 1),
    };
  });
};

const electronFlag = typeof window !== "undefined" && window.demo?.isElectron === true;
const electronData = electronFlag ? getElectronData() : null;

export const isElectron = electronFlag;
export const dataSource = electronData ? "electron" : "web";
export const units = resolveArray(electronData, "units", unitsJs);
export const skills = resolveArray(electronData, "skills", skillsJs);
export const strengths = resolveArray(electronData, "strengths", strengthsJs);
export const blessings = normalizeBlessings(
  resolveArray(electronData, "blessings", blessingsJs),
  blessingsJs
);
export const equipmentAffixes = resolveArray(
  electronData,
  "equipmentAffixes",
  equipmentAffixesJs
);
export const progression = resolveObject(electronData, "progression", progressionJs);
export const skillIndex = new Map(skills.map((skill) => [skill.id, skill]));

// 更新运行时数据并同步索引
export const updateRuntimeData = (nextData) => {
  if (!nextData || typeof nextData !== "object") return;
  if (Array.isArray(nextData.units)) {
    units.splice(0, units.length, ...nextData.units);
  }
  if (Array.isArray(nextData.skills)) {
    skills.splice(0, skills.length, ...nextData.skills);
    skillIndex.clear();
    skills.forEach((skill) => skillIndex.set(skill.id, skill));
  }
  if (Array.isArray(nextData.strengths)) {
    strengths.splice(0, strengths.length, ...nextData.strengths);
  }
  if (Array.isArray(nextData.blessings)) {
    blessings.splice(0, blessings.length, ...nextData.blessings);
  }
  if (Array.isArray(nextData.equipmentAffixes)) {
    equipmentAffixes.splice(0, equipmentAffixes.length, ...nextData.equipmentAffixes);
  }
  if (nextData.progression && typeof nextData.progression === "object") {
    const nextProgression = {
      totalPoints: Number(nextData.progression?.totalPoints || 0),
      allocations:
        nextData.progression?.allocations &&
        typeof nextData.progression.allocations === "object" &&
        !Array.isArray(nextData.progression.allocations)
          ? cloneDeep(nextData.progression.allocations)
          : {},
    };
    Object.keys(progression).forEach((key) => {
      delete progression[key];
    });
    Object.assign(progression, nextProgression);
  }
};

// 中文注释：将全局点数进度写回运行时与 Electron JSON（非 Electron 环境仅更新运行时）。
export const saveProgressionData = async (nextProgression) => {
  if (!nextProgression || typeof nextProgression !== "object") {
    return { ok: false, error: "invalid progression payload" };
  }
  updateRuntimeData({ progression: nextProgression });
  if (!isElectron) return { ok: true, skipped: true };
  const payload = {
    units: cloneDeep(units),
    skills: cloneDeep(skills),
    strengths: cloneDeep(strengths),
    blessings: cloneDeep(blessings),
    equipmentAffixes: cloneDeep(equipmentAffixes),
    progression: cloneDeep(progression),
  };
  const result = await window.demo?.saveData?.(payload);
  return result || { ok: false, error: "saveData unavailable" };
};
