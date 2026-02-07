import { units as unitsJs } from "./units.js";
import { skills as skillsJs } from "./skills.js";
import { strengths as strengthsJs } from "./strengths.js";

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

const electronFlag = typeof window !== "undefined" && window.demo?.isElectron === true;
const electronData = electronFlag ? getElectronData() : null;

export const isElectron = electronFlag;
export const dataSource = electronData ? "electron" : "web";
export const units = resolveArray(electronData, "units", unitsJs);
export const skills = resolveArray(electronData, "skills", skillsJs);
export const strengths = resolveArray(electronData, "strengths", strengthsJs);
export const skillIndex = new Map(skills.map((skill) => [skill.id, skill]));
