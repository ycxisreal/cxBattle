
<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  units as runtimeUnits,
  skills as runtimeSkills,
  strengths as runtimeStrengths,
  isElectron,
  updateRuntimeData,
} from "../game/data/runtimeData.js";

const isElectronEnv = isElectron;

// 深拷贝数据，避免直接修改运行时引用
const cloneData = (data) => JSON.parse(JSON.stringify(data ?? null));

const customData = reactive({
  units: cloneData(runtimeUnits) || [],
  skills: cloneData(runtimeSkills) || [],
  strengths: cloneData(runtimeStrengths) || [],
});

const typeLabels = {
  units: "角色",
  skills: "技能",
  strengths: "被动",
};

const statusNameOptions = [
  { label: "弱化", value: "weak" },
  { label: "强化", value: "strong" },
  { label: "护甲", value: "armor" },
  { label: "伤害加成", value: "damage" },
];

const changeValueOptions = [
  { label: "生命上限", value: "hpCount" },
  { label: "当前生命", value: "hp" },
  { label: "攻击", value: "attack" },
  { label: "防御", value: "defence" },
  { label: "命中闪避", value: "missRate" },
  { label: "暴击率", value: "criticalRate" },
  { label: "暴击伤害倍率", value: "criticalHurtRate" },
  { label: "每回合回复", value: "healPerRound" },
  { label: "速度", value: "speed" },
  { label: "停止回合", value: "stopRound" },
];

const dialogVisible = ref(false);
const selectVisible = ref(false);
const dialogMode = ref("add");
const selectMode = ref("edit");
const dialogType = ref("units");
const selectedIds = reactive({
  units: null,
  skills: null,
  strengths: null,
});
const selectedId = computed({
  get: () => selectedIds[dialogType.value],
  set: (value) => {
    selectedIds[dialogType.value] = value;
  },
});
const selectKey = ref(0);
const editingId = ref(null);
const formModel = ref({});

const activeList = computed(() => customData[dialogType.value] || []);
const activeLabel = computed(() => typeLabels[dialogType.value] || "");
const selectOptions = computed(() =>
  activeList.value.map((item) => ({
    value: item.id,
    label: `#${item.id} ${item.name}`,
  }))
);

const skillOptions = computed(() =>
  customData.skills.map((item) => ({
    value: item.id,
    label: `#${item.id} ${item.name}`,
  }))
);

const strengthOptions = computed(() =>
  customData.strengths.map((item) => ({
    value: item.id,
    label: `#${item.id} ${item.name}`,
  }))
);

// 重置选择弹窗状态
const resetSelectState = () => {
  selectedId.value = null;
  selectKey.value += 1;
};

// 获取下一个可用 ID
const getNextId = (list) => {
  const maxId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return maxId + 1;
};

// 创建默认状态
const createDefaultStatus = () => ({
  round: 1,
  powerRate: 1,
  value: 0,
});

// 创建默认角色
const createDefaultUnit = () => ({
  id: getNextId(customData.units),
  name: "新角色",
  owner: "",
  hpCount: 100,
  hp: 100,
  defence: 10,
  defenceDefault: 10,
  attack: 10,
  attackDefault: 10,
  strength: [],
  skillList: [],
  missRate: 0.05,
  criticalRate: 0.1,
  criticalHurtRate: 1.5,
  healPerRound: 0,
  speed: 3,
  randomRate: { low: 0.8, high: 1.2 },
  weakStatusEnabled: false,
  weakStatus: createDefaultStatus(),
  strongStatusEnabled: false,
  strongStatus: createDefaultStatus(),
  armorStatusEnabled: false,
  armorStatus: createDefaultStatus(),
  damageStatusEnabled: false,
  damageStatus: createDefaultStatus(),
  stopRound: 0,
  des: "",
});

