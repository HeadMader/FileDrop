<script setup lang="ts">
import { computed } from 'vue';
import type { DailyCount } from '@filedrop/shared';

interface Props {
  data: DailyCount[];
  label?: string;
  color?: string;
  height?: number;
}
const props = withDefaults(defineProps<Props>(), { label: 'Downloads', height: 140 });

const max = computed(() => Math.max(1, ...props.data.map((d) => d.count)));
const c = computed(() => props.color || 'var(--accent)');
</script>

<template>
  <div>
    <div
      style="display: flex; align-items: flex-end; gap: 6px; padding: 8px 0"
      :style="{ height: `${height}px` }"
    >
      <div
        v-for="(d, i) in data"
        :key="i"
        style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px"
      >
        <div
          :style="{
            position: 'relative',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: `${height - 28}px`,
            justifyContent: 'flex-end',
          }"
        >
          <div
            :style="{
              width: '100%',
              height: `${Math.max(2, (d.count / max) * (height - 28))}px`,
              background: c,
              borderRadius: 'var(--r-sm) var(--r-sm) 0 0',
              transition: 'height .3s',
              opacity: 0.85,
            }"
            :title="`${d.count} ${label.toLowerCase()}`"
          />
        </div>
        <div class="mono" style="font-size: 10px; color: var(--text-subtle)">
          {{ new Date(d.date).toLocaleDateString('en-US', { day: 'numeric' }) }}
        </div>
      </div>
    </div>
  </div>
</template>
