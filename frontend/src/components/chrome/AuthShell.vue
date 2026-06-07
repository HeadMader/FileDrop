<script setup lang="ts">
import Card from '@/components/ui/Card.vue';
import Icon from '@/components/ui/Icon.vue';

defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="bg-grid" style="min-height: calc(100vh - 120px); display: flex; align-items: center; justify-content: center; padding: 48px 24px">
    <div style="width: 100%; max-width: 380px">
      <div style="text-align: center; margin-bottom: 24px">
        <Icon name="logo" :size="28" style="margin-bottom: 8px" />
        <h1 class="h3" style="margin: 0 0 4px">{{ title }}</h1>
        <p v-if="subtitle" class="muted" style="font-size: 13px; margin: 0">{{ subtitle }}</p>
      </div>
      <Card pad="lg">
        <slot />
      </Card>
      <div v-if="$slots.footer" style="text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-muted)">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
