<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ExpiresIn, UpdateUploadBody, UploadDetail } from '@filedrop/shared';
import { USER_EXPIRES_IN } from '@filedrop/shared';
import { uploadsApi } from '@/api/uploads.api';
import { adminApi } from '@/api/admin.api';
import { useToastStore } from '@/stores/toast.store';
import { useClipboard, useCountdown } from '@/composables/useUtils';
import { formatBytes, formatDate, formatDateTime, formatRelative } from '@/utils/format';
import { EXPIRATION_OPTIONS } from '@/utils/constants';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import Badge from '@/components/ui/Badge.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Toggle from '@/components/ui/Toggle.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Spinner from '@/components/ui/Spinner.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const props = defineProps<{ id?: string; admin?: boolean }>();

const route = useRoute();
const router = useRouter();
const toast = useToastStore();
const { copy, copied } = useClipboard();

const isAdmin = computed(() => !!props.admin);
const fileId = (props.id ?? (route.params.id as string)) as string;
const detail = ref<(UploadDetail & { uploaderEmail?: string | null }) | null>(null);
const loading = ref(true);
const notFound = ref(false);
const countdown = useCountdown(() => detail.value?.expiresAt ?? null);

const shareUrl = computed(() =>
  detail.value ? `${window.location.origin}/s/${detail.value.slug}` : '',
);
const expirationOptions = computed(() =>
  EXPIRATION_OPTIONS.filter((o) => USER_EXPIRES_IN.includes(o.value)),
);

