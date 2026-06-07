<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { UploadItem } from '@filedrop/shared';
import { useDashboardStore } from '@/stores/dashboard.store';
import { useToastStore } from '@/stores/toast.store';
import { useClipboard } from '@/composables/useUtils';
import { formatBytes, formatDate, formatRelative } from '@/utils/format';
import { EXPIRATION_OPTIONS } from '@/utils/constants';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Badge from '@/components/ui/Badge.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Segmented from '@/components/ui/Segmented.vue';
import Pagination from '@/components/ui/Pagination.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import MiniBarChart from '@/components/ui/MiniBarChart.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import Toggle from '@/components/ui/Toggle.vue';
import Spinner from '@/components/ui/Spinner.vue';

const store = useDashboardStore();
const router = useRouter();
const toast = useToastStore();
const { copy } = useClipboard();

const searchInput = ref(store.search);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (v) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => store.setSearch(v), 250);
});

onMounted(() => {
  store.fetchFiles();
  store.fetchStats();
});

const editTarget = ref<UploadItem | null>(null);
const editFileName = ref('');
const editExpiresIn = ref<string>('24h');
const editLimitMode = ref<'count' | 'unlimited'>('count');
const editLimit = ref<number>(5);
const editRemovePwd = ref(false);
const editNewPwd = ref('');
const editSaving = ref(false);

const deleteTarget = ref<UploadItem | null>(null);

function openEdit(f: UploadItem) {
  editTarget.value = f;
  editFileName.value = f.fileName;
  editExpiresIn.value = '24h';
  editLimitMode.value = f.downloadLimit == null ? 'unlimited' : 'count';
  editLimit.value = f.downloadLimit ?? 5;
  editRemovePwd.value = false;
  editNewPwd.value = '';
}

async function saveEdit() {
  if (!editTarget.value) return;
  editSaving.value = true;
  try {
    await store.updateFile(editTarget.value.id, {
      fileName: editFileName.value,
      expiresIn: editExpiresIn.value as never,
      downloadLimit: editLimitMode.value === 'unlimited' ? null : editLimit.value,
      ...(editRemovePwd.value
        ? { removePassword: true }
        : editNewPwd.value.length >= 4
          ? { password: editNewPwd.value }
          : {}),
    });
    toast.push({ type: 'success', message: 'File updated' });
    editTarget.value = null;
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    editSaving.value = false;
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await store.deleteFile(deleteTarget.value.id);
    toast.push({ type: 'success', message: 'File deleted' });
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    deleteTarget.value = null;
  }
}

function copyLink(slug: string) {
  copy(`${window.location.origin}/s/${slug}`);
  toast.push({ type: 'success', message: 'Link copied' });
}

const statsCards = computed(() => {
  const s = store.stats;
  return [
    { label: 'Active files', value: s?.activeUploads ?? 0, icon: 'database' as const },
    { label: 'Total downloads', value: s?.totalDownloads ?? 0, icon: 'download' as const },
    {
      label: 'Storage used',
      value: s ? formatBytes(s.storageUsedBytes) : '0 B',
      sub: s ? `of ${formatBytes(s.storageQuotaBytes)}` : '',
      icon: 'bar' as const,
    },
    { label: 'Expired files', value: s?.expiredUploads ?? 0, icon: 'clock' as const },
  ];
});
</script>

