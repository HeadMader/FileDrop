<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import AuthShell from '@/components/chrome/AuthShell.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const sent = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await auth.forgotPassword({ email: email.value });
    sent.value = true;
  } catch (e) {
    error.value = (e as Error).message || 'Request failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Reset password" subtitle="We'll email you a reset link.">
    <div v-if="sent" style="text-align: center; padding: 12px 0">
      <p style="font-size: 14px; margin: 0 0 8px">If <strong>{{ email }}</strong> has an account, a reset email is on its way.</p>
      <Button variant="ghost" style="margin-top: 12px" @click="router.push('/login')">
        Back to sign in
      </Button>
    </div>
    <form v-else @submit.prevent="submit" class="stack-lg">
      <Field label="Email" :error="error ?? undefined">
        <Input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
      </Field>
      <Button type="submit" variant="primary" :block="true" :disabled="loading">
        {{ loading ? 'Sending…' : 'Send reset link' }}
      </Button>
    </form>
    <template #footer>
      <a href="/login" class="link" @click.prevent="router.push('/login')">Back to sign in</a>
    </template>
  </AuthShell>
</template>
