<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FileMetadata } from '@filedrop/shared';
import { uploadsApi } from '@/api/uploads.api';
import { useToastStore } from '@/stores/toast.store';
import { useCountdown, useClipboard } from '@/composables/useUtils';
import { formatBytes, formatDate, formatCountdown } from '@/utils/format';
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
const { copy } = useClipboard();

const slug = route.params.slug as string;
const meta = ref<FileMetadata | null>(null);
const loading = ref(true);
const notFound = ref(false);
const loadError = ref<string | null>(null);
const password = ref('');
const verifying = ref(false);
const downloadToken = ref<string | null>(null);
const pwdError = ref<string | null>(null);

const host = typeof window !== 'undefined' ? window.location.host : '';
const countdown = useCountdown(() => meta.value?.expiresAt ?? null);

const passwordRequired = computed(() => !!meta.value?.hasPassword && !downloadToken.value);
const downloadsLeft = computed(() =>
  meta.value?.downloadLimit ? meta.value.downloadLimit - meta.value.downloadCount : null,
);
const metaExpired = computed(() =>
  meta.value ? formatCountdown(meta.value.expiresAt).expired : false,
);
const unavailableReason = computed(() =>
  metaExpired.value ? 'The retention window has expired.' : 'The download limit has been reached.',
);

