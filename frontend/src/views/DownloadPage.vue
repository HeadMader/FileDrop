<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FileMetadata } from '@filedrop/shared';
import { uploadsApi } from '@/api/uploads.api';
import { useToastStore } from '@/stores/toast.store';
import { useCountdown } from '@/composables/useUtils';
import { formatBytes, formatDate } from '@/utils/format';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import Input from '@/components/ui/Input.vue';
import Field from '@/components/ui/Field.vue';
import Badge from '@/components/ui/Badge.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import Spinner from '@/components/ui/Spinner.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const slug = route.params.slug as string;
const meta = ref<FileMetadata | null>(null);
const loading = ref(true);
const notFound = ref(false);
const password = ref('');
const verifying = ref(false);
const downloadToken = ref<string | null>(null);
const pwdError = ref<string | null>(null);

const countdown = useCountdown(() => meta.value?.expiresAt ?? null);

onMounted(async () => {
  try {
    meta.value = await uploadsApi.getMeta(slug);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404) notFound.value = true;
    else toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    loading.value = false;
  }
});

async function verifyPassword() {
  if (password.value.length < 4) return;
  verifying.value = true;
  pwdError.value = null;
  try {
    const res = await uploadsApi.verifyPassword(slug, { password: password.value });
    if (res.valid && res.downloadToken) {
      downloadToken.value = res.downloadToken;
    } else {
      pwdError.value = 'Incorrect password';
    }
  } catch (e) {
    pwdError.value = (e as Error).message || 'Verification failed';
  } finally {
    verifying.value = false;
  }
}

function startDownload() {
  if (!meta.value) return;
  window.location.href = uploadsApi.downloadUrl(meta.value.slug, downloadToken.value ?? undefined);
}
</script>

<template>
  <div class="container container-narrow" style="padding: 48px 24px">
    <div v-if="loading" style="display: flex; justify-content: center; padding: 48px">
      <Spinner :size="32" />
    </div>

    <Card v-else-if="notFound" pad="lg">
      <div style="text-align: center; padding: 24px 0">
        <Icon name="x" :size="22" style="color: var(--danger); margin-bottom: 8px" />
        <h2 class="h3" style="margin: 0 0 4px">File not found</h2>
        <p class="muted" style="font-size: 13px">
          The link is invalid, or the file has been deleted.
        </p>
        <Button variant="secondary" style="margin-top: 16px" @click="router.push('/')">
          Back home
        </Button>
      </div>
    </Card>

    <Card v-else-if="meta && !meta.isAvailable" pad="lg">
      <div style="text-align: center; padding: 24px 0">
        <Icon name="clock" :size="22" style="color: var(--warning); margin-bottom: 8px" />
        <h2 class="h3" style="margin: 0 0 4px">File unavailable</h2>
        <p class="muted" style="font-size: 13px">
          This file has expired or reached its download limit.
        </p>
        <Button variant="secondary" style="margin-top: 16px" @click="router.push('/')">
          Upload your own
        </Button>
      </div>
    </Card>

    <Card v-else-if="meta" pad="lg">
      <div class="stack-lg">
        <div class="row" style="gap: 14px; align-items: flex-start">
          <div
            style="width: 44px; height: 44px; border-radius: var(--r-md); background: var(--bg-muted); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border)"
          >
            <FileTypeIcon :mime-type="meta.mimeType" :size="20" />
          </div>
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 600; font-size: 15px; word-break: break-word">{{ meta.fileName }}</div>
            <div class="muted" style="font-size: 13px; margin-top: 2px">
              {{ formatBytes(meta.fileSize) }} · uploaded {{ formatDate(meta.createdAt) }}
            </div>
          </div>
        </div>

        <div class="row" style="gap: 6px; flex-wrap: wrap">
          <Badge tone="success" dot>Available</Badge>
          <Badge mono outline>
            <Icon name="clock" :size="10" /> {{ countdown.text }}
          </Badge>
          <Badge v-if="meta.downloadLimit != null" mono outline>
            {{ meta.downloadCount }} / {{ meta.downloadLimit }} downloads
          </Badge>
          <Badge v-if="meta.hasPassword" mono outline>
            <Icon name="lock" :size="10" /> Password
          </Badge>
        </div>

        <div v-if="meta.hasPassword && !downloadToken" class="stack-lg">
          <Field label="Enter password to continue" :error="pwdError ?? undefined">
            <Input
              v-model="password"
              type="password"
              placeholder="Password"
              @keydown.enter="verifyPassword"
            />
          </Field>
          <Button
            variant="primary"
            :block="true"
            :disabled="verifying || password.length < 4"
            @click="verifyPassword"
          >
            <template #icon><Icon name="unlock" :size="14" /></template>
            {{ verifying ? 'Verifying…' : 'Unlock' }}
          </Button>
        </div>
        <Button v-else variant="primary" :block="true" @click="startDownload">
          <template #icon><Icon name="download" :size="14" /></template>
          Download
        </Button>

        <p class="muted" style="font-size: 12px; text-align: center; margin: 0">
          Files self-destruct on expiry. Be careful sharing executables you don't trust.
        </p>
      </div>
    </Card>
  </div>
</template>