<template>
  <div class="container container-wide" style="padding: 32px 24px">
    <div class="row-between" style="margin-bottom: 24px">
      <div>
        <h1 class="h2" style="margin: 0">Dashboard</h1>
        <p class="muted" style="font-size: 13px; margin-top: 4px">
          Manage your uploads and view download activity.
        </p>
      </div>
      <Button variant="primary" @click="router.push('/')">
        <template #icon><Icon name="upload" :size="13" /></template>
        New upload
      </Button>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="gap: 12px; margin-bottom: 16px">
      <Card v-for="s in statsCards" :key="s.label" pad="sm">
        <div class="row" style="gap: 10px">
          <div
            style="width: 32px; height: 32px; border-radius: var(--r-md); background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; border: 1px solid var(--accent-soft-border)"
          >
            <Icon :name="s.icon" :size="14" />
          </div>
          <div style="flex: 1; min-width: 0">
            <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">
              {{ s.label }}
            </div>
            <div style="font-size: 18px; font-weight: 600; margin-top: 2px">{{ s.value }}</div>
            <div v-if="s.sub" class="subtle" style="font-size: 11px">{{ s.sub }}</div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Chart -->
    <Card pad="lg" style="margin-bottom: 16px">
      <div class="row-between" style="margin-bottom: 8px">
        <div>
          <div style="font-weight: 600; font-size: 14px">Downloads</div>
          <div class="muted" style="font-size: 12px">Last {{ store.statsPeriod === '7d' ? '7' : store.statsPeriod === '30d' ? '30' : '90' }} days</div>
        </div>
        <Segmented
          :model-value="store.statsPeriod"
          :options="[
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
            { value: '90d', label: '90d' },
          ]"
          @update:model-value="(v) => store.setStatsPeriod(v as never)"
        />
      </div>
      <MiniBarChart v-if="store.stats" :data="store.stats.downloadsPerDay" :height="120" />
      <div v-else style="height: 120px; display: flex; align-items: center; justify-content: center">
        <Spinner />
      </div>
    </Card>

    <!-- Files -->
    <Card pad="lg">
      <div class="row" style="gap: 8px; margin-bottom: 12px; flex-wrap: wrap">
        <div style="flex: 1; min-width: 200px; position: relative">
          <Icon
            name="search"
            :size="13"
            style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none"
          />
          <Input v-model="searchInput" placeholder="Search files…" style="padding-left: 30px" />
        </div>
        <Segmented
          :model-value="store.status"
          :options="[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
          ]"
          @update:model-value="(v) => store.setStatus(v as never)"
        />
        <select
          class="select"
          :value="store.sort"
          @change="(e) => store.setSort((e.target as HTMLSelectElement).value as never)"
          style="max-width: 160px"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="largest">Largest</option>
          <option value="most">Most downloaded</option>
        </select>
      </div>

      <div v-if="store.loading" style="padding: 40px; display: flex; justify-content: center">
        <Spinner :size="28" />
      </div>

      <EmptyState
        v-else-if="store.files.length === 0"
        icon="file"
        title="No files yet"
        message="Upload your first file to get started."
      >
        <template #action>
          <Button variant="primary" size="sm" @click="router.push('/')">Upload a file</Button>
        </template>
      </EmptyState>

      <table v-else class="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Downloads</th>
            <th>Expires</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in store.files" :key="f.id">
            <td>
              <div class="row" style="gap: 10px; min-width: 0">
                <FileTypeIcon :mime-type="f.mimeType" :size="16" />
                <a
                  href="#"
                  class="link"
                  style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px"
                  @click.prevent="router.push(`/dashboard/files/${f.id}`)"
                >
                  {{ f.fileName }}
                </a>
                <Icon v-if="f.hasPassword" name="lock" :size="10" style="color: var(--text-subtle)" />
              </div>
            </td>
            <td class="mono">{{ formatBytes(f.fileSize) }}</td>
            <td class="mono">
              {{ f.downloadCount }}<span class="subtle" v-if="f.downloadLimit != null"> / {{ f.downloadLimit }}</span>
            </td>
            <td>
              <span class="muted" style="font-size: 12px">{{ formatRelative(f.expiresAt) }}</span>
            </td>
            <td>
              <Badge :tone="f.isExpired ? 'danger' : 'success'" dot>
                {{ f.isExpired ? 'Expired' : 'Active' }}
              </Badge>
            </td>
            <td>
              <div class="row" style="gap: 2px; justify-content: flex-end">
                <IconButton icon="copy" :icon-size="13" label="Copy" @click="copyLink(f.slug)" />
                <IconButton icon="edit" :icon-size="13" label="Edit" @click="openEdit(f)" />
                <IconButton icon="trash" :icon-size="13" label="Delete" @click="deleteTarget = f" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.totalPages > 1" class="row-between" style="margin-top: 16px">
        <div class="muted" style="font-size: 12px">
          Showing {{ (store.page - 1) * store.pageSize + 1 }}–{{ Math.min(store.page * store.pageSize, store.total) }} of {{ store.total }}
        </div>
        <Pagination :page="store.page" :total-pages="store.totalPages" @change="store.setPage" />
      </div>
    </Card>

    <!-- Edit modal -->
    <Modal :open="editTarget != null" title="Edit upload" :width="480" @close="editTarget = null">
      <div v-if="editTarget" class="stack-lg">
        <Field label="File name">
          <Input v-model="editFileName" />
        </Field>
        <div class="grid-2" style="gap: 12px">
          <Field label="Extend expiration">
            <select v-model="editExpiresIn" class="select">
              <option v-for="o in EXPIRATION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </Field>
          <Field label="Download limit">
            <div class="row" style="gap: 6px">
              <Input
                v-model="editLimit"
                type="number"
                :min="1"
                :max="1000"
                mono
                :disabled="editLimitMode === 'unlimited'"
              />
              <Toggle :model-value="editLimitMode === 'unlimited'" @update:model-value="(v) => (editLimitMode = v ? 'unlimited' : 'count')">∞</Toggle>
            </div>
          </Field>
        </div>
        <div>
          <Toggle v-if="editTarget.hasPassword" v-model="editRemovePwd" label="Remove password" />
          <Field v-if="!editRemovePwd" :label="editTarget.hasPassword ? 'Change password' : 'Add password'" hint="Leave blank to keep current">
            <Input v-model="editNewPwd" type="password" :minlength="4" placeholder="••••••••" />
          </Field>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="editTarget = null">Cancel</Button>
        <Button variant="primary" :disabled="editSaving" @click="saveEdit">
          {{ editSaving ? 'Saving…' : 'Save changes' }}
        </Button>
      </template>
    </Modal>

    <ConfirmDialog
      :open="deleteTarget != null"
      title="Delete this file?"
      :message="deleteTarget ? `Are you sure you want to delete \u201C${deleteTarget.fileName}\u201D? This action cannot be undone.` : ''"
      confirm-label="Delete"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