// 创建默认技能
const createDefaultSkill = () => ({
  id: getNextId(customData.skills),
  name: "新技能",
  des: "",
  power: 0,
  suckBloodRate: 0,
  putStatus: [],
  changeValue: [],
  accuracy: 1,
  criticalRate: 0,
  hidden: false,
});

// 创建默认条件
const createDefaultCondition = () => ({
  type: ">=",
  round: 0,
  interval: 0,
  dice: 0,
  selfConditionEnabled: false,
  selfCondition: {
    health: 0,
    healthRate: 0,
    attack: 0,
    defence: 0,
    attackRate: 0,
    defenceRate: 0,
  },
  enemyConditionEnabled: false,
  enemyCondition: {
    health: 0,
    healthRate: 0,
    attack: 0,
    defence: 0,
    attackRate: 0,
    defenceRate: 0,
  },
});

// 创建默认被动
const createDefaultStrength = () => ({
  id: getNextId(customData.strengths),
  name: "新被动",
  des: "",
  conditionEnabled: false,
  condition: createDefaultCondition(),
  power: 0,
  status: [],
  changeValue: [],
  accuracy: 1,
});

// 构建角色表单
const buildUnitForm = (unit) => {
  const base = cloneData(unit);
  return {
    ...createDefaultUnit(),
    ...base,
    strength: base?.strength || [],
    skillList: base?.skillList || [],
    randomRate: base?.randomRate || { low: 0.8, high: 1.2 },
    weakStatusEnabled: Boolean(base?.weakStatus),
    weakStatus: base?.weakStatus || createDefaultStatus(),
    strongStatusEnabled: Boolean(base?.strongStatus),
    strongStatus: base?.strongStatus || createDefaultStatus(),
    armorStatusEnabled: Boolean(base?.armorStatus),
    armorStatus: base?.armorStatus || createDefaultStatus(),
    damageStatusEnabled: Boolean(base?.damageStatus),
    damageStatus: base?.damageStatus || createDefaultStatus(),
  };
};

// 构建技能表单
const buildSkillForm = (skill) => ({
  ...createDefaultSkill(),
  ...(cloneData(skill) || {}),
  putStatus: skill?.putStatus ? cloneData(skill.putStatus) : [],
  changeValue: skill?.changeValue ? cloneData(skill.changeValue) : [],
});

// 构建被动表单
const buildStrengthForm = (strength) => {
  const base = cloneData(strength);
  const condition = base?.condition ? cloneData(base.condition) : createDefaultCondition();
  return {
    ...createDefaultStrength(),
    ...base,
    conditionEnabled: Boolean(base?.condition),
    condition: {
      ...createDefaultCondition(),
      ...condition,
      selfConditionEnabled: Boolean(condition?.selfCondition),
      enemyConditionEnabled: Boolean(condition?.enemyCondition),
      selfCondition: {
        ...createDefaultCondition().selfCondition,
        ...(condition?.selfCondition || {}),
      },
      enemyCondition: {
        ...createDefaultCondition().enemyCondition,
        ...(condition?.enemyCondition || {}),
      },
    },
    status: base?.status ? cloneData(base.status) : [],
    changeValue: base?.changeValue ? cloneData(base.changeValue) : [],
  };
};

// 打开新增弹窗
const openAdd = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  dialogMode.value = "add";
  editingId.value = null;
  selectVisible.value = false;
  resetSelectState();
  if (type === "units") formModel.value = createDefaultUnit();
  if (type === "skills") formModel.value = createDefaultSkill();
  if (type === "strengths") formModel.value = createDefaultStrength();
  dialogVisible.value = true;
};

// 打开编辑选择弹窗
const openEdit = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  selectMode.value = "edit";
  resetSelectState();
  selectVisible.value = true;
};

// 打开删除选择弹窗
const openDelete = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  selectMode.value = "delete";
  resetSelectState();
  selectVisible.value = true;
};

// 获取选中数据
const getSelectedItem = () =>
  activeList.value.find((item) => Number(item.id) === Number(selectedId.value));

