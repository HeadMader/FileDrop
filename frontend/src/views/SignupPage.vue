<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useToastStore } from '@/stores/toast.store';
import AuthShell from '@/components/chrome/AuthShell.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';

const auth = useAuthStore();
const router = useRouter();
const toast = useToastStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }
  loading.value = true;
  try {
    await auth.signup({
      email: email.value,
      password: password.value,
      firstName: firstName.value || undefined,
      lastName: lastName.value || undefined,
    });
    toast.push({ type: 'success', message: 'Account created' });
    router.push('/dashboard');
  } catch (e) {
    error.value = (e as Error).message || 'Could not create account';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Create account" subtitle="Get 500 MB uploads &amp; a dashboard.">
    <form @submit.prevent="submit" class="stack-lg">
      <div class="grid-2" style="gap: 8px">
        <Field label="First name">
          <Input v-model="firstName" placeholder="Ada" autocomplete="given-name" />
        </Field>
        <Field label="Last name">
          <Input v-model="lastName" placeholder="Lovelace" autocomplete="family-name" />
        </Field>
      </div>
      <Field label="Email">
        <Input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
      </Field>
      <Field label="Password" :error="error ?? undefined" hint="At least 8 characters">
        <Input v-model="password" type="password" placeholder="••••••••" required :minlength="8" autocomplete="new-password" />
      </Field>
      <Button type="submit" variant="primary" :block="true" :disabled="loading">
        {{ loading ? 'Creating…' : 'Create account' }}
      </Button>
    </form>
    <template #footer>
      Already have an account?
      <a href="/login" class="link" @click.prevent="router.push('/login')">Log in</a>
    </template>
  </AuthShell>
</template>
