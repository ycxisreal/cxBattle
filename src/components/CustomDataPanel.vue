
<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  units as runtimeUnits,
  skills as runtimeSkills,
  strengths as runtimeStrengths,
  blessings as runtimeBlessings,
  equipmentAffixes as runtimeEquipmentAffixes,
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
  blessings: cloneData(runtimeBlessings) || [],
});

const typeLabels = {
  units: "角色",
  skills: "技能",
  strengths: "被动",
  blessings: "祝福",
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
const skillPreviewVisible = ref(false);
const strengthPreviewVisible = ref(false);
const blessingPreviewVisible = ref(false);
const dialogMode = ref("add");
const selectMode = ref("edit");
const dialogType = ref("units");
const selectedIds = reactive({
  units: null,
  skills: null,
  strengths: null,
  blessings: null,
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

const blessingQualityRank = {
  A: 3,
  B: 2,
  C: 1,
};

const blessingPreviewSortBy = ref("id");
const blessingPreviewSortOrder = ref("asc");
const blessingPreviewQualityFilter = ref("all");
const blessingPreviewRepeatableFilter = ref("all");
const blessingPreviewPage = ref(1);
const blessingPreviewPageSize = ref(8);

// 祝福预览数据标准化，确保排序与展示字段稳定。
const normalizedBlessingsForPreview = computed(() =>
  (customData.blessings || []).map((item) => ({
    id: Number(item?.id || 0),
    name: String(item?.name || ""),
    quality: String(item?.quality || "C").toUpperCase(),
    maxStack: Math.max(1, Number(item?.maxStack || 1)),
    repeatable: Boolean(item?.repeatable),
    desc: String(item?.desc || ""),
  }))
);

// 按筛选条件过滤祝福预览列表。
const filteredBlessingsForPreview = computed(() =>
  normalizedBlessingsForPreview.value.filter((item) => {
    const passQuality =
      blessingPreviewQualityFilter.value === "all" ||
      item.quality === blessingPreviewQualityFilter.value;
    const passRepeatable =
      blessingPreviewRepeatableFilter.value === "all" ||
      (blessingPreviewRepeatableFilter.value === "repeatable" && item.repeatable) ||
      (blessingPreviewRepeatableFilter.value === "single" && !item.repeatable);
    return passQuality && passRepeatable;
  })
);

// 按当前排序规则排序祝福预览列表。
const sortedBlessingsForPreview = computed(() => {
  const list = [...filteredBlessingsForPreview.value];
  const orderFactor = blessingPreviewSortOrder.value === "desc" ? -1 : 1;
  const sortBy = blessingPreviewSortBy.value;
  list.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "zh-Hans-CN") * orderFactor;
    }
    if (sortBy === "quality") {
      return (
        (Number(blessingQualityRank[a.quality] || 0) -
          Number(blessingQualityRank[b.quality] || 0)) * orderFactor
      );
    }
    if (sortBy === "maxStack") {
      return (a.maxStack - b.maxStack) * orderFactor;
    }
    return (a.id - b.id) * orderFactor;
  });
  return list;
});

const blessingPreviewTotal = computed(() => sortedBlessingsForPreview.value.length);

// 对排序后的祝福列表进行分页裁剪。
const pagedBlessingsForPreview = computed(() => {
  const start = (blessingPreviewPage.value - 1) * blessingPreviewPageSize.value;
  return sortedBlessingsForPreview.value.slice(start, start + blessingPreviewPageSize.value);
});

// 打开祝福预览弹窗并重置分页位置。
const openBlessingPreview = () => {
  blessingPreviewVisible.value = true;
  blessingPreviewPage.value = 1;
};

// 排序或筛选变更后，将分页回到第一页避免空页。
const resetBlessingPreviewPage = () => {
  blessingPreviewPage.value = 1;
};


// 重置选择弹窗状态
const resetSelectState = () => {
  selectedId.value = null;
  selectKey.value += 1;
};

// 切换类型时预置表单结构，避免空对象渲染报错
const prepareFormByType = (type) => {
  if (type === "units") formModel.value = createDefaultUnit();
  if (type === "skills") formModel.value = createDefaultSkill();
  if (type === "strengths") formModel.value = createDefaultStrength();
  if (type === "blessings") formModel.value = createDefaultBlessing();
};

