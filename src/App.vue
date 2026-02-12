<script setup>
import { computed, reactive, ref, watchEffect } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import BattleLog from "./components/BattleLog.vue";
import CustomDataPanel from "./components/CustomDataPanel.vue";
import SkillCard from "./components/SkillCard.vue";
import UnitCard from "./components/UnitCard.vue";
import { useBattle } from "./game/useBattle.js";
import { strengths } from "./game/data/runtimeData.js";

const {
  state,
  playerSkills,
  availableUnits,
  difficultyOptions,
  resetBattle,
  setDifficulty,
  toggleChainMode,
  chooseSkill,
  toggleRandomize,
  startBattleWithSelection,
  backToSelect,
  togglePreDraftItem,
  refreshPreDraftCandidates,
  confirmPreDraft,
  chooseMidDraftBlessing,
  clearGameOverMeta,
  globalPointSummary,
  getUnitPointRows,
  getAllUnitPointOverview,
  allocatePointToUnit,
  deallocatePointFromUnit,
  resetUnitPointAllocation,
} = useBattle();

const selectedUnitId = ref(null);
const maxUnitDisplay = 6;
const unitPage = ref(0);
const showUnitModal = ref(false);
const skillPage = ref(0);
const selectedSkillIds = ref([]);
const autoSkillIds = ref([]);
const showSkillPool = ref(false);
const sidebarTabs = [
  {
    id: "skill-formula",
    title: "技能攻击力计算公式",
  },
];
const activeSidebarId = ref("skill-formula");
const showFormulaModal = ref(false);
const showDifficultyModal = ref(false);
const showBlessingsModal = ref(false);
const showPointModal = ref(false);
const activePointUnitId = ref(null);
const showGameOverModal = ref(false);
const lastAutoGameOverKey = ref("");
const difficultyChangedPendingReset = ref(false);
const gameOverDialog = reactive({
  reasonText: "",
  pointGain: 0,
  confirmText: "确认",
  afterConfirm: null,
});
const difficultyDescriptions = {
  normal: "普通：敌人使用默认数值，不额外强化。",
  hard: "困难：生命、攻击提升至 1.2 倍，防御提升至 1.05 倍。",
  extreme:
    "极难：生命和攻击 1.4 倍，防御 1.05 倍，每回合额外回复 3 点生命，闪避率 +2%，暴击率 +5%。",
  expert:
    "专家：生命和攻击 1.5 倍，防御 1.15 倍，每回合额外回复 7 点生命，闪避率 +4%，暴击率 +8%，并随机增加 1 个未拥有被动特长。",
  inferno:
    "炼狱：生命和攻击 1.75 倍，防御 1.15 倍，每回合额外回复 12 点生命，闪避率 +6%，暴击率 +10%，并随机增加 1 个未拥有被动特长。",
};

// 当前难度文本与样式标记。
const currentDifficultyLabel = computed(
  () => difficultyOptions.find((item) => item.key === state.difficulty)?.label || "普通"
);
const currentDifficultyTone = computed(() => `tone-${state.difficulty}`);

const selectedUnit = computed(() =>
  availableUnits.value.find((unit) => unit.id === selectedUnitId.value)
);
const activePointUnit = computed(() =>
  availableUnits.value.find((unit) => unit.id === activePointUnitId.value)
);
const pointOverviewList = computed(() => getAllUnitPointOverview());
const activePointRows = computed(() =>
  activePointUnitId.value ? getUnitPointRows(activePointUnitId.value) : []
);

// 计算角色分页总数
const totalUnitPages = computed(() =>
  Math.max(1, Math.ceil(availableUnits.value.length / maxUnitDisplay))
);

// 当前页展示的角色
const pagedUnits = computed(() => {
  const start = unitPage.value * maxUnitDisplay;
  return availableUnits.value.slice(start, start + maxUnitDisplay);
});

// 是否需要分页控制
const shouldShowUnitControls = computed(
  () => availableUnits.value.length > maxUnitDisplay
);

// 当前页码（从 1 开始）
const currentUnitPage = computed(() => unitPage.value + 1);

// 获取当前侧边栏内容
const activeSidebarTab = computed(
  () => sidebarTabs.find((tab) => tab.id === activeSidebarId.value) || sidebarTabs[0]
);

// 监听角色分页数据变化，确保页码不越界
watchEffect(() => {
  const maxPageIndex = totalUnitPages.value - 1;
  if (unitPage.value > maxPageIndex) unitPage.value = maxPageIndex;
  const availableIds = availableUnits.value.map((unit) => unit.id);
  if (!availableIds.length) {
    activePointUnitId.value = null;
    return;
  }
  if (!availableIds.includes(activePointUnitId.value)) {
    activePointUnitId.value = selectedUnitId.value && availableIds.includes(selectedUnitId.value)
      ? selectedUnitId.value
      : availableIds[0];
  }
});

watchEffect(() => {
  if (state.phase !== "battle") return;
  if (!state.over || !state.gameOverReason) return;
  const key = `${state.round}-${state.gameOverReason}-${state.winner || ""}`;
  if (key === lastAutoGameOverKey.value) return;
  lastAutoGameOverKey.value = key;
  const reasonText =
    state.gameOverReason === "enemy_defeated_non_chain"
      ? "你击败了敌人（非连战模式下本局结束）"
      : "你被敌人击败";
  openGameOverDialog({
    reasonText,
    pointGain: Number(state.gameOverPointGain || 0),
    confirmText: "确认",
    afterConfirm: null,
  });
});

watchEffect(() => {
  if (!state.over) {
    lastAutoGameOverKey.value = "";
  }
});

// 选择角色并在需要时关闭弹窗
const handleSelectUnit = (unitId) => {
  selectedUnitId.value = unitId;
  showUnitModal.value = false;
};

// 轮转到上一页角色
const prevUnitPage = () => {
  if (!shouldShowUnitControls.value) return;
  unitPage.value =
    unitPage.value === 0 ? totalUnitPages.value - 1 : unitPage.value - 1;
};

// 轮转到下一页角色
const nextUnitPage = () => {
  if (!shouldShowUnitControls.value) return;
  unitPage.value =
    unitPage.value >= totalUnitPages.value - 1 ? 0 : unitPage.value + 1;
};

// 打开全部角色弹窗
const openUnitModal = () => {
  showUnitModal.value = true;
};

// 关闭全部角色弹窗
const closeUnitModal = () => {
  showUnitModal.value = false;
};

const startBattle = () => {
  if (!selectedUnitId.value) return;
  startBattleWithSelection(selectedUnitId.value);
  // 进入战斗时从技能池随机抽取4个作为默认出招栏。
  autoSkillIds.value = pickRandomSkillIds(playerSkills.value, 4);
  skillPage.value = 0;
  selectedSkillIds.value = [];
  showSkillPool.value = false;
};