// 确认选择并进入下一步
const confirmSelect = () => {
  const item = getSelectedItem();
  if (!item) {
    ElMessage.warning("请先选择一条数据");
    return;
  }
  if (selectMode.value === "edit") {
    editingId.value = item.id;
    if (dialogType.value === "units") formModel.value = buildUnitForm(item);
    if (dialogType.value === "skills") formModel.value = buildSkillForm(item);
    if (dialogType.value === "strengths") formModel.value = buildStrengthForm(item);
    selectVisible.value = false;
    dialogMode.value = "edit";
    dialogVisible.value = true;
    return;
  }
  if (selectMode.value === "delete") {
    removeItem(item.id);
    selectVisible.value = false;
    resetSelectState();
  }
};

// 标准化数字数组
const normalizeNumberArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));

// 标准化状态对象
const normalizeStatus = (enabled, status) => {
  if (!enabled) return null;
  const result = { round: Number(status?.round || 0) };
  if (status?.powerRate !== undefined && status?.powerRate !== null) {
    result.powerRate = Number(status.powerRate);
  }
  if (status?.value !== undefined && status?.value !== null) {
    result.value = Number(status.value);
  }
  return result;
};

// 标准化技能/被动的附加状态
const normalizePutStatus = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => item?.name)
    .map((item) => ({
      name: item.name,
      round: Number(item.round || 0),
      value: item.value !== undefined && item.value !== null ? Number(item.value) : undefined,
      rate: item.rate !== undefined && item.rate !== null ? Number(item.rate) : undefined,
    }));

// 标准化数值变更
const normalizeChangeValue = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => item?.name)
    .map((item) => ({
      self: Boolean(item.self),
      name: item.name,
      value: item.value !== undefined && item.value !== null ? Number(item.value) : undefined,
      rate: item.rate !== undefined && item.rate !== null ? Number(item.rate) : undefined,
    }));

// 标准化条件对象
const normalizeCondition = (conditionEnabled, condition) => {
  if (!conditionEnabled) return undefined;
  const result = {};
  if (condition?.type) result.type = condition.type;
  if (typeof condition?.round === "number" && condition.round > 0) {
    result.round = Number(condition.round);
  }
  if (typeof condition?.interval === "number" && condition.interval > 0) {
    result.interval = Number(condition.interval);
  }
  if (typeof condition?.dice === "number" && condition.dice > 0) {
    result.dice = Number(condition.dice);
  }
  if (condition?.selfConditionEnabled) {
    result.selfCondition = { ...condition.selfCondition };
  }
  if (condition?.enemyConditionEnabled) {
    result.enemyCondition = { ...condition.enemyCondition };
  }
  if (!Object.keys(result).length) return undefined;
  return result;
};

// 保存数据到运行时与 JSON
const syncData = async () => {
  const payload = {
    units: cloneData(customData.units),
    skills: cloneData(customData.skills),
    strengths: cloneData(customData.strengths),
  };
  updateRuntimeData(payload);
  if (!isElectronEnv) return;
  const result = await window.demo?.saveData?.(payload);
  if (!result?.ok) {
    ElMessage.error(result?.error || "保存失败");
    return;
  }
  ElMessage.success("保存成功");
};

