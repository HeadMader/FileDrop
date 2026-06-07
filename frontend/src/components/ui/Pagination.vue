<script setup lang="ts">
import { computed } from 'vue';
import Button from './Button.vue';
import Icon from './Icon.vue';

interface Props {
  page: number;
  totalPages: number;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'change', p: number): void }>();

const pages = computed<(number | '…')[]>(() => {
  const tp = props.totalPages;
  const cur = props.page;
  if (tp <= 1) return [];
  const arr: (number | '…')[] = [1];
  if (cur > 3) arr.push('…');
  for (let i = Math.max(2, cur - 1); i <= Math.min(tp - 1, cur + 1); i++) arr.push(i);
  if (cur < tp - 2) arr.push('…');
  if (tp > 1) arr.push(tp);
  return arr;
});
</script>

<template>
  <div v-if="totalPages > 1" class="row" style="gap: 4px">
    <Button variant="ghost" size="sm" :disabled="page === 1" @click="emit('change', page - 1)">
      <template #icon><Icon name="chev-l" :size="13" /></template>
      Prev
    </Button>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="subtle" style="padding: 0 6px">…</span>
      <button
        v-else
        class="btn btn-ghost btn-sm"
        :style="p === page ? 'background: var(--bg-muted); color: var(--text); font-weight: 600;' : ''"
        @click="emit('change', p)"
      >
        {{ p }}
      </button>
    </template>
    <Button variant="ghost" size="sm" :disabled="page === totalPages" @click="emit('change', page + 1)">
      Next
      <template #iconRight><Icon name="chev-r" :size="13" /></template>
    </Button>
  </div>
</template>
