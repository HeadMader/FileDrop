<script setup lang="ts">
import Modal from './Modal.vue';
import Button from './Button.vue';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}
withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'danger',
});

const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>();

function onConfirm() {
  emit('confirm');
  emit('close');
}
</script>

<template>
  <Modal :open="open" :title="title" @close="emit('close')">
    <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5">{{ message }}</p>
    <template #footer>
      <Button variant="ghost" @click="emit('close')">{{ cancelLabel }}</Button>
      <Button
        variant="primary"
        :style="variant === 'danger' ? 'background: var(--danger); border-color: var(--danger);' : ''"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </Button>
    </template>
  </Modal>
</template>