onMounted(async () => {
  try {
    meta.value = await uploadsApi.getMeta(slug);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404) {
      notFound.value = true;
    } else {
      loadError.value = (e as Error).message || 'Could not load this file.';
      toast.push({ type: 'error', message: loadError.value });
    }
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
      toast.push({ type: 'success', message: 'Password accepted' });
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
  toast.push({ type: 'success', message: 'Download started' });
  window.location.href = uploadsApi.downloadUrl(meta.value.slug, downloadToken.value ?? undefined);
}

function copyLink() {
  copy(`${window.location.origin}/s/${slug}`);
  toast.push({ type: 'success', message: 'Link copied to clipboard' });
}
</script>

<template>
  <div class="download-page">
    <!-- This wrapper MUST be the only root node: App.vue wraps views in
         <transition mode="out-in">, which needs a single root element. A sibling
         node at the root (even a comment) wedges the fade and blanks the view. -->
    <!-- Loading -->
    <div v-if="loading" class="container container-narrow" style="padding: 80px 24px">
    <Card pad="none" style="text-align: center; padding: 64px 24px">
      <div style="display: flex; justify-content: center"><Spinner :size="28" /></div>
      <div class="subtle mono" style="margin-top: 16px; font-size: 12px">GET /api/uploads/{{ slug }}</div>
    </Card>
  </div>

  <!-- Not found -->
  <div v-else-if="notFound" class="container container-narrow" style="padding: 80px 24px">
    <Card pad="lg" style="text-align: center">
      <div
        style="display: inline-flex; padding: 14px; background: var(--bg-muted); border-radius: 50%; color: var(--text-muted)"
      >
        <Icon name="file" :size="28" />
      </div>
      <h2 class="h3" style="margin-top: 16px">File not found</h2>
      <p class="muted" style="margin-top: 8px; font-size: 14px">
        This link may be invalid or the file may have been deleted.
      </p>
      <div class="row" style="justify-content: center; gap: 8px; margin-top: 20px">
        <Button variant="primary" @click="router.push('/')">Upload a file</Button>
        <Button variant="ghost" @click="router.push('/')">Go home</Button>
      </div>
      <div class="mono subtle" style="margin-top: 24px; font-size: 11px">404 · /s/{{ slug }}</div>
    </Card>
  </div>

  <!-- Unavailable (expired / limit reached) -->
  <div v-else-if="meta && !meta.isAvailable" class="container container-narrow" style="padding: 80px 24px">
    <Card pad="lg" style="text-align: center">
      <div
        style="display: inline-flex; padding: 14px; background: var(--warning-soft); color: var(--warning); border-radius: 50%"
      >
        <Icon name="clock" :size="28" />
      </div>
      <h2 class="h3" style="margin-top: 16px">This file is no longer available</h2>
      <p class="muted" style="margin-top: 8px; font-size: 14px">{{ unavailableReason }}</p>
      <div class="row" style="justify-content: center; gap: 6px; margin-top: 16px">
        <Badge tone="warning" dot>{{ metaExpired ? 'expired' : 'limit reached' }}</Badge>
        <Badge mono outline>/s/{{ slug }}</Badge>
      </div>
      <div class="row" style="justify-content: center; gap: 8px; margin-top: 20px">
        <Button variant="primary" @click="router.push('/')">Upload your own</Button>
      </div>
    </Card>
  </div>

  <!-- Available -->
  <div v-else-if="meta" class="container container-narrow" style="padding: 48px 24px">
    <div class="stack-lg">
      <div class="row mono subtle" style="gap: 8px; font-size: 12px">
        <Icon name="globe" :size="12" />
        <span>{{ host }}/s/{{ slug }}</span>
      </div>

      <Card pad="lg">
        <div class="stack-lg">
          <!-- file header -->
          <div class="row" style="gap: 16px; align-items: flex-start">
            <div
              style="
                flex: 0 0 auto;
                width: 56px;
                height: 56px;
                border-radius: var(--r-md);
                background: var(--bg-muted);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border);
              "
            >
              <FileTypeIcon :mime-type="meta.mimeType" :size="28" />
            </div>
            <div style="flex: 1; min-width: 0">
              <div class="row" style="gap: 8px; margin-bottom: 4px">
                <span class="eyebrow">filedrop / shared file</span>
                <Badge v-if="meta.hasPassword" tone="warning" dot style="height: 18px; font-size: 10px">encrypted</Badge>
              </div>
              <h2 class="h3 mono" style="word-break: break-word; line-height: 1.35">{{ meta.fileName }}</h2>
              <div class="row subtle" style="margin-top: 6px; gap: 14px; font-size: 13px; flex-wrap: wrap">
                <span class="mono">{{ formatBytes(meta.fileSize) }}</span>
                <span class="mono">·</span>
                <span class="mono">{{ meta.mimeType || 'application/octet-stream' }}</span>
                <span class="mono">·</span>
                <span>uploaded {{ formatDate(meta.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- stats grid -->
          <div class="grid-3">
            <div style="padding: 14px; border: 1px solid var(--border); border-radius: var(--r-md)">
              <div class="subtle" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">Expires in</div>
              <div
                class="mono"
                :style="{ fontSize: '18px', marginTop: '4px', color: countdown.expired ? 'var(--danger)' : 'var(--text)' }"
              >
                {{ countdown.text }}
              </div>
            </div>
            <div style="padding: 14px; border: 1px solid var(--border); border-radius: var(--r-md)">
              <div class="subtle" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">Downloads</div>
              <div class="mono" style="font-size: 18px; margin-top: 4px">
                {{ meta.downloadCount }}
                <span v-if="meta.downloadLimit" class="subtle"> / {{ meta.downloadLimit }}</span>
                <span v-else class="subtle" style="font-size: 12px"> · unlimited</span>
              </div>
            </div>
            <div style="padding: 14px; border: 1px solid var(--border); border-radius: var(--r-md)">
              <div class="subtle" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">Status</div>
              <div style="margin-top: 6px"><Badge tone="success" dot>available</Badge></div>
            </div>
          </div>

          <!-- password gate OR download -->
          <div
            v-if="passwordRequired"
            style="padding: 16px; background: var(--bg-subtle); border-radius: var(--r-md); border: 1px solid var(--border)"
          >
            <div class="row" style="gap: 8px; margin-bottom: 10px">
              <Icon name="lock" :size="14" style="color: var(--warning)" />
              <div style="font-size: 13px; font-weight: 500">This file is password-protected</div>
            </div>
            <Field :error="pwdError ?? undefined">
              <div class="row" style="gap: 8px">
                <Input
                  v-model="password"
                  type="password"
                  placeholder="Enter password"
                  autofocus
                  style="flex: 1"
                  @keydown.enter="verifyPassword"
                />
                <Button variant="primary" :disabled="verifying || password.length < 4" @click="verifyPassword">
                  <template #icon><Icon name="unlock" :size="14" /></template>
                  {{ verifying ? 'Verifying…' : 'Unlock' }}
                </Button>
              </div>
            </Field>
          </div>
          <div v-else class="row" style="gap: 8px; flex-wrap: wrap">
            <Button
              variant="primary"
              size="lg"
              :disabled="countdown.expired || (downloadsLeft != null && downloadsLeft <= 0)"
              style="flex: 1; min-width: 220px"
              @click="startDownload"
            >
              <template #icon><Icon name="download" :size="16" /></template>
              Download {{ formatBytes(meta.fileSize) }}
            </Button>
            <Button variant="secondary" @click="copyLink">
              <template #icon><Icon name="link" :size="14" /></template>
              Copy link
            </Button>
          </div>

          <!-- security footer -->
          <div
            class="row-between subtle"
            style="font-size: 12px; padding-top: 8px; border-top: 1px solid var(--border)"
          >
            <div class="row" style="gap: 8px">
              <Icon name="shield" :size="12" />
              <span>Scanned for malware · transferred over TLS</span>
            </div>
            <div class="mono">slug: {{ slug }}</div>
          </div>
        </div>
      </Card>

      <div class="row-between subtle" style="font-size: 12px">
        <span>Need to share something yourself?</span>
        <a href="/" class="link" @click.prevent="router.push('/')">Upload a file →</a>
      </div>
    </div>
  </div>

  <!-- Fallback: load error / unexpected state — never render a blank page -->
  <div v-else class="container container-narrow" style="padding: 80px 24px">
    <Card pad="lg" style="text-align: center">
      <div
        style="display: inline-flex; padding: 14px; background: var(--danger-soft); color: var(--danger); border-radius: 50%"
      >
        <Icon name="x" :size="28" />
      </div>
      <h2 class="h3" style="margin-top: 16px">Couldn’t load this file</h2>
      <p class="muted" style="margin-top: 8px; font-size: 14px">
        {{ loadError || 'Something went wrong. Please try again.' }}
      </p>
      <div class="row" style="justify-content: center; gap: 8px; margin-top: 20px">
        <Button variant="primary" @click="router.go(0)">Retry</Button>
        <Button variant="ghost" @click="router.push('/')">Go home</Button>
      </div>
      <div class="mono subtle" style="margin-top: 24px; font-size: 11px">/s/{{ slug }}</div>
    </Card>
  </div>
  </div>
</template>