const skipRound = () => {
  chooseSkill(null);
};

const handleResetBattle = () => {
  resetBattle();
  // 重置战斗后重新随机默认出招栏，保持与手动4选一致的效果。
  autoSkillIds.value = pickRandomSkillIds(playerSkills.value, 4);
  skillPage.value = 0;
  selectedSkillIds.value = [];
  showSkillPool.value = false;
};

const handleBackToSelect = () => {
  backToSelect();
  selectedUnitId.value = state.selectedPlayerId;
  autoSkillIds.value = [];
  selectedSkillIds.value = [];
};

// 中文注释：统一打开“游戏结束”弹窗，并在确认后执行可选后续动作。
const openGameOverDialog = ({
  reasonText,
  pointGain = 0,
  confirmText = "确认",
  afterConfirm = null,
}) => {
  gameOverDialog.reasonText = reasonText;
  gameOverDialog.pointGain = Number(pointGain || 0);
  gameOverDialog.confirmText = confirmText;
  gameOverDialog.afterConfirm = typeof afterConfirm === "function" ? afterConfirm : null;
  showGameOverModal.value = true;
};

// 中文注释：确认结束弹窗后，先关闭弹窗，再继续执行后续动作（如退出或重开）。
const confirmGameOverDialog = () => {
  const nextAction = gameOverDialog.afterConfirm;
  showGameOverModal.value = false;
  gameOverDialog.afterConfirm = null;
  clearGameOverMeta();
  if (nextAction) nextAction();
};

// 中文注释：手动结束并退出，按“玩家被击败”处理。
const handleEndGameAndExit = () => {
  openGameOverDialog({
    reasonText: "你选择结束本局并退出（按玩家被击败结算）",
    pointGain: Number(state.runPointGain || 0),
    confirmText: "确认并退出",
    afterConfirm: handleBackToSelect,
  });
};

// 中文注释：手动结束并重新开始，按“玩家被击败”处理。
const handleEndGameAndRestart = () => {
  openGameOverDialog({
    reasonText: "你选择结束本局并重新开始（按玩家被击败结算）",
    pointGain: Number(state.runPointGain || 0),
    confirmText: "确认并重开",
    afterConfirm: handleResetBattle,
  });
};

// 从技能池中随机抽取指定数量的技能ID（不重复）。
const pickRandomSkillIds = (skillPool, count = 4) => {
  const ids = (skillPool || []).map((skill) => skill.id).filter(Boolean);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(Math.max(0, count), ids.length));
};

const visibleSkills = computed(() => {
  const selected = selectedSkillIds.value
    .map((id) => playerSkills.value.find((skill) => skill.id === id))
    .filter(Boolean);
  if (selected.length) return selected;
  const autoSelected = autoSkillIds.value
    .map((id) => playerSkills.value.find((skill) => skill.id === id))
    .filter(Boolean);
  if (autoSelected.length) return autoSelected;
  return playerSkills.value.slice(0, 4);
});

const isSkillSelected = (id) => selectedSkillIds.value.includes(id);
const toggleSkillSlot = (id) => {
  if (isSkillSelected(id)) {
    selectedSkillIds.value = selectedSkillIds.value.filter((sid) => sid !== id);
    return;
  }
  if (selectedSkillIds.value.length >= 4) return;
  selectedSkillIds.value = [...selectedSkillIds.value, id];
};

const clearSkillSlots = () => {
  selectedSkillIds.value = [];
};

const toggleSkillPool = () => {
  showSkillPool.value = !showSkillPool.value;
};

// 切换侧边栏选项
const handleSidebarSelect = (id) => {
  activeSidebarId.value = id;
  if (id === "skill-formula") showFormulaModal.value = true;
};

// 关闭弹窗
const closeFormulaModal = () => {
  showFormulaModal.value = false;
};

const closeDifficultyModal = () => {
  showDifficultyModal.value = false;
  if (difficultyChangedPendingReset.value && state.phase === "battle") {
    resetBattle();
    ElMessage.success("难度已应用，已重新开始战前构筑。");
  }
  difficultyChangedPendingReset.value = false;
};

// 中文注释：打开右侧构筑的“全部祝福预览”弹窗。
const openBlessingsModal = () => {
  showBlessingsModal.value = true;
};

// 中文注释：关闭“全部祝福预览”弹窗。
const closeBlessingsModal = () => {
  showBlessingsModal.value = false;
};

// 中文注释：打开全局加点弹窗，默认聚焦到当前已选择角色。
const openPointModal = () => {
  if (selectedUnitId.value) {
    activePointUnitId.value = selectedUnitId.value;
  }
  showPointModal.value = true;
};

// 中文注释：关闭全局加点弹窗。
const closePointModal = () => {
  showPointModal.value = false;
};

// 中文注释：切换加点弹窗中的目标角色。
const switchPointUnit = (unitId) => {
  activePointUnitId.value = unitId;
};

// 中文注释：对选中角色执行单次属性加点，并给出提示。
const handleAllocatePoint = (unitId, attrKey) => {
  const result = allocatePointToUnit(unitId, attrKey);
  if (result?.ok) {
    ElMessage.success("加点成功");
    return;
  }
  if (result?.message) {
    ElMessage.warning(result.message);
  }
};

// 中文注释：对选中角色执行单次属性减点，并给出提示。
const handleDeallocatePoint = (unitId, attrKey) => {
  const result = deallocatePointFromUnit(unitId, attrKey);
  if (result?.ok) {
    ElMessage.success("减点成功");
    return;
  }
  if (result?.message) {
    ElMessage.warning(result.message);
  }
};

// 中文注释：重置单个角色的加点分配。
const handleResetPointUnit = (unitId) => {
  const result = resetUnitPointAllocation(unitId);
  if (result?.ok) {
    ElMessage.success(`已重置，返还 ${result.resetPoints} 点`);
  }
};

// 中文注释：选择难度时先记录变更，等关闭难度窗口后再统一重开战前构筑。
const handleDifficultyChange = (difficultyKey) => {
  if (state.difficulty === difficultyKey) return;
  setDifficulty(difficultyKey);
  difficultyChangedPendingReset.value = true;
};

const isPreDraftSelected = (draftId) => state.draft.selectedPreIds.includes(draftId);
const toggleDraftCandidate = (draftId) => {
  const result = togglePreDraftItem(draftId);
  if (result?.ok === false && result.message) {
    ElMessage.warning(result.message);
  }
};
const handleConfirmPreDraft = () => confirmPreDraft();
const handleRefreshPreDraft = () => refreshPreDraftCandidates();
const handlePickMidDraftBlessing = (optionId) => chooseMidDraftBlessing(optionId);
const getQualityClass = (quality) => `quality-${String(quality || "C").toLowerCase()}`;
const getDraftEffectText = (item) =>
  item.type === "blessing"
    ? item.payload.desc || "无效果描述"
    : `词条：${(item.payload.modifiers || [])
      .map((m) => `${m.key}${m.mode === "mul" ? "x" : "+"}${m.value}`)
      .join("，") || "无"}`;
