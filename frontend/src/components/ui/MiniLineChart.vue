<script setup lang="ts">
import { computed } from 'vue';
import type { DailyCount } from '@filedrop/shared';

interface Props {
  data: DailyCount[];
  color?: string;
  height?: number;
}
const props = withDefaults(defineProps<Props>(), { height: 140 });

const max = computed(() => Math.max(1, ...props.data.map((d) => d.count)));
const w = 100;
const h = 100;
const points = computed(() => {
  if (props.data.length === 0) return '';
  if (props.data.length === 1) {
    const d = props.data[0];
    return `0,${h - (d.count / max.value) * (h - 10) - 5}`;
  }
  return props.data
    .map((d, i) => `${(i / (props.data.length - 1)) * w},${h - (d.count / max.value) * (h - 10) - 5}`)
    .join(' ');
});
const area = computed(() => {
  if (!points.value) return '';
  const pts = points.value.split(' ');
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
});
const c = computed(() => props.color || 'var(--accent)');
</script>

<template>
  <div v-if="data.length" :style="{ height: `${height}px` }">
    <svg :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none" style="width: 100%; height: 100%">
      <path :d="area" :fill="c" opacity="0.12" />
      <polyline fill="none" :stroke="c" stroke-width="1.4" :points="points" vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>
