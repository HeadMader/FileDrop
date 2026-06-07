<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import AuthShell from '@/components/chrome/AuthShell.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToastStore();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    const next = (route.query.next as string) || '/dashboard';
    toast.push({ type: 'success', message: 'Welcome back' });
    router.push(next);
  } catch (e) {
    error.value = (e as Error).message || 'Invalid email or password';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Welcome back" subtitle="Log in to your FileDrop account">
    <form @submit.prevent="submit" class="stack-lg">
      <Field label="Email">
        <Input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
      </Field>
      <Field label="Password" :error="error ?? undefined">
        <Input v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
      </Field>
      <Button type="submit" variant="primary" :block="true" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </Button>
      <div style="text-align: center; font-size: 12px">
        <a href="/forgot-password" class="link" @click.prevent="router.push('/forgot-password')">
          Forgot password?
        </a>
      </div>
    </form>
    <template #footer>
      Don't have an account?
      <a href="/signup" class="link" @click.prevent="router.push('/signup')">Sign up</a>
    </template>
  </AuthShell>
</template>