// 获取下一个可用 ID
const getNextId = (list) => {
  const maxId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return maxId + 1;
};

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

// 创建默认祝福
const createDefaultBlessing = () => ({
  id: getNextId(customData.blessings),
  name: "新祝福",
  quality: "C",
  cost: 1,
  desc: "",
  implKey: "",
  repeatable: false,
  maxStack: 1,
  tags: [],
});

// 构建角色表单
const buildUnitForm = (unit) => {
  const base = cloneData(unit) || {};
  const cleaned = { ...base };
  delete cleaned.weakStatus;
  delete cleaned.strongStatus;
  delete cleaned.armorStatus;
  delete cleaned.damageStatus;
  delete cleaned.weakStatusEnabled;
  delete cleaned.strongStatusEnabled;
  delete cleaned.armorStatusEnabled;
  delete cleaned.damageStatusEnabled;
  return {
    ...createDefaultUnit(),
    ...cleaned,
    strength: cleaned?.strength || [],
    skillList: cleaned?.skillList || [],
    randomRate: cleaned?.randomRate || { low: 0.8, high: 1.2 },
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

// 构建祝福表单
const buildBlessingForm = (blessing) => ({
  ...createDefaultBlessing(),
  ...(cloneData(blessing) || {}),
  tags: Array.isArray(blessing?.tags) ? cloneData(blessing.tags) : [],
});

// 打开新增弹窗
const openAdd = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  dialogMode.value = "add";
  editingId.value = null;
  selectVisible.value = false;
  resetSelectState();
  prepareFormByType(type);
  dialogVisible.value = true;
};

// 打开编辑选择弹窗
const openEdit = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  prepareFormByType(type);
  selectMode.value = "edit";
  resetSelectState();
  selectVisible.value = true;
};

// 打开删除选择弹窗
const openDelete = (type) => {
  if (!isElectronEnv) return;
  dialogType.value = type;
  prepareFormByType(type);
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
    if (dialogType.value === "blessings") formModel.value = buildBlessingForm(item);
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

// 标准化技能/被动的附加状态
const normalizePutStatus = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => item?.name)
    .map((item) => {
      const hasValue = item.value !== undefined && item.value !== null;
      const hasRate = item.rate !== undefined && item.rate !== null;
      return {
        name: item.name,
        round: Number(item.round || 0),
        value: hasValue ? Number(item.value) : undefined,
        rate:
          hasValue
            ? undefined
            : hasRate
              ? Number(item.rate)
              : undefined,
      };
    });