// 保存表单内容
const saveForm = async () => {
  if (!formModel.value?.name) {
    ElMessage.warning("名称不能为空");
    return;
  }
  const list = customData[dialogType.value];
  let normalized = null;

  if (dialogType.value === "units") {
    normalized = {
      ...cloneData(formModel.value),
      strength: normalizeNumberArray(formModel.value.strength),
      skillList: normalizeNumberArray(formModel.value.skillList),
      randomRate: {
        low: Number(formModel.value.randomRate?.low || 0),
        high: Number(formModel.value.randomRate?.high || 0),
      },
      weakStatus: normalizeStatus(
        formModel.value.weakStatusEnabled,
        formModel.value.weakStatus
      ),
      strongStatus: normalizeStatus(
        formModel.value.strongStatusEnabled,
        formModel.value.strongStatus
      ),
      armorStatus: normalizeStatus(
        formModel.value.armorStatusEnabled,
        formModel.value.armorStatus
      ),
      damageStatus: normalizeStatus(
        formModel.value.damageStatusEnabled,
        formModel.value.damageStatus
      ),
    };
    delete normalized.weakStatusEnabled;
    delete normalized.strongStatusEnabled;
    delete normalized.armorStatusEnabled;
    delete normalized.damageStatusEnabled;
  }

  if (dialogType.value === "skills") {
    normalized = {
      ...cloneData(formModel.value),
      putStatus: normalizePutStatus(formModel.value.putStatus),
      changeValue: normalizeChangeValue(formModel.value.changeValue),
    };
  }

  if (dialogType.value === "strengths") {
    normalized = {
      ...cloneData(formModel.value),
      condition: normalizeCondition(
        formModel.value.conditionEnabled,
        formModel.value.condition
      ),
      status: normalizePutStatus(formModel.value.status),
      changeValue: normalizeChangeValue(formModel.value.changeValue),
    };
    delete normalized.conditionEnabled;
  }

  if (!normalized) return;
  const id = Number(normalized.id);
  if (Number.isNaN(id)) {
    ElMessage.warning("ID 必须为数字");
    return;
  }

  if (dialogMode.value === "add") {
    if (list.some((item) => Number(item.id) === id)) {
      ElMessage.warning("ID 已存在，请更换");
      return;
    }
    list.push(normalized);
  }

  if (dialogMode.value === "edit") {
    const index = list.findIndex(
      (item) => Number(item.id) === Number(editingId.value)
    );
    if (index === -1) {
      ElMessage.error("未找到要编辑的数据");
      return;
    }
    if (
      Number(editingId.value) !== id &&
      list.some((item) => Number(item.id) === id)
    ) {
      ElMessage.warning("ID 已存在，请更换");
      return;
    }
    list.splice(index, 1, normalized);
  }

  dialogVisible.value = false;
  await syncData();
};

// 删除数据
const removeItem = async (id) => {
  const list = customData[dialogType.value];
  const index = list.findIndex((item) => Number(item.id) === Number(id));
  if (index === -1) {
    ElMessage.error("未找到要删除的数据");
    return;
  }
  list.splice(index, 1);
  await syncData();
};

// 添加附加状态项
const addPutStatus = (list) => {
  list.push({
    name: "weak",
    round: 1,
    value: 0,
    rate: 1,
  });
};

// 添加数值变更项
const addChangeValue = (list) => {
  list.push({
    self: true,
    name: "hp",
    value: 0,
    rate: 0,
  });
};

// 删除列表中的某一项
const removeListItem = (list, index) => {
  list.splice(index, 1);
};
</script>