const getEquipmentEffectText = (item) =>
  (item.modifiers || [])
    .map((m) => `${m.key}${m.mode === "mul" ? "x" : "+"}${m.value}`)
    .join("，") || "无词条";
const getOwnedBlessingStack = (blessingId) =>
  Number(state.blessings.find((item) => item.id === blessingId)?.stack || 0);
const getBlessingMaxStack = (blessing) => {
  const parsedMaxStack = Number(blessing?.maxStack);
  if (Number.isFinite(parsedMaxStack) && parsedMaxStack > 0) {
    return Math.max(1, Math.floor(parsedMaxStack));
  }
  return 1;
};
const getBlessingStackText = (blessing) => {
  const owned = getOwnedBlessingStack(blessing.id);
  const max = getBlessingMaxStack(blessing);
  return `${owned}/${max}`;
};
const getBuildBlessingStackText = (blessing) => {
  const now = Number(blessing?.stack || 1);
  const max = getBlessingMaxStack(blessing);
  return `${now}/${max}`;
};
const formatPointValue = (value, displayAsPercent) => {
  const num = Number(value || 0);
  if (displayAsPercent) return `${(num * 100).toFixed(1)}%`;
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1);
};

const preDraftSelectedCost = computed(() =>
  state.draft.preCandidates
    .filter((item) => state.draft.selectedPreIds.includes(item.draftId))
    .reduce((sum, item) => sum + Number(item.cost || 0), 0)
);
const displayPointsUsed = computed(() => Number(state.pointsUsed || 0) + preDraftSelectedCost.value);
const displayPointsRemaining = computed(() =>
  Math.max(0, Number(state.pointsTotal || 0) - displayPointsUsed.value)
);

// 展示战中祝福三选一触发条件与当前生效状态。
const midDraftTriggerConditions = computed(() => {
  const conditions = [
    `每 ${state.draft.midDraftRoundInterval} 回合触发一次`,
    state.chainMode ? "连战中：每击败 1 个敌人触发一次" : "连战中：每击败 1 个敌人触发一次（当前未开启）",
    "每次三选一均包含固定选项：回复60%最大生命值",
  ];
  const startEnemyIndex = Number(state.draft.halfHpTriggerEnemyStartIndex || 5);
  if (state.enemyIndex >= startEnemyIndex) {
    conditions.push(
      state.draft.enemyHalfHpTriggered
        ? `第 ${startEnemyIndex} 个敌人起：对手生命首次降至50%触发（本敌人已触发）`
        : `第 ${startEnemyIndex} 个敌人起：对手生命首次降至50%触发（本敌人可触发）`
    );
  } else {
    conditions.push(
      `第 ${startEnemyIndex} 个敌人起：对手生命首次降至50%触发（当前第 ${state.enemyIndex} 个敌人，尚未生效）`
    );
  }
  return conditions;
});

// 展示当前战中三选一品质权重（A/B/C）。
const midDraftQualityWeightText = computed(() => {
  const weights = state.draft.midDraftQualityWeights || {};
  const format = (value) => Number(value || 0).toFixed(1);
  return `A ${format(weights.A)} / B ${format(weights.B)} / C ${format(weights.C)}`;
});

// 中文注释：用于右侧构筑面板的品质权重高亮展示（A/B/C 数值分离显示）。
const midDraftQualityWeightsDisplay = computed(() => {
  const weights = state.draft.midDraftQualityWeights || {};
  const format = (value) => Number(value || 0).toFixed(1);
  return [
    { key: "A", value: format(weights.A) },
    { key: "B", value: format(weights.B) },
    { key: "C", value: format(weights.C) },
  ];
});
</script>

