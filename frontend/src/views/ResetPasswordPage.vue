<script setup lang="ts">
import { computed, ref } from 'vue';
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

const token = computed(() => (route.query.token as string) || '');
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
  error.value = null;
  if (!token.value) {
    error.value = 'Missing reset token';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match';
    return;
  }
  loading.value = true;
  try {
    await auth.resetPassword({ token: token.value, password: password.value });
    toast.push({ type: 'success', message: 'Password updated' });
    router.push('/login');
  } catch (e) {
    error.value = (e as Error).message || 'Reset failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Set new password" subtitle="Choose a strong password.">
    <form @submit.prevent="submit" class="stack-lg">
      <Field label="New password">
        <Input v-model="password" type="password" required :minlength="8" autocomplete="new-password" />
      </Field>
      <Field label="Confirm password" :error="error ?? undefined">
        <Input v-model="confirm" type="password" required :minlength="8" autocomplete="new-password" />
      </Field>
      <Button type="submit" variant="primary" :block="true" :disabled="loading">
        {{ loading ? 'Updating…' : 'Update password' }}
      </Button>
    </form>
  </AuthShell>
</template>
