<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useToastStore } from '@/stores/toast.store';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();
const toast = useToastStore();

const path = computed(() => route.path);

function isActive(prefix: string): boolean {
  if (prefix === '/') return path.value === '/';
  return path.value.startsWith(prefix);
}

function go(to: string) {
  router.push(to);
}

async function onLogout() {
  await auth.logout();
  toast.push({ type: 'success', message: 'Logged out' });
  router.push('/');
}

const initial = computed(() => {
  if (!auth.user) return '';
  return (auth.user.firstName?.[0] || auth.user.email[0]).toUpperCase();
});
</script>

<template>
  <header class="fd-header">
    <div class="container row-between" style="height: 56px">
      <div class="row" style="gap: 24px">
        <a
          href="/"
          class="row"
          style="gap: 8px; font-weight: 600; font-size: 15px; letter-spacing: -0.01em"
          @click.prevent="go('/')"
        >
          <Icon name="logo" :size="22" />
          <span>FileDrop</span>
          <Badge mono outline style="height: 18px; padding: 0 6px; font-size: 10px; color: var(--text-subtle)">v1.0</Badge>
        </a>
        <nav class="row" style="gap: 2px">
          <a
            href="/"
            :class="['nav-link', isActive('/') && 'active']"
            @click.prevent="go('/')"
          >Upload</a>
          <a
            v-if="auth.isAuthenticated"
            href="/dashboard"
            :class="['nav-link', isActive('/dashboard') && 'active']"
            @click.prevent="go('/dashboard')"
          >Dashboard</a>
          <a
            v-if="auth.isAdmin"
            href="/admin"
            :class="['nav-link', isActive('/admin') && 'active']"
            @click.prevent="go('/admin')"
          >
            Admin
            <Badge tone="accent" mono style="margin-left: 4px; height: 16px; padding: 0 5px; font-size: 9px">ADMIN</Badge>
          </a>
        </nav>
      </div>

      <div class="row" style="gap: 6px">
        <IconButton
          size="md"
          :icon="theme.theme === 'dark' ? 'sun' : 'moon'"
          :icon-size="15"
          :label="theme.theme === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="theme.toggleTheme()"
        />
        <template v-if="auth.user">
          <div class="row" style="gap: 8px">
            <div class="row" style="gap: 8px; padding: 0 8px">
              <div
                class="avatar"
                style="background: var(--accent-soft); color: var(--accent); border-color: var(--accent-soft-border)"
              >
                {{ initial }}
              </div>
              <div style="font-size: 13px">{{ auth.displayName }}</div>
            </div>
            <IconButton size="md" icon="logout" :icon-size="15" label="Log out" @click="onLogout" />
          </div>
        </template>
        <template v-else>
          <div class="row" style="gap: 6px">
            <Button variant="ghost" size="sm" @click="go('/login')">Log in</Button>
            <Button variant="primary" size="sm" @click="go('/signup')">Sign up</Button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.fd-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav-link {
  padding: 6px 10px;
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}
.nav-link:hover {
  color: var(--text);
}
.nav-link.active {
  color: var(--text);
  background: var(--bg-muted);
  font-weight: 500;
}
</style>