<template>
  <div class="app">
    <div v-if="state.phase === 'select'" class="select-layout">
      <aside class="select-side select-side-left">
        <header class="hero">
          <div>
            <p class="kicker">Turn-based Combo Game</p>
            <h1>cxBattle</h1>
            <p class="subtitle">
            </p>
          </div>
          <div class="hero-actions">
            <button class="primary" type="button" @click="toggleRandomize">
              {{ state.randomize ? "关闭随机倍率影响" : "开启随机倍率影响" }}
            </button>
          </div>
        </header>
      </aside>

      <main class="select-main">
        <section class="select">
            <div class="select-panel">
            <div class="select-head">
              <h3>选择你的角色</h3>
              <p>选择一名角色进入战斗，对手将随机生成。</p>
            </div>
            <div class="select-controls">
              <p class="page-indicator">
                第 {{ currentUnitPage }} / {{ totalUnitPages }} 页，最多展示 {{ maxUnitDisplay }} 名
              </p>
              <div class="select-actions">
                <button
                  class="ghost"
                  type="button"
                  :disabled="!shouldShowUnitControls"
                  @click="prevUnitPage"
                >
                  上一批
                </button>
                <button
                  class="ghost"
                  type="button"
                  :disabled="!shouldShowUnitControls"
                  @click="nextUnitPage"
                >
                  下一批
                </button>
                <button class="primary" type="button" @click="openUnitModal">
                  查看全部
                </button>
              </div>
            </div>
            <div class="select-grid">
              <button
                v-for="unit in pagedUnits"
                :key="unit.id"
                class="select-card"
                :class="{ active: selectedUnitId === unit.id }"
                type="button"
                @click="handleSelectUnit(unit.id)"
              >
                <h4>{{ unit.name }}</h4>
                <p class="des">{{ unit.des }}</p>
                <div class="stats">
                  <span>攻击 {{ unit.attack }}</span>
                  <span>防御 {{ unit.defence }}</span>
                  <span>速度 {{ unit.speed }}</span>
                </div>
              </button>
            </div>
          </div>
          <aside class="select-preview">
            <h3>预览</h3>
            <UnitCard
              v-if="selectedUnit"
              title="已选择"
              :unit="selectedUnit"
              theme="player"
              :strengths="strengths"
            />
            <p v-else class="hint">请选择一个角色查看详情。</p>
            <button
              class="primary start"
              type="button"
              :disabled="!selectedUnitId"
              @click="startBattle"
            >
              进入战斗
            </button>
          </aside>
        </section>
        <div class="select-bottom-center">
          <CustomDataPanel />
        </div>
      </main>

      <aside class="select-side select-side-right">
        <div class="select-point">
          <h3>加点</h3>
          <div class="point-panel">
            <p class="point-panel-title">加点模块</p>
            <p class="point-line">剩余点数：{{ globalPointSummary.remainingPoints }}</p>
            <p class="point-line">已获得点数：{{ globalPointSummary.totalPoints }} / 300</p>
            <p class="point-line">已使用点数：{{ globalPointSummary.usedPoints }}</p>
            <ul class="point-overview-list">
              <li v-for="item in pointOverviewList" :key="`point-overview-${item.unitId}`">
                {{ item.unitName }}：{{ item.usedPoints }} 点
              </li>
            </ul>
            <button class="ghost point-open-btn" type="button" @click="openPointModal">
              开始加点
            </button>
          </div>
        </div>
      </aside>

    </div>

    <section v-if="state.phase === 'battle'" class="battle-layout">
      <aside class="battle-side battle-side-left">
        <div class="battle-sidebar">
          <div class="sidebar-tabs">
            <button
              v-for="tab in sidebarTabs"
              :key="tab.id"
              type="button"
              class="sidebar-tab"
              :class="{ active: tab.id === activeSidebarId }"
              @click="handleSidebarSelect(tab.id)"
            >
              {{ tab.title }}
            </button>
            <button class="sidebar-tab random-rate-btn" type="button" @click="toggleRandomize">
              {{ state.randomize ? "关闭随机倍率影响" : "开启随机倍率影响" }}
            </button>
            <div class="side-log-title">* 随机倍率影响:游戏中大部分数据会受到角色随机倍率的影响</div>
          </div>
          <div class="difficulty-quick">
            <p class="difficulty-current">
              当前难度：
              <span class="difficulty-badge" :class="currentDifficultyTone">{{ currentDifficultyLabel }}</span>
            </p>
            <button
              class="ghost difficulty-open-btn"
              :class="currentDifficultyTone"
              type="button"
              @click="showDifficultyModal = true"
            >
              选择难度
            </button>
          </div>
          <div class="chain-quick">
            <button class="ghost chain-open-btn" type="button" @click="toggleChainMode">
              {{ state.chainMode ? "关闭连战模式" : "开启连战模式" }}
            </button>
            <div v-if="state.chainMode">
              <div class="enemy-index-text">每击败 1 个敌人，下一名敌人额外获得：</div>
              <div class="enemy-index-text">- 生命/攻击/防御倍率：首次 +5%，后续每次 +5%，上限 +15%</div>
              <div class="enemy-index-text">- 每回合回复：+1</div>
              <div class="enemy-index-text">- 暴击伤害倍率：+10%</div>
            </div>
            <p v-if="state.chainMode" class="enemy-index-text">当前第 {{ state.enemyIndex }} 个敌人</p>
          </div>
          <div class="side-log-panel">
            <p class="side-log-title">祝福/设置日志（最多10条）</p>
            <ul class="side-log-list">
              <li v-for="item in state.sideLog" :key="item.id">{{ item.text }}</li>
              <li v-if="!state.sideLog.length">暂无记录</li>
            </ul>
          </div>
        </div>
      </aside>

      <div class="battle-main">
        <section class="arena">
          <UnitCard
            title="玩家"
            :unit="state.player"
            theme="player"
            :active="state.activeTurn === 'player'"
            :hit-token="state.effects.playerHitToken"
            :status-token="state.effects.playerStatusToken"
            :float-token="state.effects.playerFloatToken"
            :float-text="state.effects.playerFloatText"
            :float-config="state.effects.playerFloatConfig"
            :strengths="strengths"
          />
          <div class="center-panel">
            <div class="round">
              <p>第 {{ state.round }} 回合</p>
              <span v-if="state.over" class="result">
                {{ state.winner === "平局" ? "平局" : `${state.winner}获胜` }}
              </span>
              <span v-else-if="state.draft.prePending" class="result">
                等待战前构筑确认
              </span>
              <span v-else-if="state.draft.midPending" class="result">
                等待祝福三选一
              </span>
              <span v-else class="result">
                {{ state.busy ? "行动结算中..." : "等待玩家选择招式" }}
              </span>
            </div>
            <div class="tips">
              <div>
                <strong>速度决定先手</strong>
                <p>
                  {{ state.player?.speed?.toFixed(1) || 0 }} vs
                  {{ state.enemy?.speed?.toFixed(1) || 0 }}
                </p>
              </div>
              <div>
                <strong>暴击率</strong>
                <p>
                  {{ ((state.player?.criticalRate ?? 0) * 100).toFixed(0) }}% /
                  {{ ((state.enemy?.criticalRate ?? 0) * 100).toFixed(0) }}%
                </p>
              </div>
              <div>
                <strong>闪避率</strong>
                <p>
                  {{ ((state.player?.missRate ?? 0) * 100).toFixed(0) }}% /
                  {{ ((state.enemy?.missRate ?? 0) * 100).toFixed(0) }}%
                </p>
              </div>
            </div>
            <div class="notice">
              <p>
                命中、暴击与状态持续回合都会影响下一次行动，请留意日志。
              </p>
            </div>
          </div>
          <UnitCard
            title="对手"
            :unit="state.enemy"
            theme="enemy"
            :active="state.activeTurn === 'enemy'"
            :hit-token="state.effects.enemyHitToken"
            :status-token="state.effects.enemyStatusToken"
            :float-token="state.effects.enemyFloatToken"
            :float-text="state.effects.enemyFloatText"
            :float-config="state.effects.enemyFloatConfig"
            :strengths="strengths"
          />
        </section>

        <section class="skills">
          <header>
            <h3>选择招式</h3>
            <p>可从技能池中手动选择 4 个作为出招栏。</p>
          </header>
          <div class="skill-bar">
            <div class="skill-list compact">
              <SkillCard
                v-for="skill in visibleSkills"
                :key="skill.id"
                :skill="skill"
                :disabled="state.over || state.busy || state.draft.prePending || state.draft.midPending"
                @click="chooseSkill(skill.id)"
              />
            </div>
            <div class="slot-actions">
              <button class="ghost" type="button" @click="toggleSkillPool">
                {{ showSkillPool ? "收起技能池" : "手动选择招式" }}
              </button>
              <button class="ghost" type="button" @click="clearSkillSlots">
                清空手动出招栏
              </button>
              <p class="page-indicator">
                手动已选择 {{ selectedSkillIds.length }} / 4
              </p>
            </div>
          </div>
          <div v-if="showSkillPool" class="skill-pool">
            <button
              v-for="skill in playerSkills"
              :key="skill.id"
              class="pool-item"
              :class="{ selected: isSkillSelected(skill.id) }"
              type="button"
              @click="toggleSkillSlot(skill.id)"
            >
              <span>{{ skill.name }}</span>
              <small>伤害 {{ skill.power ?? 0 }}</small>
              <div class="pool-tooltip">
                <p><strong>{{ skill.name }}</strong></p>
                <p>效果：{{ skill.des || "无" }}</p>
                <p>命中：{{ (skill.accuracy * 100).toFixed(0) }}%</p>
                <p>暴击：{{ (skill.criticalRate * 100).toFixed(0) }}%</p>
                <p v-if="skill.suckBloodRate">
                  吸血：{{ (skill.suckBloodRate * 100).toFixed(0) }}%
                </p>
                <p v-if="skill.putStatus?.length">
                  附加状态：{{ skill.putStatus.map((s) => s.name).join("，") }}
                </p>
                <p v-if="skill.changeValue?.length">
                  属性变化：{{ skill.changeValue.map((c) => c.name).join("，") }}
                </p>
              </div>
            </button>
          </div>
          <button
            v-if="state.player?.stopRound > 0 && !state.over"
            class="ghost skip"
            type="button"
            :disabled="state.busy || state.draft.prePending || state.draft.midPending"
            @click="skipRound"
          >
            跳过回合
          </button>
          <p v-if="state.player?.stopRound > 0" class="hint">
            玩家当前被停止行动，回合结束后自动恢复。
          </p>
          <p v-if="state.over" class="hint">战斗结束，确认结算弹窗后可退出或重开。</p>
        </section>

        <BattleLog :entries="state.log">
          <template #actions>
            <button class="ghost reset-enemy-btn" type="button" @click="handleEndGameAndRestart">
              <el-icon><Refresh /></el-icon>
              <span>结束游戏并重新开始</span>
            </button>
            <button class="ghost reset-enemy-btn exit-game-btn" type="button" @click="handleEndGameAndExit">
              结束游戏并退出
            </button>
          </template>
        </BattleLog>
      </div>

      <aside class="battle-side battle-side-right" aria-hidden="true">
        <div class="side-placeholder">
          <p class="side-title">祝福三选一触发条件</p>
          <p class="side-sub">当前品质权重</p>
          <div class="quality-weight-focus">
            <div
              v-for="item in midDraftQualityWeightsDisplay"
              :key="`weight-${item.key}`"
              class="quality-weight-chip"
            >
              <span class="quality-weight-key">{{ item.key }}</span>
              <span class="quality-weight-value">{{ item.value }}</span>
            </div>
          </div>
          <ul class="build-list build-list-conditions">
            <li v-for="item in midDraftTriggerConditions" :key="item">{{ item }}</li>
          </ul>
          <p class="side-title">当前构筑</p>
          <p class="side-sub build-section-sub">祝福（{{ state.blessings.length }}）</p>
          <button
            v-if="state.blessings.length"
            class="ghost build-more-btn"
            type="button"
            @click="openBlessingsModal"
          >
            查看全部祝福
          </button>
          <ul class="build-list build-list-build blessing-scroll-list">
            <li v-for="item in state.blessings" :key="`blessing-${item.id}`">
              <p class="build-name">
                <span class="build-name-text">{{ item.name }}</span>
                <small class="build-stack-badge">层数 {{ getBuildBlessingStackText(item) }}</small>
              </p>
              <p class="build-effect">{{ item.desc || "无效果描述" }}</p>
            </li>
            <li v-if="!state.blessings.length">暂无</li>
          </ul>
          <p class="side-sub build-section-sub">装备（{{ state.equipments.length }}/2）</p>
          <ul class="build-list build-list-build">
            <li v-for="item in state.equipments" :key="item.id">
              <p class="build-name">
                <span class="build-name-text">{{ item.name }}</span>
              </p>
              <p class="build-effect">{{ getEquipmentEffectText(item) }}</p>
            </li>
            <li v-if="!state.equipments.length">暂无</li>
          </ul>
        </div>
      </aside>
    </section>

    <div
      v-if="state.draft.prePending"
      class="modal-backdrop"
    >
      <div class="modal draft-modal">
        <div class="modal-header">
          <h4>战前构筑（6选）</h4>
        </div>
        <div class="modal-body">
          <p>总点数 {{ state.pointsTotal }}，已用 {{ displayPointsUsed }}，剩余 {{ displayPointsRemaining }}</p>
          <div class="draft-cards">
            <button
              v-for="item in state.draft.preCandidates"
              :key="item.draftId"
              class="draft-card"
              :class="[getQualityClass(item.quality), { active: isPreDraftSelected(item.draftId) }]"
              type="button"
              @click="toggleDraftCandidate(item.draftId)"
            >
              <p class="draft-type">{{ item.type === "blessing" ? "祝福" : "装备" }}</p>
              <h4>{{ item.payload.name }}</h4>
              <p class="draft-desc">{{ getDraftEffectText(item) }}</p>
              <p class="draft-meta">
                品质 {{ item.quality }} · 消耗 {{ item.cost }}
                <span v-if="item.type === 'blessing'">
                  · 层数 {{ getBlessingStackText(item.payload) }}
                </span>
              </p>
            </button>
          </div>
          <div class="draft-actions">
            <p>当前勾选总消耗：{{ preDraftSelectedCost }}</p>
            <div class="action-row">
              <button class="ghost" type="button" @click="handleRefreshPreDraft">
                刷新候选（消耗1点）
              </button>
              <button class="primary" type="button" @click="handleConfirmPreDraft">
                确认构筑并开战
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <div
        v-if="state.draft.midPending"
        class="modal-backdrop"
      >
      <div class="modal draft-modal">
        <div class="modal-header">
          <h4>祝福三选一</h4>
        </div>
        <div class="modal-body">
          <p>请选择一个选项立即生效（含固定回血）。</p>
          <p>当前品质权重：{{ midDraftQualityWeightText }}</p>
          <div class="draft-cards">
            <button
              v-for="item in state.draft.midCandidates"
              :key="item.id"
              class="draft-card"
              :class="getQualityClass(item.quality)"
              type="button"
              @click="handlePickMidDraftBlessing(item.id)"
            >
              <p class="draft-type">{{ item.type === "heal" ? "恢复" : "祝福" }}</p>
              <h4>{{ item.name }}</h4>
              <p class="draft-desc">{{ item.desc }}</p>
              <p v-if="item.type === 'blessing'" class="draft-meta">
                品质 {{ item.quality }} · 价值 {{ item.cost }} · 层数 {{ getBlessingStackText(item) }}
              </p>
              <p v-else class="draft-meta">
                固定选项 · 立即恢复 {{ item.healAmount }} 生命
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showBlessingsModal"
      class="modal-backdrop"
      @click.self="closeBlessingsModal"
    >
      <div class="modal blessing-modal">
        <div class="modal-header">
          <h4>全部祝福预览</h4>
          <button class="ghost" type="button" @click="closeBlessingsModal">
            关闭
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">当前已拥有 {{ state.blessings.length }} 个祝福。</p>
          <ul class="build-list build-list-build blessing-modal-list">
            <li v-for="item in state.blessings" :key="`blessing-modal-${item.id}`">
              <p class="build-name">
                <span class="build-name-text">{{ item.name }}</span>
                <small class="build-stack-badge">层数 {{ getBuildBlessingStackText(item) }}</small>
              </p>
              <p class="build-effect">{{ item.desc || "无效果描述" }}</p>
            </li>
            <li v-if="!state.blessings.length">暂无祝福</li>
          </ul>
        </div>
      </div>
    </div>

    <div
      v-if="showPointModal"
      class="modal-backdrop"
      @click.self="closePointModal"
    >
      <div class="modal point-modal">
        <div class="modal-header">
          <h4>全局加点</h4>
          <button class="ghost" type="button" @click="closePointModal">
            关闭
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">
            剩余点数 {{ globalPointSummary.remainingPoints }} / 已获得点数 {{ globalPointSummary.totalPoints }}
          </p>
          <div class="point-unit-tabs">
            <button
              v-for="unit in availableUnits"
              :key="`point-unit-${unit.id}`"
              type="button"
              class="point-unit-tab"
              :class="{ active: activePointUnitId === unit.id }"
              @click="switchPointUnit(unit.id)"
            >
              {{ unit.name }}
            </button>
          </div>
          <div v-if="activePointUnit" class="point-unit-panel">
            <div class="point-unit-head">
              <h5>{{ activePointUnit.name }} 加点详情</h5>
              <button
                class="ghost point-reset-btn"
                type="button"
                @click="handleResetPointUnit(activePointUnit.id)"
              >
                重置该角色
              </button>
            </div>
            <div class="point-row-list">
              <div
                v-for="row in activePointRows"
                :key="`point-row-${activePointUnit.id}-${row.attrKey}`"
                class="point-row"
              >
                <p class="point-row-main">
                  {{ row.label }}：{{ formatPointValue(row.baseValue, row.displayAsPercent) }}+{{
                    formatPointValue(row.bonusValue, row.displayAsPercent)
                  }}
                </p>
                <p class="point-row-meta">点数：{{ row.pointCount }}/{{ row.maxPoints }}</p>
                <div class="point-row-actions">
                  <button
                    class="ghost point-add-btn"
                    type="button"
                    :disabled="row.pointCount <= 0"
                    @click="handleDeallocatePoint(activePointUnit.id, row.attrKey)"
                  >
                    -1
                  </button>
                  <button
                    class="ghost point-add-btn"
                    type="button"
                    :disabled="globalPointSummary.remainingPoints <= 0 || row.pointCount >= row.maxPoints"
                    @click="handleAllocatePoint(activePointUnit.id, row.attrKey)"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showGameOverModal"
      class="modal-backdrop"
    >
      <div class="modal game-over-modal">
        <div class="modal-header">
          <h4>游戏结束</h4>
        </div>
        <div class="modal-body">
          <p>结束原因：{{ gameOverDialog.reasonText }}</p>
          <p>本局获取点数：{{ gameOverDialog.pointGain }}</p>
          <p>当前总点数：{{ globalPointSummary.totalPoints }} / 300</p>
          <button class="primary" type="button" @click="confirmGameOverDialog">
            {{ gameOverDialog.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showFormulaModal"
      class="modal-backdrop"
      @click.self="closeFormulaModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h4>{{ activeSidebarTab.title }}</h4>
          <button class="ghost" type="button" @click="closeFormulaModal">
            关闭
          </button>
        </div>
        <div class="modal-body">
          <p class="formula">
            伤害 = [随机(技能威力) + 随机(攻击侧数值)] × 比例减伤
            其中 比例减伤 = K / (K + max(0, 随机(防御侧数值)))，K = 50
          </p>
          <p class="formula">
            结算顺序：max(0, 伤害) → 随机(伤害) → 随机(状态倍率) → 暴击倍率
            （若暴击则再乘 随机(暴击伤害倍率)）
          </p>
          <p class="formula">
            命中判定：若 rand ≤ 闪避率 或 rand ≥ 技能命中率，则本次伤害 = 0
          </p>
          <p class="formula note">
            说明：吸血 = 最终伤害 × 吸血比例（不超过最大生命）；祝福会在伤害前后钩子中参与改写。
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="showDifficultyModal"
      class="modal-backdrop"
      @click.self="closeDifficultyModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h4>敌人难度设置</h4>
          <button class="ghost" type="button" @click="closeDifficultyModal">
            关闭
          </button>
        </div>
        <div class="modal-body">
          <div class="difficulty-panel">
            <div class="difficulty-options">
              <label
                v-for="option in difficultyOptions"
                :key="option.key"
                class="difficulty-option"
              >
                <input
                  type="radio"
                  name="enemy-difficulty"
                  :value="option.key"
                  :checked="state.difficulty === option.key"
                  @change="handleDifficultyChange(option.key)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p class="difficulty-current">
              当前难度：
              <span class="difficulty-badge" :class="currentDifficultyTone">{{ currentDifficultyLabel }}</span>
            </p>
            <div class="difficulty-desc-list">
              <p
                v-for="option in difficultyOptions"
                :key="`desc-${option.key}`"
                class="difficulty-desc"
                :class="{ active: state.difficulty === option.key }"
              >
                {{ difficultyDescriptions[option.key] }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showUnitModal"
      class="modal-backdrop"
      @click.self="closeUnitModal"
    >
      <div class="modal unit-modal">
        <div class="modal-header">
          <h4>选择角色</h4>
          <button class="ghost" type="button" @click="closeUnitModal">
            关闭
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">点击角色即可选择并关闭弹窗。</p>
          <div class="unit-modal-grid">
            <button
              v-for="unit in availableUnits"
              :key="unit.id"
              class="select-card modal-card"
              :class="{ active: selectedUnitId === unit.id }"
              type="button"
              @click="handleSelectUnit(unit.id)"
            >
              <h4>{{ unit.name }}</h4>
              <p class="des">{{ unit.des }}</p>
              <div class="stats">
                <span>攻击 {{ unit.attack }}</span>
                <span>防御 {{ unit.defence }}</span>
                <span>速度 {{ unit.speed }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.app {
  --center-column-width: 1180px;
  max-width: 100vw;
  margin: 0 auto;
  padding: 36px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.select-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, var(--center-column-width)) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.select-main {
  min-width: 0;
}

.select-bottom-center {
  margin-top: 18px;
  width: 100%;
}

.select-bottom-center :deep(.custom-module) {
  width: 100%;
}

.select-side {
  min-height: 100%;
}

.select-side-left,
.select-side-right {
  position: sticky;
  top: 20px;
}

.hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border-radius: 28px;
  background: rgba(9, 12, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 60px rgba(8, 10, 18, 0.5);
}

.kicker {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 6px;
}

h1 {
  margin: 0;
  font-size: 36px;
  letter-spacing: 0.02em;
}

.subtitle {
  margin: 8px 0 0;
  max-width: 540px;
  font-size: 15px;
  color: var(--text-muted);
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.ghost,
.primary {
  padding: 5px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.ghost:hover,
.primary:hover {
  opacity: 0.5;
  transition: all 0.3s;
}

.primary {
  background: linear-gradient(135deg, #4ad7bf, #7e6bff);
  border: none;
  color: #0b0f17;
  font-weight: 600;
}

.battle-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, var(--center-column-width)) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.battle-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.battle-side {
  min-height: 100%;
}

.battle-side-left,
.battle-side-right {
  position: sticky;
  top: 20px;
}

.arena {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(240px, 2fr) minmax(0, 3fr);
  gap: 16px;
}

.battle-sidebar {
  border-radius: 18px;
  padding: 14px;
  background: rgba(10, 14, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.side-placeholder {
  min-height: 100%;
  border-radius: 18px;
  padding: 18px 14px;
  background: rgba(10, 14, 22, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.side-placeholder p {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.58);
  line-height: 1.6;
}

.side-title {
  font-size: 14px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 700;
}

.side-sub {
  margin-top: 10px !important;
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.75) !important;
}

.quality-weight-focus {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.quality-weight-chip {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.quality-weight-key {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.66);
}

.quality-weight-value {
  font-size: 18px;
  line-height: 1;
  font-weight: 800;
  color: #f5f7ff;
}

.build-list {
  margin: 6px 0 0;
  padding-left: 16px;
  display: grid;
  gap: 4px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.build-list small {
  color: rgba(255, 255, 255, 0.56);
}

.build-name {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 800;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.build-effect {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.64);
}

.build-list-build {
  margin-top: 8px;
  padding-left: 0;
  list-style: none;
  gap: 8px;
}

.build-list-build li {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 10px;
}

.blessing-scroll-list {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.build-section-sub {
  margin-top: 12px !important;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88) !important;
}

.build-more-btn {
  margin-top: 6px;
  align-self: flex-start;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  border-color: rgba(74, 215, 191, 0.45);
  background: rgba(74, 215, 191, 0.12);
}

.build-name-text {
  color: #f7fbff;
}

.build-stack-badge {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(74, 215, 191, 0.45);
  background: rgba(74, 215, 191, 0.12);
  color: #bdf5e9;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.difficulty-quick {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chain-quick {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.build-list-conditions {
  margin-top: 8px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.side-log-panel {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.side-log-title {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.side-log-list {
  margin: 8px 0 0;
  padding-left: 16px;
  max-height: 220px;
  overflow: auto;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.side-log-list li {
  line-height: 1.45;
}

.sidebar-tab {
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
  color: inherit;
  cursor: pointer;
  transition: border 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.sidebar-tab.active {
  border-color: rgba(74, 215, 191, 0.8);
  background: rgba(74, 215, 191, 0.12);
  transform: translateY(-1px);
}

.random-rate-btn {
  font-weight: 700;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.modal {
  width: min(720px, 92vw);
  border-radius: 20px;
  background: rgba(12, 16, 26, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 28px 60px rgba(6, 10, 18, 0.6);
  padding: 18px 20px 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
}

.modal-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.6;
}

.unit-modal {
  width: min(960px, 96vw);
}

.blessing-modal {
  width: min(860px, 96vw);
}

.blessing-modal-list {
  max-height: min(64vh, 560px);
  overflow-y: auto;
  padding-right: 4px;
}

.point-modal {
  width: min(900px, 96vw);
}

.game-over-modal {
  width: min(620px, 92vw);
}

.point-unit-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.point-unit-tab {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 6px 10px;
  cursor: pointer;
}

.point-unit-tab.active {
  border-color: rgba(74, 215, 191, 0.7);
  background: rgba(74, 215, 191, 0.16);
}

.point-unit-panel h5 {
  margin: 4px 0 0;
  font-size: 16px;
}

.point-unit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.point-reset-btn {
  font-size: 12px;
  border-radius: 10px;
}

.point-row-list {
  margin-top: 6px;
  display: grid;
  gap: 8px;
}

.point-row {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "main action"
    "meta action";
  column-gap: 8px;
  align-items: center;
}

.point-row-main {
  grid-area: main;
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.point-row-meta {
  grid-area: meta;
  margin: 2px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.point-add-btn {
  min-width: 52px;
}

.point-row-actions {
  grid-area: action;
  display: flex;
  gap: 6px;
}

.modal-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.unit-modal-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.formula {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.formula.note {
  color: rgba(255, 255, 255, 0.6);
}

.difficulty-panel {
  margin-top: 8px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.difficulty-panel h5 {
  margin: 0 0 10px;
  font-size: 15px;
}

.difficulty-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.difficulty-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.difficulty-option input {
  accent-color: #4ad7bf;
}

.difficulty-current {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  gap: 8px;
}

.difficulty-open-btn {
  align-self: flex-start;
  margin-top: 2px;
  padding: 9px 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #101522;
  background: linear-gradient(135deg, #a1f7ff, #4ad7bf);
  box-shadow: 0 8px 18px rgba(70, 220, 205, 0.35);
  animation: difficultyBreath 1.8s ease-in-out infinite;
}

.difficulty-open-btn:hover {
  transform: translateY(-1px);
  opacity: 1;
  animation-play-state: paused;
}

@keyframes difficultyBreath {
  0% {
    transform: scale(1);
    box-shadow: 0 8px 18px rgba(70, 220, 205, 0.35);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 12px 24px rgba(70, 220, 205, 0.48);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 8px 18px rgba(70, 220, 205, 0.35);
  }
}

.difficulty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.tone-normal {
  color: #d8f3ff;
  border-color: rgba(142, 226, 255, 0.6);
  background: rgba(96, 190, 230, 0.22);
}

.tone-hard {
  color: #ffe8bf;
  border-color: rgba(255, 199, 106, 0.62);
  background: rgba(229, 158, 54, 0.24);
}

.tone-extreme {
  color: #ffd6be;
  border-color: rgba(255, 154, 97, 0.66);
  background: rgba(230, 112, 55, 0.25);
}

.tone-expert {
  color: #ffd7f6;
  border-color: rgba(255, 127, 215, 0.68);
  background: rgba(199, 70, 166, 0.28);
}

.tone-inferno {
  color: #ffd5d0;
  border-color: rgba(255, 93, 93, 0.72);
  background: rgba(200, 35, 52, 0.3);
}

.difficulty-open-btn.tone-normal {
  color: #0e1a25;
  background: linear-gradient(135deg, #b4f2ff, #6fd5ff);
  box-shadow: 0 8px 18px rgba(72, 182, 238, 0.35);
}

.difficulty-open-btn.tone-hard {
  color: #231300;
  background: linear-gradient(135deg, #ffd89f, #ffb24d);
  box-shadow: 0 8px 18px rgba(255, 165, 56, 0.36);
}

.difficulty-open-btn.tone-extreme {
  color: #2a0f00;
  background: linear-gradient(135deg, #ffc49d, #ff7e4a);
  box-shadow: 0 8px 18px rgba(247, 108, 60, 0.4);
}

.difficulty-open-btn.tone-expert {
  color: #2b0c22;
  background: linear-gradient(135deg, #ffb3ef, #e86dc8);
  box-shadow: 0 8px 18px rgba(214, 81, 178, 0.4);
}

.difficulty-open-btn.tone-inferno {
  color: #2b0606;
  background: linear-gradient(135deg, #ff9e8f, #ff4343);
  box-shadow: 0 8px 18px rgba(232, 64, 64, 0.42);
}

.chain-open-btn {
  border-radius: 10px;
  font-weight: 700;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
}

.difficulty-desc-list {
  display: grid;
  gap: 6px;
}

.difficulty-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.58);
}

.difficulty-desc.active {
  color: rgba(74, 215, 191, 0.95);
}

.select {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
  gap: 18px;
}

.select-panel,
.select-preview,
.select-point {
  border-radius: 24px;
  padding: 24px;
  background: rgba(8, 12, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.select-head h3,
.select-preview h3,
.select-point h3 {
  margin: 0 0 6px;
  font-size: 20px;
}

.select-head p {
  margin: 0;
  color: var(--text-muted);
}

.select-controls {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.select-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.select-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.select-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
  color: inherit;
}

.select-card h4 {
  margin: 0 0 6px;
  font-size: 18px;
}

.select-card .des {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  min-height: 38px;
}

.select-card .stats {
  margin-top: 10px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.select-card.active {
  border-color: rgba(126, 107, 255, 0.8);
  box-shadow: 0 12px 24px rgba(52, 48, 110, 0.35);
  transform: translateY(-3px);
}

.select-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.select-preview .start {
  align-self: flex-start;
}

.select-point {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.point-panel {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.point-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.point-line {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.point-overview-list {
  margin: 4px 0 0;
  padding-left: 16px;
  max-height: 340px;
  overflow: auto;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.point-open-btn {
  align-self: flex-start;
  margin-top: 6px;
}

.center-panel {
  border-radius: 24px;
  padding: 20px;
  background: rgba(14, 18, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: space-between;
}

.round {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.round p {
  margin: 0;
  font-size: 18px;
}

.result {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.tips {
  display: grid;
  gap: 12px;
}

.tips strong {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.tips p {
  margin: 4px 0 0;
  font-size: 16px;
}

.notice {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.notice p {
  margin: 0;
}

.skills {
  border-radius: 26px;
  padding: 24px;
  background: rgba(7, 10, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 55px rgba(7, 9, 16, 0.5);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.draft-panel {
  border-radius: 20px;
  padding: 16px;
  background: rgba(10, 14, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mid-draft {
  border-color: rgba(255, 198, 96, 0.4);
}

.draft-modal {
  width: min(980px, 96vw);
}

.draft-head h3 {
  margin: 0;
  font-size: 18px;
}

.draft-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.68);
}

.draft-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.draft-card {
  border-radius: 14px;
  border: 2px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.draft-card.active {
  border-color: #00ffd0;
  box-shadow: 0 0 0 2px rgba(0, 255, 208, 0.45);
  transform: translateY(-1px);
}

.draft-type {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.58);
}

.draft-card h4 {
  margin: 0;
  font-size: 15px;
}

.draft-desc {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  min-height: 36px;
}

.draft-meta {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.draft-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quality-a {
  background: linear-gradient(180deg, rgba(255, 215, 128, 0.3), rgba(255, 215, 128, 0.1));
}

.quality-b {
  background: linear-gradient(180deg, rgba(143, 214, 255, 0.26), rgba(143, 214, 255, 0.1));
}

.quality-c {
  background: linear-gradient(180deg, rgba(220, 220, 220, 0.2), rgba(220, 220, 220, 0.08));
}

.quality-s {
  background: linear-gradient(180deg, rgba(122, 255, 196, 0.28), rgba(122, 255, 196, 0.1));
  border-color: rgba(122, 255, 196, 0.55);
}

.skills header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
}

.skills h3 {
  margin: 0;
  font-size: 20px;
}

.skills header p {
  margin: 6px 0 0;
  color: var(--text-muted);
}

.skill-bar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.skill-list.compact {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.slot-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.page-indicator {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.skill-pool {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.pool-item {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 12px;
  color: inherit;
  cursor: pointer;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  transition: border 0.2s ease, transform 0.2s ease;
  position: relative;
}

.pool-item span {
  font-size: 13px;
}

.pool-item small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.pool-item.selected {
  border-color: rgba(126, 107, 255, 0.8);
  transform: translateY(-2px);
}

.pool-tooltip {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, -8px);
  background: rgba(12, 16, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 6;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.pool-item:hover .pool-tooltip {
  opacity: 1;
  transform: translate(-50%, -16px);
}

.pool-tooltip p {
  margin: 4px 0;
}

.skip {
  align-self: flex-start;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.enemy-index-text {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.reset-enemy-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 14px;
  color: #1c0f00;
  border: none;
  background: linear-gradient(135deg, #ffd26a, #ff8f4a);
  box-shadow: 0 10px 24px rgba(255, 146, 76, 0.45);
}

.reset-enemy-btn .el-icon {
  font-size: 16px;
}

.reset-enemy-btn:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.exit-game-btn {
  color: #fff4f2;
  background: linear-gradient(135deg, #ff9e8f, #ff4343);
  box-shadow: 0 10px 24px rgba(232, 64, 64, 0.42);
}

@media (max-width: 1360px) {
  .select-layout {
    grid-template-columns: minmax(0, var(--center-column-width)) minmax(320px, 1fr);
  }

  .select-side-left {
    display: none;
  }
}

@media (max-width: 1024px) {
  .select-layout {
    grid-template-columns: 1fr;
  }

  .select-side-left {
    display: block;
  }

  .select-side-left,
  .select-side-right {
    position: static;
  }

  .battle-layout {
    grid-template-columns: 1fr;
  }

  .battle-main {
    order: 2;
  }

  .battle-side-left,
  .battle-side-right {
    position: static;
  }

  .battle-side-right {
    display: none;
  }

  .arena {
    grid-template-columns: 1fr;
  }

  .center-panel {
    order: 2;
  }

  .select {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .skill-bar {
    grid-template-columns: 1fr;
  }

  .skill-list.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
