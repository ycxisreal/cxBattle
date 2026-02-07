<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  unit: { type: Object, default: null },
  theme: { type: String, default: "player" },
  active: { type: Boolean, default: false },
  hit: { type: Boolean, default: false },
  status: { type: Boolean, default: false },
  strengths: { type: Array, default: () => [] },
});

const hpPercent = computed(() => {
  if (!props.unit) return 0;
  return Math.max(0, Math.min(100, (props.unit.hp / props.unit.hpCount) * 100));
});

const statusList = computed(() => {
  if (!props.unit) return [];
  const statuses = [];
  if (props.unit.strongStatus)
    statuses.push({
      label: `强化 ${props.unit.strongStatus.round}回合`,
      tone: "strong",
    });
  if (props.unit.weakStatus)
    statuses.push({
      label: `弱化 ${props.unit.weakStatus.round}回合`,
      tone: "weak",
    });
  if (props.unit.armorStatus)
    statuses.push({
      label: `护甲 ${props.unit.armorStatus.round}回合`,
      tone: "armor",
    });
  if (props.unit.damageStatus)
    statuses.push({
      label: `增伤 ${props.unit.damageStatus.round}回合`,
      tone: "damage",
    });
  if (props.unit.stopRound > 0)
    statuses.push({ label: `停止行动 ${props.unit.stopRound}回合`, tone: "stun" });
  return statuses;
});

const strengthInfo = computed(() => {
  if (!props.unit?.strength?.length) return [];
  return props.unit.strength
    .map((id) => props.strengths.find((s) => s.id === id))
    .filter(Boolean);
});

const showStrengthModal = ref(false);

const formatCondition = (condition) => {
  if (!condition) return "无触发条件";
  const parts = [];
  const sign = condition.type === "<" ? "小于" : "大于等于";
  const addSelf = (label, value) =>
    parts.push(`自身${label}${sign}${value}`);
  const addEnemy = (label, value) =>
    parts.push(`敌方${label}${sign}${value}`);
  if (condition.selfCondition) {
    const c = condition.selfCondition;
    if (c.health) addSelf("生命", c.health);
    if (c.healthRate) addSelf("生命比例", c.healthRate);
    if (c.attack) addSelf("攻击", c.attack);
    if (c.attackRate) addSelf("攻击比例", c.attackRate);
    if (c.defence) addSelf("防御", c.defence);
    if (c.defenceRate) addSelf("防御比例", c.defenceRate);
  }
  if (condition.enemyCondition) {
    const c = condition.enemyCondition;
    if (c.health) addEnemy("生命", c.health);
    if (c.healthRate) addEnemy("生命比例", c.healthRate);
    if (c.attack) addEnemy("攻击", c.attack);
    if (c.attackRate) addEnemy("攻击比例", c.attackRate);
    if (c.defence) addEnemy("防御", c.defence);
    if (c.defenceRate) addEnemy("防御比例", c.defenceRate);
  }
  if (typeof condition.round === "number")
    parts.push(`回合${sign}${condition.round}`);
  if (typeof condition.interval === "number")
    parts.push(`每${condition.interval}回合触发`);
  if (typeof condition.dice === "number")
    parts.push(`触发概率${Math.round(condition.dice * 100)}%`);
  return parts.length ? parts.join("，") : "无触发条件";
};
</script>

<template>
  <article class="unit-card" :class="[theme, { active, hit, status }]">
    <header>
      <p class="label">{{ title }}</p>
      <h2>{{ unit?.name || "--" }}</h2>
      <p class="sub">拥有者：{{ unit?.owner || "--" }}</p>
    </header>
    <div class="hp-row">
      <span>HP</span>
      <span>{{ unit?.hp?.toFixed(0) || 0 }} / {{ unit?.hpCount || 0 }}</span>
    </div>
    <div class="hp-track">
      <span :style="{ width: `${hpPercent}%` }"></span>
    </div>
    <div class="status-row">
      <span
        v-for="status in statusList"
        :key="status.label"
        class="status-chip"
        :class="status.tone"
      >
        {{ status.label }}
      </span>
      <span v-if="!statusList.length" class="status-chip empty">无状态</span>
    </div>
    <ul class="stats">
      <li><span>攻击</span><strong>{{ unit?.attack?.toFixed(1) || 0 }}</strong></li>
      <li><span>防御</span><strong>{{ unit?.defence?.toFixed(1) || 0 }}</strong></li>
      <li><span>速度</span><strong>{{ unit?.speed?.toFixed(1) || 0 }}</strong></li>
      <li>
        <span>暴击</span>
        <strong>{{ ((unit?.criticalRate ?? 0) * 100).toFixed(0) }}%</strong>
      </li>
      <li>
        <span>随机倍率</span>
        <strong>
          {{ unit?.randomRate?.low?.toFixed(2) || 0 }} ~
          {{ unit?.randomRate?.high?.toFixed(2) || 0 }}
        </strong>
        <button class="info-btn" type="button">?</button>
        <div class="info-tooltip">
          角色的各个属性值会在战斗开始按照随机倍率的范围随机改变。
        </div>
      </li>
    </ul>
    <div class="strengths">
      <button
        v-if="strengthInfo.length"
        class="strength-btn"
        type="button"
        @click="showStrengthModal = true"
      >
        被动特长
        <div class="strength-tooltip">

          <div v-for="st in strengthInfo" :key="st.id" class="strength-item">
            <strong>{{ st.name }}</strong>
            <p>{{ st.des || "暂无描述" }}</p>
          </div>
          <div style="font-size: 0.9em;color: aliceblue">点击按钮查看详情</div>
        </div>
      </button>
      <span v-else class="strength-empty">无被动特长</span>
    </div>
  </article>
  <div v-if="showStrengthModal" class="modal">
    <div class="modal-card">
      <header>
        <h4>被动特长详情</h4>
        <button class="ghost close" type="button" @click="showStrengthModal = false">
          关闭
        </button>
      </header>
      <div class="modal-body">
        <div v-for="st in strengthInfo" :key="st.id" class="modal-item">
          <h5>{{ st.name }}</h5>
          <p class="desc">{{ st.des || "暂无描述" }}</p>
          <p><strong>触发条件：</strong>{{ formatCondition(st.condition) }}</p>
          <p><strong>威力：</strong>{{ st.power ?? 0 }}</p>
          <p><strong>命中：</strong>{{ ((st.accuracy ?? 1) * 100).toFixed(0) }}%</p>
          <p v-if="st.status?.length">
            <strong>附加状态：</strong>{{ st.status.map((s) => s.name).join("，") }}
          </p>
          <p v-if="st.changeValue?.length">
            <strong>属性变化：</strong>{{ st.changeValue.map((c) => c.name).join("，") }}
          </p>
        </div>
      </div>
    </div>
    <button class="modal-backdrop" type="button" @click="showStrengthModal = false"></button>
  </div>
