<script setup>
import { computed, ref, watchEffect } from "vue";
import BattleLog from "./components/BattleLog.vue";
import SkillCard from "./components/SkillCard.vue";
import UnitCard from "./components/UnitCard.vue";
import { useBattle } from "./game/useBattle.js";
import { strengths } from "./game/data/strengths.js";

const {
  state,
  playerSkills,
  availableUnits,
  resetBattle,
  chooseSkill,
  toggleRandomize,
  startBattleWithSelection,
  backToSelect,
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
</script>

<template>
  <div class="app">
    <header v-if="state.phase === 'select'" class="hero">
      <div>
        <p class="kicker">Turn-based Combo Game</p>
        <h1>回合制出招 · 可视化战斗</h1>
        <p class="subtitle">
          在招式与状态之间找到节奏，速度决定先手，连招触发被动。
        </p>
      </div>
      <div class="hero-actions">
        <button class="primary" type="button" @click="toggleRandomize">
          {{ state.randomize ? "关闭属性浮动" : "开启属性浮动" }}
        </button>
      </div>
    </header>

    <section v-if="state.phase === 'select'" class="select">
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

    <aside v-if="state.phase === 'battle'" class="battle-sidebar">
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
    </aside>

    <section v-if="state.phase === 'battle'" class="arena">
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
            伤害 = clamp(0, 随机(技能威力) + 随机(攻击力 + 伤害加成) - 随机(防御力 + 护甲加成))
            × 随机(状态倍率) × (是否暴击 ? 随机(暴击伤害倍率) : 1)
          </p>
          <p class="formula">
            命中判定：若 rand ≤ 闪避率 或 rand ≥ 技能命中率，则 伤害 = 0
          </p>
          <p class="formula">
            吸血 = 伤害 × 吸血比例（不超过最大生命）
          </p>
          <p class="formula note">
            说明：随机(x) 表示在随机倍率区间内取值；状态倍率来自强/弱状态，默认 1。
          </p>
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

    <section v-if="state.phase === 'battle'" class="skills">
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
            :disabled="state.over || state.busy"
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
        :disabled="state.busy"
        @click="skipRound"
      >
        跳过回合
      </button>
      <p v-if="state.player?.stopRound > 0" class="hint">
        玩家当前被停止行动，回合结束后自动恢复。
      </p>
      <p v-if="state.over" class="hint">战斗结束，可点击重置再次战斗。</p>
    </section>

    <BattleLog v-if="state.phase === 'battle'" :entries="state.log">
      <template #actions>
        <button class="ghost" type="button" @click="handleResetBattle">
          重置战斗
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
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 24px 48px;
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
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.primary {
  background: linear-gradient(135deg, #4ad7bf, #7e6bff);
  border: none;
  color: #0b0f17;
  font-weight: 600;
}

.arena {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 280px) minmax(0, 1fr);
  gap: 16px;
}

.battle-sidebar {
  position: fixed;
  left: 16px;
  top: 120px;
  width: 220px;
  border-radius: 18px;
  padding: 12px;
  background: rgba(10, 14, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 12;
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

@media (max-width: 1024px) {
  .arena {
    grid-template-columns: 1fr;
  }

  .center-panel {
    order: 2;
  }

  .battle-sidebar {
    position: static;
    width: auto;
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
