<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import IconButton from './IconButton.vue';

interface Props {
  open: boolean;
  title?: string;
  width?: number | string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'close'): void }>();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  (v) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = v ? 'hidden' : '';
    }
  },
);

onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  if (typeof document !== 'undefined') document.body.style.overflow = '';
});

function backdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close');
}
</script>

<template>
  <transition name="modal">
    <div v-if="open" class="modal-backdrop" @mousedown="backdropClick">
      <div
        class="modal"
        :style="width ? { maxWidth: typeof width === 'number' ? `${width}px` : width } : undefined"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="title || $slots.title" class="modal-header row-between">
          <div style="font-weight: 600; font-size: 14px">
            <slot name="title">{{ title }}</slot>
          </div>
          <IconButton icon="x" :icon-size="14" label="Close" @click="emit('close')" />
        </div>
        <div class="modal-body"><slot /></div>
        <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
