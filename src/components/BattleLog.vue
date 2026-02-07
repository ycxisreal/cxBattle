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
  border-radius: 22px;
  padding: 20px;
  background: rgba(12, 16, 26, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  font-size: 18px;
}

.entries {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  overflow-y: auto;
  max-height: 200px;
  padding-right: 4px;
}

.entries p {
  margin: 0;
  font-size: 13px;
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
  gap: 12px;
}

.round-label {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.hint {
  color: rgba(255, 255, 255, 0.55);
}
</style>
