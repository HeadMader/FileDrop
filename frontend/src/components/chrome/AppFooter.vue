<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue';
</script>

<template>
  <footer
    style="border-top: 1px solid var(--border); padding: 24px 0; margin-top: 40px; background: var(--bg-subtle)"
  >
    <div
      class="container row-between"
      style="font-size: 12px; color: var(--text-subtle); flex-wrap: wrap; gap: 12px"
    >
      <div class="row" style="gap: 10px">
        <Icon name="logo" :size="16" />
        <span class="mono">filedrop / v1.0.0</span>
        <span style="opacity: 0.5">·</span>
        <span>Files are encrypted at rest and deleted on expiry.</span>
      </div>
      <div class="row" style="gap: 16px">
        <a href="#" @click.prevent>Docs</a>
        <a href="#" @click.prevent>API</a>
        <a href="#" @click.prevent>Privacy</a>
        <a href="#" @click.prevent>Terms</a>
      </div>
    </div>
  </footer>
</template>