</template>

<style scoped>
.unit-card {
  padding: 22px;
  border-radius: 26px;
  background: rgba(14, 16, 24, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 22px 40px rgba(7, 10, 20, 0.45);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
}

.unit-card.enemy {
  background: rgba(18, 12, 18, 0.85);
}

.unit-card.active {
  border-color: rgba(110, 205, 255, 0.75);
  box-shadow: 0 0 0 1px rgba(110, 205, 255, 0.4),
    0 20px 40px rgba(56, 120, 255, 0.25);
  transform: translateY(-2px);
}

.unit-card.hit {
  animation: hitShake 0.35s ease;
}

.unit-card.status {
  animation: statusPulse 0.4s ease;
}

@keyframes hitShake {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-12px);
  }
  50% {
    transform: translateX(12px);
  }
  75% {
    transform: translateX(-6px);
  }
  100% {
    transform: translateX(0);
  }
}

@keyframes statusPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(126, 107, 255, 0.45);
  }
  100% {
    box-shadow: 0 0 0 16px rgba(126, 107, 255, 0);
  }
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

h2 {
  margin: 4px 0 0;
  font-size: 28px;
  letter-spacing: 0.01em;
}

.sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}

.hp-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.hp-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.hp-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #4ad7bf, #7e6bff);
  transition: width 0.3s ease;
}

.enemy .hp-track span {
  background: linear-gradient(90deg, #ff8b7b, #ff4f6f);
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
}

.status-chip.strong {
  background: rgba(94, 255, 163, 0.18);
  color: #7bffb7;
}

.status-chip.weak {
  background: rgba(255, 138, 138, 0.18);
  color: #ffb3a7;
}

.status-chip.armor {
  background: rgba(115, 196, 255, 0.2);
  color: #a7d8ff;
}

.status-chip.damage {
  background: rgba(255, 192, 115, 0.2);
  color: #ffd7a3;
}

.status-chip.stun {
  background: rgba(186, 140, 255, 0.2);
  color: #d3b4ff;
}

.status-chip.empty {
  opacity: 0.55;
}

.stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.stats li {
  position: relative;
}

.stats span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.stats strong {
  font-size: 16px;
  color: #f7f6ff;
}

.info-btn {
  margin-left: 6px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  line-height: 16px;
  padding: 0;
  cursor: pointer;
}

.info-tooltip {
  position: absolute;
  left: 0;
  top: 100%;
  transform: translateY(8px);
  background: rgba(12, 16, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 6;
}

.info-btn:hover + .info-tooltip,
.info-btn:focus + .info-tooltip {
  opacity: 1;
  transform: translateY(4px);
}

.strengths {
  margin-top: 6px;
}

.strength-btn {
  position: relative;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: inherit;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.strength-tooltip {
  position: absolute;
  left: 0;
  top: -8px;
  transform: translateY(-100%);
  background: rgba(12, 16, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 5;
}

.strength-btn:hover .strength-tooltip {
  opacity: 1;
  transform: translateY(-110%);
}

.strength-item + .strength-item {
  margin-top: 8px;
}

.strength-item p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.strength-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 20;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 18, 0.7);
  border: none;
}

.modal-card {
  position: relative;
  z-index: 21;
  width: min(640px, 90vw);
  background: rgba(12, 16, 26, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 30px 70px rgba(4, 6, 12, 0.6);
}

.modal-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.modal-card h4 {
  margin: 0;
  font-size: 20px;
}

.modal-body {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.modal-item {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.modal-item h5 {
  margin: 0 0 6px;
  font-size: 16px;
}

.modal-item p {
  margin: 4px 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.modal-item .desc {
  color: rgba(255, 255, 255, 0.85);
}

.close {
  padding: 6px 12px;
}
</style>