<template>
  <section class="custom-module">
    <header class="custom-head">
      <div>
        <h3>自定义模块</h3>
        <p>在 Electron 端管理角色、技能与被动数据。</p>
      </div>
      <span class="custom-badge" :class="{ disabled: !isElectronEnv }">
        {{ isElectronEnv ? "Electron 数据源" : "Web 端只读" }}
      </span>
    </header>
    <div class="custom-grid">
      <div class="custom-card">
        <h4>角色</h4>
        <p>新增、编辑与删除角色数据。</p>
        <div class="custom-actions">
          <el-button size="small" :disabled="!isElectronEnv" @click="openAdd('units')">
            添加
          </el-button>
          <el-button size="small" :disabled="!isElectronEnv" @click="openEdit('units')">
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!isElectronEnv"
            @click="openDelete('units')"
          >
            删除
          </el-button>
        </div>
      </div>
      <div class="custom-card">
        <h4>技能</h4>
        <p>新增、编辑与删除技能数据。</p>
        <div class="custom-actions">
          <el-button size="small" :disabled="!isElectronEnv" @click="openAdd('skills')">
            添加
          </el-button>
          <el-button size="small" :disabled="!isElectronEnv" @click="openEdit('skills')">
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!isElectronEnv"
            @click="openDelete('skills')"
          >
            删除
          </el-button>
        </div>
      </div>
      <div class="custom-card">
        <h4>被动</h4>
        <p>新增、编辑与删除被动数据。</p>
        <div class="custom-actions">
          <el-button size="small" :disabled="!isElectronEnv" @click="openAdd('strengths')">
            添加
          </el-button>
          <el-button size="small" :disabled="!isElectronEnv" @click="openEdit('strengths')">
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!isElectronEnv"
            @click="openDelete('strengths')"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
    <p v-if="!isElectronEnv" class="hint">
      Web 端仅展示静态数据，自定义功能已禁用。
    </p>

    <el-dialog v-model="selectVisible" :title="`${activeLabel}${selectMode === 'edit' ? '编辑' : '删除'}`" width="600px">
      <el-form label-width="80px">
        <el-form-item label="选择数据">
          <el-select v-model="selectedId" placeholder="请选择" :key="selectKey" class="select-field">
            <el-option
              v-for="option in selectOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="selectVisible = false">取消</el-button>
        <el-button
          v-if="selectMode === 'edit'"
          type="primary"
          @click="confirmSelect"
        >
          开始编辑
        </el-button>
        <el-button
          v-else
          type="danger"
          @click="confirmSelect"
        >
          确认删除
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="`${activeLabel}${dialogMode === 'add' ? '新增' : '编辑'}`" width="1024px">
      <el-form :model="formModel" label-width="110px" class="form-body">
        <template v-if="dialogType === 'units'">
          <el-divider>基础信息</el-divider>
          <div class="form-grid">
            <el-form-item label="ID">
              <el-input-number v-model="formModel.id" :min="1" />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="formModel.name" />
            </el-form-item>
            <el-form-item label="归属">
              <el-input v-model="formModel.owner" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="formModel.des" type="textarea" :rows="2" />
            </el-form-item>
          </div>
          <el-divider>数值属性</el-divider>
          <div class="form-grid">
            <el-form-item label="生命上限">
              <el-input-number v-model="formModel.hpCount" :min="0" />
            </el-form-item>
            <el-form-item label="当前生命">
              <el-input-number v-model="formModel.hp" :min="0" />
            </el-form-item>
            <el-form-item label="攻击">
              <el-input-number v-model="formModel.attack" />
            </el-form-item>
            <el-form-item label="基础攻击">
              <el-input-number v-model="formModel.attackDefault" />
            </el-form-item>
            <el-form-item label="防御">
              <el-input-number v-model="formModel.defence" />
            </el-form-item>
            <el-form-item label="基础防御">
              <el-input-number v-model="formModel.defenceDefault" />
            </el-form-item>
            <el-form-item label="速度">
              <el-input-number v-model="formModel.speed" />
            </el-form-item>
            <el-form-item label="每回合回复">
              <el-input-number v-model="formModel.healPerRound" />
            </el-form-item>
            <el-form-item label="未命中率">
              <el-input-number v-model="formModel.missRate" :step="0.01" />
            </el-form-item>
            <el-form-item label="暴击率">
              <el-input-number v-model="formModel.criticalRate" :step="0.01" />
            </el-form-item>
            <el-form-item label="暴击伤害倍率">
              <el-input-number v-model="formModel.criticalHurtRate" :step="0.1" />
            </el-form-item>
            <el-form-item label="停止回合">
              <el-input-number v-model="formModel.stopRound" :min="0" />
            </el-form-item>
          </div>
          <el-divider>随机倍率</el-divider>
          <div class="form-grid">
            <el-form-item label="随机下限">
              <el-input-number v-model="formModel.randomRate.low" :step="0.05" />
            </el-form-item>
            <el-form-item label="随机上限">
              <el-input-number v-model="formModel.randomRate.high" :step="0.05" />
            </el-form-item>
          </div>
          <el-divider>列表配置</el-divider>
          <div class="form-grid">
            <el-form-item label="被动 ID">
              <el-select
                v-model="formModel.strength"
                multiple
                filterable
                allow-create
                placeholder="输入或选择 ID"
              >
                <el-option
                  v-for="option in strengthOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="技能 ID">
              <el-select
                v-model="formModel.skillList"
                multiple
                filterable
                allow-create
                placeholder="输入或选择 ID"
              >
                <el-option
                  v-for="option in skillOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </div>
          <el-divider>状态配置</el-divider>
          <div class="status-grid">
            <div class="status-card">
              <div class="status-head">
                <span>弱化状态</span>
                <el-switch v-model="formModel.weakStatusEnabled" />
              </div>
              <div v-if="formModel.weakStatusEnabled" class="status-body">
                <el-form-item label="回合">
                  <el-input-number v-model="formModel.weakStatus.round" :min="0" />
                </el-form-item>
                <el-form-item label="倍率">
                  <el-input-number v-model="formModel.weakStatus.powerRate" :step="0.05" />
                </el-form-item>
              </div>
            </div>
            <div class="status-card">
              <div class="status-head">
                <span>强化状态</span>
                <el-switch v-model="formModel.strongStatusEnabled" />
              </div>
              <div v-if="formModel.strongStatusEnabled" class="status-body">
                <el-form-item label="回合">
                  <el-input-number v-model="formModel.strongStatus.round" :min="0" />
                </el-form-item>
                <el-form-item label="倍率">
                  <el-input-number v-model="formModel.strongStatus.powerRate" :step="0.05" />
                </el-form-item>
              </div>
            </div>
            <div class="status-card">
              <div class="status-head">
                <span>护甲状态</span>
                <el-switch v-model="formModel.armorStatusEnabled" />
              </div>
              <div v-if="formModel.armorStatusEnabled" class="status-body">
                <el-form-item label="回合">
                  <el-input-number v-model="formModel.armorStatus.round" :min="0" />
                </el-form-item>
                <el-form-item label="数值">
                  <el-input-number v-model="formModel.armorStatus.value" />
                </el-form-item>
              </div>
            </div>
            <div class="status-card">
              <div class="status-head">
                <span>伤害加成</span>
                <el-switch v-model="formModel.damageStatusEnabled" />
              </div>
              <div v-if="formModel.damageStatusEnabled" class="status-body">
                <el-form-item label="回合">
                  <el-input-number v-model="formModel.damageStatus.round" :min="0" />
                </el-form-item>
                <el-form-item label="数值">
                  <el-input-number v-model="formModel.damageStatus.value" />
                </el-form-item>
              </div>
            </div>
          </div>
        </template>

        <template v-if="dialogType === 'skills'">
          <el-divider>基础信息</el-divider>
          <div class="form-grid">
            <el-form-item label="ID">
              <el-input-number v-model="formModel.id" :min="1" />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="formModel.name" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="formModel.des" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="技能威力">
              <el-input-number v-model="formModel.power" />
            </el-form-item>
            <el-form-item label="吸血比例">
              <el-input-number v-model="formModel.suckBloodRate" :step="0.05" />
            </el-form-item>
            <el-form-item label="命中率">
              <el-input-number v-model="formModel.accuracy" :step="0.01" />
            </el-form-item>
            <el-form-item label="暴击率">
              <el-input-number v-model="formModel.criticalRate" :step="0.01" />
            </el-form-item>
            <el-form-item label="隐藏">
              <el-switch v-model="formModel.hidden" />
            </el-form-item>
          </div>
          <el-divider>附加状态</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addPutStatus(formModel.putStatus)">
              添加状态
            </el-button>
            <div v-for="(item, index) in formModel.putStatus" :key="index" class="list-row">
              <el-select v-model="item.name" placeholder="状态类型" class="list-field">
                <el-option
                  v-for="option in statusNameOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input-number size="small" v-model="item.round" :min="0" class="list-field" />
              <el-input-number size="small" v-model="item.value" class="list-field" >
                <template #prefix>
                  <span>数值(与倍率2选1)</span>
                </template>
              </el-input-number>
              <el-input-number size="small" v-model="item.rate" :min="0" :max="1" :step="0.05" class="list-field" >
                <template #prefix>
                  <span>倍率</span>
                </template>
              </el-input-number>
              <el-button size="small" type="danger" plain @click="removeListItem(formModel.putStatus, index)">
                删除
              </el-button>
            </div>
          </div>
          <el-divider>属性变更</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addChangeValue(formModel.changeValue)">
              添加变更
            </el-button>
            <div v-for="(item, index) in formModel.changeValue" :key="index" class="list-row">
              <el-switch v-model="item.self" active-text="自身" inactive-text="敌方" />
              <el-select v-model="item.name" placeholder="属性" class="list-field">
                <el-option
                  v-for="option in changeValueOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input-number size="small" v-model="item.value" class="list-field" >
                <template #prefix>
                  <span>数值(与倍率2选1)</span>
                </template>
              </el-input-number>
              <el-input-number size="small" v-model="item.rate" :min="0" :max="1" :step="0.05" class="list-field" >
                <template #prefix>
                  <span>倍率</span>
                </template>
              </el-input-number>
              <div>
                <el-button type="danger" plain @click="removeListItem(formModel.changeValue, index)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </template>

        <template v-if="dialogType === 'strengths'">
          <el-divider>基础信息</el-divider>
          <div class="form-grid">
            <el-form-item label="ID">
              <el-input-number v-model="formModel.id" :min="1" />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="formModel.name" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="formModel.des" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="威力">
              <el-input-number v-model="formModel.power" />
            </el-form-item>
            <el-form-item label="命中率">
              <el-input-number v-model="formModel.accuracy" :step="0.01" />
            </el-form-item>
          </div>
          <el-divider>触发条件</el-divider>
          <div class="condition-block">
            <el-switch v-model="formModel.conditionEnabled" active-text="启用" inactive-text="关闭" />
            <div v-if="formModel.conditionEnabled" class="condition-body">
              <div class="form-grid">
                <el-form-item label="比较类型">
                  <el-select v-model="formModel.condition.type">
                    <el-option label="大于等于" value=">=" />
                    <el-option label="小于" value="<" />
                  </el-select>
                </el-form-item>
                <el-form-item label="回合数">
                  <el-input-number v-model="formModel.condition.round" :min="0" />
                </el-form-item>
                <el-form-item label="触发间隔">
                  <el-input-number v-model="formModel.condition.interval" :min="0" />
                </el-form-item>
                <el-form-item label="触发概率">
                  <el-input-number v-model="formModel.condition.dice" :step="0.05" />
                </el-form-item>
              </div>
              <div class="sub-block">
                <el-switch
                  v-model="formModel.condition.selfConditionEnabled"
                  active-text="自身条件"
                  inactive-text="无"
                />
                <div v-if="formModel.condition.selfConditionEnabled" class="form-grid">
                  <el-form-item label="生命值">
                    <el-input-number v-model="formModel.condition.selfCondition.health" />
                  </el-form-item>
                  <el-form-item label="生命比例">
                    <el-input-number v-model="formModel.condition.selfCondition.healthRate" :step="0.05" />
                  </el-form-item>
                  <el-form-item label="攻击">
                    <el-input-number v-model="formModel.condition.selfCondition.attack" />
                  </el-form-item>
                  <el-form-item label="防御">
                    <el-input-number v-model="formModel.condition.selfCondition.defence" />
                  </el-form-item>
                  <el-form-item label="攻击比例">
                    <el-input-number v-model="formModel.condition.selfCondition.attackRate" :step="0.05" />
                  </el-form-item>
                  <el-form-item label="防御比例">
                    <el-input-number v-model="formModel.condition.selfCondition.defenceRate" :step="0.05" />
                  </el-form-item>
                </div>
              </div>
              <div class="sub-block">
                <el-switch
                  v-model="formModel.condition.enemyConditionEnabled"
                  active-text="敌方条件"
                  inactive-text="无"
                />
                <div v-if="formModel.condition.enemyConditionEnabled" class="form-grid">
                  <el-form-item label="生命值">
                    <el-input-number v-model="formModel.condition.enemyCondition.health" />
                  </el-form-item>
                  <el-form-item label="生命比例">
                    <el-input-number v-model="formModel.condition.enemyCondition.healthRate" :step="0.05" />
                  </el-form-item>
                  <el-form-item label="攻击">
                    <el-input-number v-model="formModel.condition.enemyCondition.attack" />
                  </el-form-item>
                  <el-form-item label="防御">
                    <el-input-number v-model="formModel.condition.enemyCondition.defence" />
                  </el-form-item>
                  <el-form-item label="攻击比例">
                    <el-input-number v-model="formModel.condition.enemyCondition.attackRate" :step="0.05" />
                  </el-form-item>
                  <el-form-item label="防御比例">
                    <el-input-number v-model="formModel.condition.enemyCondition.defenceRate" :step="0.05" />
                  </el-form-item>
                </div>
              </div>
            </div>
          </div>
          <el-divider>附加状态</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addPutStatus(formModel.status)">添加状态</el-button>
            <div v-for="(item, index) in formModel.status" :key="index" class="list-row">
              <el-select v-model="item.name" placeholder="状态类型" class="list-field">
                <el-option
                  v-for="option in statusNameOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input-number v-model="item.round" :min="0" class="list-field" />
              <el-input-number v-model="item.value" class="list-field" />
              <el-input-number v-model="item.rate" :step="0.05" class="list-field" />
              <el-button type="danger" plain @click="removeListItem(formModel.status, index)">
                删除
              </el-button>
            </div>
          </div>
          <el-divider>属性变更</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addChangeValue(formModel.changeValue)">
              添加变更
            </el-button>
            <div v-for="(item, index) in formModel.changeValue" :key="index" class="list-row">
              <el-switch v-model="item.self" active-text="自身" inactive-text="敌方" />
              <el-select v-model="item.name" placeholder="属性" class="list-field">
                <el-option
                  v-for="option in changeValueOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input-number v-model="item.value" class="list-field" />
              <el-input-number v-model="item.rate" :step="0.05" class="list-field" />
              <el-button type="danger" plain @click="removeListItem(formModel.changeValue, index)">
                删除
              </el-button>
            </div>
          </div>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.custom-module {
  border-radius: 24px;
  padding: 24px;
  background: rgba(9, 13, 22, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.custom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.custom-head h3 {
  margin: 0 0 6px;
  font-size: 20px;
}

.custom-head p {
  margin: 0;
  color: var(--text-muted);
}

.custom-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.02em;
  background: rgba(74, 215, 191, 0.12);
  border: 1px solid rgba(74, 215, 191, 0.3);
  color: rgba(203, 255, 246, 0.9);
}

.custom-badge.disabled {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
}

.custom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.custom-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-card h4 {
  margin: 0;
  font-size: 17px;
}

.custom-card p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.custom-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-body {
  max-height: 70vh;
  overflow: auto;
  padding-right: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px 16px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px;
}

.status-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px;
  background: rgba(255, 255, 255, 0.02);
}

.status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.status-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-row {
  display: grid;
  grid-template-columns: 140px 120px 120px 120px auto;
  gap: 8px;
  align-items: center;
}

.list-field {
  width: 100%;
}

.select-field {
  width: 100%;
}

.condition-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.condition-body {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  .list-row {
    grid-template-columns: 1fr;
  }
}
</style>