// 标准化数值变更
const normalizeChangeValue = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => item?.name)
    .map((item) => {
      const hasValue = item.value !== undefined && item.value !== null;
      const hasRate = item.rate !== undefined && item.rate !== null;
      return {
        self: Boolean(item.self),
        name: item.name,
        value: hasValue ? Number(item.value) : undefined,
        rate:
          hasValue
            ? undefined
            : hasRate
              ? Number(item.rate)
              : undefined,
      };
    });

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
    blessings: cloneData(customData.blessings),
    equipmentAffixes: cloneData(runtimeEquipmentAffixes),
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
    };
    delete normalized.weakStatus;
    delete normalized.strongStatus;
    delete normalized.armorStatus;
    delete normalized.damageStatus;
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
    delete normalized.hidden;
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

  if (dialogType.value === "blessings") {
    normalized = {
      ...cloneData(formModel.value),
      quality: String(formModel.value.quality || "C"),
      cost: Number(formModel.value.cost || 0),
      implKey: String(formModel.value.implKey || "").trim(),
      repeatable: Boolean(formModel.value.repeatable),
      maxStack: Math.max(1, Number(formModel.value.maxStack || 1)),
      tags: (Array.isArray(formModel.value.tags) ? formModel.value.tags : [])
        .map((tag) => String(tag).trim())
        .filter(Boolean),
    };
    if (!["A", "B", "C"].includes(normalized.quality)) {
      ElMessage.warning("祝福品质必须为 A/B/C");
      return;
    }
    if (!normalized.implKey) {
      ElMessage.warning("implKey 不能为空");
      return;
    }
    // 校验祝福逻辑键唯一性：新增与编辑均不允许与其他祝福重复。
    const duplicateImplKey = customData.blessings.some((item) => {
      if (dialogMode.value === "edit" && Number(item.id) === Number(editingId.value)) {
        return false;
      }
      return String(item.implKey || "").trim() === normalized.implKey;
    });
    if (duplicateImplKey) {
      ElMessage.warning("implKey 已存在，请使用唯一键名");
      return;
    }
    if (!normalized.repeatable) {
      normalized.maxStack = 1;
    }
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
const addPutStatus = (target, key) => {
  if (!target) return;
  if (!Array.isArray(target[key])) {
    target[key] = [];
  }
  target[key].push({
    name: "weak",
    round: 1,
    value: null,
    rate: 1,
  });
};

// 添加数值变更项
const addChangeValue = (target, key) => {
  if (!target) return;
  if (!Array.isArray(target[key])) {
    target[key] = [];
  }
  target[key].push({
    self: true,
    name: "hp",
    value: 0,
    rate: null,
  });
};

// 数值/倍率二选一联动
const handleExclusiveValueRate = (item, key, value) => {
  if (!item) return;
  if (key === "value" && value !== null && value !== undefined) {
    item.rate = null;
  }
  if (key === "rate" && value !== null && value !== undefined) {
    item.value = null;
  }
};

// 删除列表中的某一项
const removeListItem = (list, index) => {
  if (!Array.isArray(list)) return;
  list.splice(index, 1);
};
</script>

<template>
  <section class="custom-module">
    <header class="custom-head">
      <div>
        <h3>自定义模块</h3>
        <p>在 Electron 端管理角色、技能、被动与祝福数据。</p>
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
      <div class="custom-card">
        <h4>祝福</h4>
        <p>新增、编辑与删除祝福数据。</p>
        <p class="warn-text">提示：修改祝福后需同步调整对应 implKey 的源码逻辑。</p>
        <div class="custom-actions">
          <div>
            <el-button size="small" @click="openBlessingPreview">
              预览
            </el-button>
            <el-button size="small" :disabled="!isElectronEnv" @click="openAdd('blessings')">
              添加
            </el-button>
            <el-button size="small" :disabled="!isElectronEnv" @click="openEdit('blessings')">
              编辑
            </el-button>
            <el-button
                size="small"
                type="danger"
                plain
                :disabled="!isElectronEnv"
                @click="openDelete('blessings')"
            >
              删除
            </el-button>
          </div>
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
            <el-form-item label="描述" class="form-full">
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
          <div class="list-toolbar">
            <el-button size="small" @click="strengthPreviewVisible = true">
              查看被动详情
            </el-button>
            <el-button size="small" @click="skillPreviewVisible = true">
              查看技能详情
            </el-button>
          </div>
          <div class="form-grid">
            <el-form-item label="被动 ID">
              <el-select
                v-model="formModel.strength"
                multiple
                filterable
                allow-create
                collapse-tags
                :max-collapse-tags="4"
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
                collapse-tags
                :max-collapse-tags="4"
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
            <el-form-item label="描述" class="form-full">
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
          </div>
          <el-divider>附加状态</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addPutStatus(formModel, 'putStatus')">
              添加状态
            </el-button>
            <div v-for="(item, index) in formModel.putStatus" :key="index" class="list-row list-row--status">
              <div class="list-cell">
                <span class="field-label">状态类型</span>
                <el-select v-model="item.name" placeholder="状态类型" class="list-field">
                  <el-option
                    v-for="option in statusNameOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="list-cell">
                <span class="field-label">回合</span>
                <el-input-number size="small" v-model="item.round" :min="0" class="list-field" />
              </div>
              <div class="list-cell">
                <span class="field-label">数值</span>
                <el-input-number
                  size="small"
                  v-model="item.value"
                  class="list-field"
                  @change="handleExclusiveValueRate(item, 'value', $event)"
                />
              </div>
              <div class="list-cell">
                <span class="field-label">倍率</span>
                <el-input-number
                  size="small"
                  v-model="item.rate"
                  :min="0"
                  :max="2"
                  :step="0.05"
                  class="list-field"
                  @change="handleExclusiveValueRate(item, 'rate', $event)"
                />
              </div>
              <div class="list-cell list-cell--action">
                <el-button size="small" type="danger" plain @click="removeListItem(formModel.putStatus, index)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
          <el-divider>属性变更</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addChangeValue(formModel, 'changeValue')">
              添加变更
            </el-button>
            <p class="list-hint">数值/倍率二选一，填写其一即可。</p>
            <div v-for="(item, index) in formModel.changeValue" :key="index" class="list-row list-row--change">
              <div class="list-cell">
                <span class="field-label">目标</span>
                <el-switch v-model="item.self" active-text="自身" inactive-text="敌方" />
              </div>
              <div class="list-cell">
                <span class="field-label">属性</span>
                <el-select v-model="item.name" placeholder="属性" class="list-field">
                  <el-option
                    v-for="option in changeValueOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <div class="list-cell">
                <span class="field-label">数值</span>
                <el-input-number
                  size="small"
                  v-model="item.value"
                  class="list-field"
                  @change="handleExclusiveValueRate(item, 'value', $event)"
                />
              </div>
              <div class="list-cell">
                <span class="field-label">倍率</span>
                <el-input-number
                  size="small"
                  v-model="item.rate"
                  :min="0"
                  :max="2"
                  :step="0.05"
                  class="list-field"
                  @change="handleExclusiveValueRate(item, 'rate', $event)"
                />
              </div>
              <div class="list-cell list-cell--action">
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
            <el-form-item label="描述" class="form-full">
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
            <el-button size="small" @click="addPutStatus(formModel, 'status')">添加状态</el-button>
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
              <el-input-number
                v-model="item.value"
                class="list-field"
                @change="handleExclusiveValueRate(item, 'value', $event)"
              />
              <el-input-number
                v-model="item.rate"
                :min="0"
                :max="1"
                :step="0.05"
                class="list-field"
                @change="handleExclusiveValueRate(item, 'rate', $event)"
              />
              <el-button type="danger" plain @click="removeListItem(formModel.status, index)">
                删除
              </el-button>
            </div>
          </div>
          <el-divider>属性变更</el-divider>
          <div class="list-block">
            <el-button size="small" @click="addChangeValue(formModel, 'changeValue')">
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
              <el-input-number
                v-model="item.value"
                class="list-field"
                @change="handleExclusiveValueRate(item, 'value', $event)"
              />
              <el-input-number
                v-model="item.rate"
                :min="0"
                :max="1"
                :step="0.05"
                class="list-field"
                @change="handleExclusiveValueRate(item, 'rate', $event)"
              />
              <el-button type="danger" plain @click="removeListItem(formModel.changeValue, index)">
                删除
              </el-button>
            </div>
          </div>
        </template>

        <template v-if="dialogType === 'blessings'">
          <el-divider>基础信息</el-divider>
          <p class="warn-text form-warn">
            提示：添加或编辑祝福需要同步修改源代码中相应祝福逻辑（implKey 对应 `blessingSystem.js`）。
          </p>
          <div class="form-grid">
            <el-form-item label="ID">
              <el-input-number v-model="formModel.id" :min="1" />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="formModel.name" />
            </el-form-item>
            <el-form-item label="品质">
              <el-select v-model="formModel.quality">
                <el-option label="A" value="A" />
                <el-option label="B" value="B" />
                <el-option label="C" value="C" />
              </el-select>
            </el-form-item>
            <el-form-item label="消耗点数">
              <el-input-number v-model="formModel.cost" :min="0" />
            </el-form-item>
            <el-form-item label="逻辑键 implKey" class="form-full">
              <el-input v-model="formModel.implKey" placeholder="如：player_damage_boost" />
            </el-form-item>
            <el-form-item label="是否可重复">
              <el-switch v-model="formModel.repeatable" active-text="是" inactive-text="否" />
            </el-form-item>
            <el-form-item label="最大层数">
              <el-input-number v-model="formModel.maxStack" :min="1" :disabled="!formModel.repeatable" />
            </el-form-item>
            <el-form-item label="标签" class="form-full">
              <el-select
                v-model="formModel.tags"
                multiple
                filterable
                allow-create
                default-first-option
                collapse-tags
                :max-collapse-tags="4"
                placeholder="可输入多个标签"
              />
            </el-form-item>
            <el-form-item label="描述" class="form-full">
              <el-input v-model="formModel.desc" type="textarea" :rows="3" />
            </el-form-item>
          </div>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="skillPreviewVisible" title="技能详情" width="760px">
      <div class="details">
        <div v-if="!customData.skills.length" class="empty-hint">暂无技能数据</div>
        <div v-else class="preview-list">
          <div v-for="skill in customData.skills" :key="skill.id" class="preview-card">
            <div class="preview-head">
              <span class="preview-title">#{{ skill.id }} {{ skill.name }}</span>
              <span class="preview-meta">
              威力 {{ skill.power ?? "-" }} · 命中 {{ skill.accuracy ?? "-" }} · 暴击 {{ skill.criticalRate ?? "-" }}
            </span>
            </div>
            <p class="preview-desc">{{ skill.des || "无描述" }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="strengthPreviewVisible" title="被动详情" width="760px">
      <div class="details">
        <div v-if="!customData.strengths.length" class="empty-hint">暂无被动数据</div>
        <div v-else class="preview-list">
          <div v-for="strength in customData.strengths" :key="strength.id" class="preview-card">
            <div class="preview-head">
              <span class="preview-title">#{{ strength.id }} {{ strength.name }}</span>
              <span class="preview-meta">
              威力 {{ strength.power ?? "-" }} · 命中 {{ strength.accuracy ?? "-" }}
            </span>
            </div>
            <p class="preview-desc">{{ strength.des || "无描述" }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="blessingPreviewVisible" title="祝福详情" width="960px">
      <div class="details">
        <div class="preview-toolbar">
          <el-select
            v-model="blessingPreviewSortBy"
            style="width: 150px"
            @change="resetBlessingPreviewPage"
          >
            <el-option label="按ID排序" value="id" />
            <el-option label="按名称排序" value="name" />
            <el-option label="按品质排序" value="quality" />
            <el-option label="按最大层数排序" value="maxStack" />
          </el-select>
          <el-select
            v-model="blessingPreviewSortOrder"
            style="width: 120px"
            @change="resetBlessingPreviewPage"
          >
            <el-option label="升序" value="asc" />
            <el-option label="降序" value="desc" />
          </el-select>
          <el-select
            v-model="blessingPreviewQualityFilter"
            style="width: 130px"
            @change="resetBlessingPreviewPage"
          >
            <el-option label="全部品质" value="all" />
            <el-option label="A 品质" value="A" />
            <el-option label="B 品质" value="B" />
            <el-option label="C 品质" value="C" />
          </el-select>
          <el-select
            v-model="blessingPreviewRepeatableFilter"
            style="width: 150px"
            @change="resetBlessingPreviewPage"
          >
            <el-option label="重复规则: 全部" value="all" />
            <el-option label="仅可重复" value="repeatable" />
            <el-option label="仅不可重复" value="single" />
          </el-select>
        </div>

        <div v-if="!blessingPreviewTotal" class="empty-hint">暂无祝福数据</div>
        <template v-else>
          <el-table :data="pagedBlessingsForPreview" border stripe class="blessing-preview-table">
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column prop="maxStack" label="最大层数" width="120" />
            <el-table-column prop="desc" label="描述" min-width="380" show-overflow-tooltip />
          </el-table>
          <div class="preview-pagination">
            <el-pagination
              v-model:current-page="blessingPreviewPage"
              v-model:page-size="blessingPreviewPageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[5, 8, 10, 15, 20]"
              :total="blessingPreviewTotal"
            />
          </div>
        </template>
      </div>
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

.warn-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #ffd89a !important;
}

.form-warn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 210, 130, 0.35);
  background: rgba(255, 173, 83, 0.12);
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

.form-full {
  grid-column: 1 / -1;
}

.list-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.list-row--status {
  grid-template-columns: minmax(160px, 1.4fr) repeat(3, minmax(120px, 1fr)) auto;
  align-items: end;
}

.list-row--change {
  grid-template-columns: minmax(140px, 1fr) minmax(180px, 1.2fr) repeat(2, minmax(120px, 1fr)) auto;
  align-items: end;
}

.list-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-cell--action {
  align-self: end;
}

.field-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.list-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.list-field {
  width: 100%;
}

.select-field {
  width: 100%;
}

.preview-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.preview-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
}

.preview-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.preview-desc {
  margin: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.72);
}

.empty-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
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

.custom-module :deep(.el-button) {
  width: auto;
  display: inline-flex;
}
.details{
  max-height: 75vh;
  overflow-y: scroll;
}

.preview-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.blessing-preview-table {
  width: 100%;
}

.preview-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .list-row {
    grid-template-columns: 1fr;
  }
}
</style>
