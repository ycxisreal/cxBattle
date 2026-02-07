<script setup>
defineProps({
  skill: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <button class="skill-card" type="button" :disabled="disabled">
    <div class="head">
      <strong>{{ skill.name }}</strong>
      <span>{{ skill.power ? `伤害 ${skill.power}` : "辅助效果" }}</span>
    </div>
    <p class="desc">{{ skill.des }}</p>
    <div class="meta">
      <span>命中 {{ (skill.accuracy * 100).toFixed(0) }}%</span>
      <span>暴击 {{ (skill.criticalRate * 100).toFixed(0) }}%</span>
    </div>
    <div class="tooltip">
      <p><strong>效果</strong> {{ skill.des || "无" }}</p>
      <p>伤害：{{ skill.power ?? 0 }}</p>
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
</template>

<style scoped>
.skill-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
  color: inherit;
  text-align: left;
  position: relative;
}

.skill-card:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.skill-card:hover:not(:disabled) {
  border-color: rgba(110, 205, 255, 0.8);
  transform: translateY(-4px);
  box-shadow: 0 10px 22px rgba(8, 15, 30, 0.4);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.head strong {
  font-size: 16px;
}

.head span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.desc {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  min-height: 34px;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.tooltip {
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translate(-50%, -100%);
  background: rgba(12, 16, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 200px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 5;
}

.skill-card:hover .tooltip {
  opacity: 1;
  transform: translate(-50%, -110%);
}

.tooltip p {
  margin: 4px 0;
}
</style>
