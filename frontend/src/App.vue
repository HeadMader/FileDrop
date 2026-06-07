<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useThemeStore } from '@/stores/theme.store';
import AppHeader from '@/components/chrome/AppHeader.vue';
import AppFooter from '@/components/chrome/AppFooter.vue';
import ToastHost from '@/components/ui/ToastHost.vue';

const theme = useThemeStore();

onMounted(() => {
  theme.applyToDom();
});

watch(
  () => [theme.theme, theme.accent],
  () => {
    theme.applyToDom();
    theme.persist();
  },
);
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <AppFooter />
    <ToastHost />
  </div>
</template>

<style>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}
.app-main {
  flex: 1;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