async function load() {
  loading.value = true;
  notFound.value = false;
  try {
    detail.value = isAdmin.value
      ? await adminApi.getFile(fileId)
      : await uploadsApi.getDetail(fileId);
  } catch (e) {
    if ((e as { status?: number }).status === 404) notFound.value = true;
    else toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function copyShare() {
  await copy(shareUrl.value);
  toast.push({ type: 'success', message: 'Link copied' });
}

// ---- delete ----
const deleteOpen = ref(false);
async function doDelete() {
  if (!detail.value) return;
  try {
    if (isAdmin.value) await adminApi.deleteFile(detail.value.id);
    else await uploadsApi.remove(detail.value.id);
    toast.push({ type: 'success', message: isAdmin.value ? 'File force-deleted' : 'File deleted' });
    router.push(isAdmin.value ? '/admin' : '/dashboard');
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  }
}

// ---- edit ----
const editOpen = ref(false);
const editName = ref('');
const editExpiresIn = ref<ExpiresIn>('7d');
const editLimitMode = ref<'count' | 'unlimited'>('count');
const editLimit = ref(10);
const editRemovePwd = ref(false);
const editNewPwd = ref('');
const editSaving = ref(false);

function openEdit() {
  if (!detail.value) return;
  editName.value = detail.value.fileName;
  editExpiresIn.value = '7d';
  editLimitMode.value = detail.value.downloadLimit == null ? 'unlimited' : 'count';
  editLimit.value = detail.value.downloadLimit ?? Math.max(1, detail.value.downloadCount || 10);
  editRemovePwd.value = false;
  editNewPwd.value = '';
  editOpen.value = true;
}

function onEditLimit(v: string) {
  const min = detail.value?.downloadCount || 1;
  editLimit.value = Math.max(min, parseInt(v, 10) || min);
}

async function saveEdit() {
  if (!detail.value) return;
  editSaving.value = true;
  try {
    const body: UpdateUploadBody = {
      fileName: editName.value,
      expiresIn: editExpiresIn.value,
      downloadLimit:
        editLimitMode.value === 'unlimited'
          ? null
          : Math.max(detail.value.downloadCount, editLimit.value),
    };
    if (detail.value.hasPassword && editRemovePwd.value) body.removePassword = true;
    else if (editNewPwd.value.length >= 4) body.password = editNewPwd.value;

    await uploadsApi.update(detail.value.id, body);
    toast.push({ type: 'success', message: 'File updated' });
    editOpen.value = false;
    await load();
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    editSaving.value = false;
  }
}
</script>

<template>
  <div class="container container-wide" style="padding: 32px 24px">
    <a
      :href="isAdmin ? '/admin' : '/dashboard'"
      class="row subtle"
      style="gap: 6px; font-size: 13px; width: fit-content; margin-bottom: 20px"
      @click.prevent="router.push(isAdmin ? '/admin' : '/dashboard')"
    >
      <Icon name="arrow-l" :size="13" /> {{ isAdmin ? 'Back to admin' : 'Back to files' }}
    </a>

    <div v-if="loading" style="padding: 48px; display: flex; justify-content: center">
      <Spinner :size="32" />
    </div>

    <Card v-else-if="notFound" pad="lg">
      <EmptyState
        icon="file"
        title="File not found"
        message="It may have been deleted."
      >
        <template #action>
          <Button variant="secondary" size="sm" @click="router.push(isAdmin ? '/admin' : '/dashboard')">
            {{ isAdmin ? 'Back to admin' : 'Back to files' }}
          </Button>
        </template>
      </EmptyState>
    </Card>

    <div v-else-if="detail" class="stack-lg">
      <!-- header -->
      <div class="row-between" style="gap: 16px; flex-wrap: wrap">
        <div class="row" style="gap: 16px; align-items: center">
          <div
            style="
              width: 56px;
              height: 56px;
              border-radius: var(--r-md);
              background: var(--bg-muted);
              border: 1px solid var(--border);
              display: inline-flex;
              align-items: center;
              justify-content: center;
            "
          >
            <FileTypeIcon :mime-type="detail.mimeType" :size="28" />
          </div>
          <div style="min-width: 0">
            <h1 class="h3 mono" style="word-break: break-word; margin: 0">{{ detail.fileName }}</h1>
            <div class="row subtle" style="margin-top: 4px; gap: 12px; font-size: 12.5px; flex-wrap: wrap">
              <span class="mono">{{ formatBytes(detail.fileSize) }}</span>
              <span>·</span>
              <span class="mono">{{ detail.mimeType || 'application/octet-stream' }}</span>
              <span>·</span>
              <span>created {{ formatDate(detail.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div class="row" style="gap: 6px">
          <Button v-if="!isAdmin" variant="secondary" @click="openEdit">
            <template #icon><Icon name="edit" :size="13" /></template>
            Edit
          </Button>
          <Button variant="danger" @click="deleteOpen = true">
            <template #icon><Icon name="trash" :size="13" /></template>
            {{ isAdmin ? 'Force-delete' : 'Delete' }}
          </Button>
        </div>
      </div>

      <!-- share link + quick stats -->
      <div class="detail-grid">
        <Card pad="none">
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
            <div class="h4" style="font-size: 13px">Share link</div>
          </div>
          <div style="padding: 16px">
            <div
              style="
                display: flex;
                align-items: stretch;
                border: 1px solid var(--border-strong);
                border-radius: var(--r-md);
                overflow: hidden;
                background: var(--bg-subtle);
              "
            >
              <div class="mono ellipsis" style="flex: 1; padding: 10px 12px; font-size: 13px">{{ shareUrl }}</div>
              <button
                class="row"
                :style="{
                  padding: '0 14px',
                  borderLeft: '1px solid var(--border-strong)',
                  background: copied ? 'var(--success-soft)' : 'var(--bg-elevated)',
                  color: copied ? 'var(--success)' : 'var(--text)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  gap: '6px',
                  transition: 'background .15s',
                }"
                @click="copyShare"
              >
                <template v-if="copied"><Icon name="check" :size="13" />Copied</template>
                <template v-else><Icon name="copy" :size="13" />Copy</template>
              </button>
            </div>
            <div class="row" style="gap: 8px; margin-top: 12px; flex-wrap: wrap">
              <Badge :tone="countdown.expired ? 'default' : 'success'" dot>
                {{ countdown.expired ? 'expired' : 'active' }}
              </Badge>
              <Badge v-if="detail.hasPassword" tone="warning" dot>password</Badge>
              <Badge mono outline>{{ detail.slug }}</Badge>
            </div>
          </div>
        </Card>

        <div class="grid-2" style="gap: 12px">
          <div class="card card-pad-sm" style="padding: 16px">
            <div class="stat-label" style="margin-bottom: 8px">Downloads</div>
            <div style="font-size: 26px; font-weight: 600; letter-spacing: -0.01em">{{ detail.downloadCount }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 4px">
              {{ detail.downloadLimit != null ? `of ${detail.downloadLimit}` : 'unlimited' }}
            </div>
          </div>
          <div class="card card-pad-sm" style="padding: 16px">
            <div class="stat-label" style="margin-bottom: 8px">Expires</div>
            <div class="mono" style="font-size: 22px; font-weight: 600; letter-spacing: -0.01em">
              {{ countdown.expired ? '—' : countdown.text }}
            </div>
            <div class="subtle" style="font-size: 12px; margin-top: 4px">
              {{ countdown.expired ? 'expired' : formatDate(detail.expiresAt) }}
            </div>
          </div>
        </div>
      </div>

      <!-- file info -->
      <Card pad="none">
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
          <div class="h4" style="font-size: 13px">File info</div>
        </div>
        <div>
          <div class="info-row">
            <span class="info-key">File name</span>
            <span class="mono ellipsis info-val">{{ detail.fileName }}</span>
          </div>
          <div v-if="isAdmin" class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Uploader</span>
            <span class="info-val">
              <span v-if="detail.uploaderEmail" class="mono">{{ detail.uploaderEmail }}</span>
              <Badge v-else tone="default"><Icon name="globe" :size="10" /> Anonymous</Badge>
            </span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Size</span>
            <span class="mono info-val">{{ formatBytes(detail.fileSize) }} ({{ detail.fileSize.toLocaleString() }} bytes)</span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">MIME type</span>
            <span class="mono info-val">{{ detail.mimeType || 'application/octet-stream' }}</span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Slug</span>
            <span class="mono info-val">{{ detail.slug }}</span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">SHA-256</span>
            <span class="mono info-val" style="font-size: 11px; color: var(--text-muted); word-break: break-all">
              {{ detail.checksum || '—' }}
            </span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Created</span>
            <span class="info-val">{{ formatDateTime(detail.createdAt) }}</span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Expires</span>
            <span class="info-val">{{ formatDateTime(detail.expiresAt) }}</span>
          </div>
          <div class="info-row" style="border-top: 1px solid var(--border)">
            <span class="info-key">Password</span>
            <span class="info-val">
              <Badge v-if="detail.hasPassword" tone="warning" dot>protected</Badge>
              <span v-else class="subtle">none</span>
            </span>
          </div>
        </div>
      </Card>

      <!-- download log -->
      <Card pad="none">
        <div class="row-between" style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
          <div class="h4" style="font-size: 13px">Download log</div>
          <Badge mono outline>{{ detail.downloads.length }} events</Badge>
        </div>
        <EmptyState
          v-if="detail.downloads.length === 0"
          icon="download"
          title="No downloads yet"
          message="Share the link above to start tracking."
        />
        <table v-else class="table">
          <thead>
            <tr>
              <th>When</th>
              <th>IP address</th>
              <th>User agent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detail.downloads" :key="d.id">
              <td>
                <div style="font-size: 12.5px">{{ formatDateTime(d.createdAt) }}</div>
                <div class="subtle" style="font-size: 11px">{{ formatRelative(d.createdAt) }}</div>
              </td>
              <td class="mono" style="font-size: 12.5px">{{ d.ip || '—' }}</td>
              <td class="mono subtle ellipsis" style="font-size: 11px; max-width: 380px">{{ d.userAgent || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>

    <!-- Edit modal -->
    <Modal :open="editOpen" title="Edit file" :width="520" @close="editOpen = false">
      <div v-if="detail" class="stack-lg">
        <Field label="File name">
          <Input v-model="editName" mono />
        </Field>
        <Field label="Expiration" hint="Recalculated from now when changed.">
          <div class="row" style="flex-wrap: wrap; gap: 6px">
            <button
              v-for="o in expirationOptions"
              :key="o.value"
              type="button"
              :class="['btn', 'btn-sm', editExpiresIn === o.value ? 'btn-primary' : 'btn-secondary']"
              style="border-radius: var(--r-pill); height: 28px"
              @click="editExpiresIn = o.value"
            >
              {{ o.value }}
            </button>
          </div>
        </Field>
        <Field label="Download limit" :hint="`Cannot be set below the current count (${detail.downloadCount}).`">
          <div class="row" style="gap: 8px">
            <Input
              type="number"
              :model-value="editLimitMode === 'unlimited' ? '' : editLimit"
              :disabled="editLimitMode === 'unlimited'"
              :min="detail.downloadCount || 1"
              placeholder="—"
              style="flex: 0 1 120px"
              @update:model-value="onEditLimit"
            />
            <Toggle
              :model-value="editLimitMode === 'unlimited'"
              label="Unlimited"
              @update:model-value="(v) => (editLimitMode = v ? 'unlimited' : 'count')"
            />
          </div>
        </Field>
        <Field>
          <Toggle
            v-if="detail.hasPassword"
            v-model="editRemovePwd"
            label="Remove password"
            style="margin-bottom: 8px"
          />
          <Input
            v-if="!editRemovePwd"
            v-model="editNewPwd"
            type="password"
            :minlength="4"
            :placeholder="detail.hasPassword ? 'Change password (leave blank to keep)' : 'Add password (4–72 chars)'"
          />
        </Field>
      </div>
      <template #footer>
        <Button variant="ghost" @click="editOpen = false">Cancel</Button>
        <Button variant="primary" :disabled="editSaving" @click="saveEdit">
          {{ editSaving ? 'Saving…' : 'Save changes' }}
        </Button>
      </template>
    </Modal>

    <ConfirmDialog
      :open="deleteOpen"
      variant="danger"
      :title="isAdmin ? 'Force-delete file?' : 'Delete this file?'"
      :message="
        detail
          ? isAdmin
            ? `“${detail.fileName}” will be permanently deleted and the share link will stop working immediately. This action is logged in the admin audit trail.`
            : `“${detail.fileName}” will be permanently deleted and the share link will stop working immediately. This cannot be undone.`
          : ''
      "
      :confirm-label="isAdmin ? 'Force-delete' : 'Delete file'"
      @close="deleteOpen = false"
      @confirm="doDelete"
    />
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.stat-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-subtle);
}
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
}
.info-key {
  width: 140px;
  flex-shrink: 0;
  color: var(--text-subtle);
}
.info-val {
  flex: 1;
  min-width: 0;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 880px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
