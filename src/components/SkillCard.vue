<script setup>
defineProps({
  skill: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <button class="skill-card" :class="{ compact }" type="button" :disabled="disabled">
    <div class="head">
      <strong>{{ skill.name }}</strong>
      <span v-if="!compact">{{ skill.power ? `伤害 ${skill.power}` : "辅助效果" }}</span>
    </div>
    <p v-if="!compact" class="desc">{{ skill.des }}</p>
    <div v-if="!compact" class="meta">
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
  border-radius: clamp(0.875rem, 1vw, 1.125rem);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: clamp(0.625rem, 1vw, 0.875rem) clamp(0.75rem, 1.2vw, 1rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.25rem, 0.6vw, 0.375rem);
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
  transform: translateY(-0.25rem);
  box-shadow: 0 10px 22px rgba(8, 15, 30, 0.4);
}

.skill-card.compact {
  width: fit-content;
  max-width: 100%;
  padding: 0.2rem 0.45rem;
  gap: 0;
  border-radius: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.02);
  box-shadow: none;
}

.skill-card.compact .head {
  gap: 0;
}

.skill-card.compact .head strong {
  font-size: 0.78rem;
  line-height: 1.2;
  white-space: nowrap;
}

.skill-card.compact:hover:not(:disabled) {
  transform: translateY(-0.0625rem);
  box-shadow: none;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: clamp(0.5rem, 0.9vw, 0.75rem);
}

.head strong {
  font-size: clamp(0.875rem, 1vw, 0.95rem);
}

.head span {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
}

.desc {
  margin: 0;
  font-size: clamp(0.72rem, 0.95vw, 0.78rem);
  color: rgba(255, 255, 255, 0.65);
  min-height: 2.125rem;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
}

.tooltip {
  position: absolute;
  left: 50%;
  top: -0.625rem;
  transform: translate(-50%, -100%);
  background: rgba(12, 16, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  width: min(14rem, 80vw);
  font-size: 0.75rem;
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
  margin: 0.25rem 0;
}
</style>
