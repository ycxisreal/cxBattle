<script setup>
import { computed, ref, watchEffect } from "vue";
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
  pointsRemaining,
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
} = useBattle();

const selectedUnitId = ref(null);
const maxUnitDisplay = 6;
const unitPage = ref(0);
const showUnitModal = ref(false);
const skillPage = ref(0);
const selectedSkillIds = ref([]);
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
const difficultyDescriptions = {
  normal: "普通：敌人使用默认数值，不额外强化。",
  hard: "困难：生命、攻击提升至 1.2 倍，防御提升至 1.05 倍。",
  extreme:
    "极难：生命和攻击 1.5 倍，防御 1.05 倍，每回合额外回复 3 点生命，闪避率和暴击率各 +5%。",
  expert:
    "专家：生命和攻击 1.7 倍，防御 1.15 倍，每回合额外回复 7 点生命，闪避率和暴击率各 +8%，并随机增加 1 个未拥有被动特长。",
  inferno:
    "炼狱：生命和攻击 2.0 倍，防御 1.15 倍，每回合额外回复 12 点生命，闪避率和暴击率各 +10%，并随机增加 1 个未拥有被动特长。",
};

// 当前难度文本与样式标记。
const currentDifficultyLabel = computed(
  () => difficultyOptions.find((item) => item.key === state.difficulty)?.label || "普通"
);
const currentDifficultyTone = computed(() => `tone-${state.difficulty}`);

const selectedUnit = computed(() =>
  availableUnits.value.find((unit) => unit.id === selectedUnitId.value)
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
  skillPage.value = 0;
  selectedSkillIds.value = [];
  showSkillPool.value = false;
};

const skipRound = () => {
  chooseSkill(null);
};

const handleResetBattle = () => {
  resetBattle();
  skillPage.value = 0;
  showSkillPool.value = false;
};

const handleBackToSelect = () => {
  backToSelect();
  selectedUnitId.value = state.selectedPlayerId;
};

const visibleSkills = computed(() => {
  const selected = selectedSkillIds.value
    .map((id) => playerSkills.value.find((skill) => skill.id === id))
    .filter(Boolean);
  if (selected.length) return selected;
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
const handlePickMidDraftBlessing = (blessingId) => chooseMidDraftBlessing(blessingId);
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

const preDraftSelectedCost = computed(() =>
  state.draft.preCandidates
    .filter((item) => state.draft.selectedPreIds.includes(item.draftId))
    .reduce((sum, item) => sum + Number(item.cost || 0), 0)
);

// 展示战中祝福三选一触发条件与当前生效状态。
const midDraftTriggerConditions = computed(() => {
  const conditions = [
    `每 ${state.draft.midDraftRoundInterval} 回合触发一次`,
    state.chainMode ? "连战中：每击败 1 个敌人触发一次" : "连战中：每击败 1 个敌人触发一次（当前未开启）",
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
</script>

<template>
  <div class="app">
    <div v-if="state.phase === 'select'" class="select-layout">
      <header class="hero">
        <div>
          <p class="kicker">Turn-based Combo Game</p>
          <h1>cxBattle</h1>
          <p class="subtitle">
          </p>
        </div>
        <div class="hero-actions">
          <button class="primary" type="button" @click="toggleRandomize">
            {{ state.randomize ? "关闭属性浮动" : "开启属性浮动" }}
          </button>
        </div>
      </header>

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

      <CustomDataPanel />
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
            :hit="state.effects.playerHit"
            :status="state.effects.playerStatus"
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
            :hit="state.effects.enemyHit"
            :status="state.effects.enemyStatus"
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
          <p v-if="state.over" class="hint">战斗结束，可点击重置再次战斗。</p>
        </section>

        <BattleLog :entries="state.log">
          <template #actions>
            <button class="ghost reset-enemy-btn" type="button" @click="handleResetBattle">
              <el-icon><Refresh /></el-icon>
              <span>刷新敌人</span>
            </button>
            <button class="ghost" type="button" @click="toggleRandomize">
              {{ state.randomize ? "关闭属性浮动" : "开启属性浮动" }}
            </button>
            <button class="ghost" type="button" @click="handleBackToSelect">
              返回选人
            </button>
          </template>
        </BattleLog>
      </div>

      <aside class="battle-side battle-side-right" aria-hidden="true">
        <div class="side-placeholder">
          <p class="side-title">祝福三选一触发条件</p>
          <p class="side-sub">当前品质权重：{{ midDraftQualityWeightText }}</p>
          <ul class="build-list build-list-conditions">
            <li v-for="item in midDraftTriggerConditions" :key="item">{{ item }}</li>
          </ul>
          <p class="side-title">当前构筑</p>
          <p class="side-sub">祝福（{{ state.blessings.length }}）</p>
          <ul class="build-list">
            <li v-for="item in state.blessings" :key="`blessing-${item.id}`">
              <p class="build-name">
                {{ item.name }} <small>层数 {{ getBuildBlessingStackText(item) }}</small>
              </p>
              <p class="build-effect">{{ item.desc || "无效果描述" }}</p>
            </li>
            <li v-if="!state.blessings.length">暂无</li>
          </ul>
          <p class="side-sub">装备（{{ state.equipments.length }}/2）</p>
          <ul class="build-list">
            <li v-for="item in state.equipments" :key="item.id">
              <p class="build-name">{{ item.name }}</p>
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
          <p>总点数 {{ state.pointsTotal }}，已用 {{ state.pointsUsed }}，剩余 {{ pointsRemaining }}</p>
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
          <p>请选择一个祝福立即生效。</p>
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
              <p class="draft-type">祝福</p>
              <h4>{{ item.name }}</h4>
              <p class="draft-desc">{{ item.desc }}</p>
              <p class="draft-meta">
                品质 {{ item.quality }} · 价值 {{ item.cost }} · 层数 {{ getBlessingStackText(item) }}
              </p>
            </button>
          </div>
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
                  @change="setDifficulty(option.key)"
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
  width: min(100%, var(--center-column-width));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
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
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.build-effect {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.64);
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
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 18px;
}

.select-panel,
.select-preview {
  border-radius: 24px;
  padding: 24px;
  background: rgba(8, 12, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.select-head h3,
.select-preview h3 {
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

@media (max-width: 1024px) {
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
