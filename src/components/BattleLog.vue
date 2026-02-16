<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  entries: { type: Array, default: () => [] },
});

// const keywordPattern =
//   /(暴击|闪避|弱化|强化|护甲|增伤|停止行动|被动特长|吸血|伤害|获胜|平局|回合)/g;
//
// const renderText = (text) => {
//   if (!text) return "";
//   return text.replace(
//     keywordPattern,
//     "<span class='keyword'>$1</span>"
//   );
// };
// 原关键词
const keywordPattern =
    /(暴击|闪避|弱化|强化|护甲|增伤|停止行动|被动特长|吸血|伤害|获胜|平局|回合)/g;

// 只匹配“使用了”后面的内容，直到换行前
const skillAfterUsedPattern = /(?<=使用了)[^\r\n]+/g;

// 数值（保持你之前的需求）
const numberPattern = /[+-]?\d+(?:\.\d+)?(?:%|x|倍|点|层|回合)?/gi;

const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const renderText = (text) => {
  if (!text) return "";
  const safe = escapeHtml(text);

  return safe
      .replace(skillAfterUsedPattern, "<span class='keyword skill'>$&</span>")
      .replace(keywordPattern, "<span class='keyword'>$1</span>")
      .replace(numberPattern, "<span class='keyword num'>$&</span>");
};

const viewEntries = computed(() =>
  props.entries.map((entry) => ({
    ...entry,
    html: renderText(entry.text),
  }))
);

const rounds = computed(() =>
  Array.from(
    new Set(
      viewEntries.value
        .filter((entry) => entry.type === "round")
        .map((entry) => entry.round)
        .filter(Boolean)
    )
  ).sort((a, b) => a - b)
);

const activeRound = ref(null);

const roundsWithEntries = computed(() => {
  const map = new Map();
  for (const entry of viewEntries.value) {
    if (!entry.round || entry.type === "round") continue;
    map.set(entry.round, true);
  }
  return rounds.value.filter((round) => map.has(round));
});

watch(
  roundsWithEntries,
  (list) => {
    if (!list.length) {
      activeRound.value = null;
      return;
    }
    activeRound.value = list[list.length - 1];
  },
  { immediate: true }
);

const entriesByRound = computed(() => {
  if (!activeRound.value) return [];
  return viewEntries.value.filter(
    (entry) => entry.round === activeRound.value && entry.type !== "round"
  );
});

const nextRound = () => {
  const list = rounds.value;
  if (!list.length) return;
  const idx = list.indexOf(activeRound.value);
  if (idx < list.length - 1) activeRound.value = list[idx + 1];
};

const prevRound = () => {
  const list = rounds.value;
  if (!list.length) return;
  const idx = list.indexOf(activeRound.value);
  if (idx > 0) activeRound.value = list[idx - 1];
};
</script>

<template>
  <section class="log">
    <header>
      <h3>战斗日志</h3>
      <slot name="actions" />
    </header>
    <div class="round-nav" v-if="rounds.length">
      <button class="ghost" type="button" @click="prevRound">上一回合</button>
      <span class="round-label">第 {{ activeRound }} 回合</span>
      <button class="ghost" type="button" @click="nextRound">下一回合</button>
    </div>
    <div class="entries">
      <template v-for="entry in entriesByRound" :key="entry.id">
        <p v-html="entry.html"></p>
      </template>
      <p v-if="!entries.length" class="hint">等待玩家行动...</p>
      <p v-else-if="!entriesByRound.length" class="hint">该回合暂无记录。</p>
    </div>
  </section>
</template>

<style scoped>
.log {
  border-radius: clamp(1rem, 1.2vw, 1.375rem);
  padding: clamp(0.875rem, 1.3vw, 1.25rem);
  background: rgba(12, 16, 26, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: clamp(14rem, 34vh, 17.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vw, 0.75rem);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: clamp(0.9375rem, 1.1vw, 1rem);
}

.entries {
  display: flex;
  flex-direction: column-reverse;
  gap: clamp(0.375rem, 0.8vw, 0.625rem);
  overflow-y: auto;
  max-height: min(36vh, 12.5rem);
  padding-right: 0.25rem;
}

.entries p {
  margin: 0;
  font-size: clamp(0.7rem, 0.95vw, 0.78rem);
  line-height: 1.5;
  color: rgba(240, 238, 255, 0.88);
}

.entries :deep(.keyword) {
  color: #7eebff;
  font-weight: 600;
}

.round-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.5rem, 1vw, 0.75rem);
}

.round-label {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.hint {
  color: rgba(255, 255, 255, 0.55);
}
</style>
