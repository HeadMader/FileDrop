<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { AdminUploadItem } from '@filedrop/shared';
import { useAdminStore } from '@/stores/admin.store';
import { useToastStore } from '@/stores/toast.store';
import { formatBytes, formatDate, formatRelative } from '@/utils/format';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Badge from '@/components/ui/Badge.vue';
import Input from '@/components/ui/Input.vue';
import Segmented from '@/components/ui/Segmented.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import MiniBarChart from '@/components/ui/MiniBarChart.vue';
import MiniLineChart from '@/components/ui/MiniLineChart.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import Toggle from '@/components/ui/Toggle.vue';
import Spinner from '@/components/ui/Spinner.vue';

const store = useAdminStore();
const toast = useToastStore();

type Tab = 'overview' | 'files' | 'users';
const tab = ref<Tab>('overview');

const fileSearchInput = ref('');
const userSearchInput = ref('');
let ft: ReturnType<typeof setTimeout> | null = null;
let ut: ReturnType<typeof setTimeout> | null = null;

watch(fileSearchInput, (v) => {
  if (ft) clearTimeout(ft);
  ft = setTimeout(() => {
    store.filesSearch = v;
    store.filesPage = 1;
    store.fetchFiles();
  }, 250);
});
watch(userSearchInput, (v) => {
  if (ut) clearTimeout(ut);
  ut = setTimeout(() => {
    store.usersSearch = v;
    store.usersPage = 1;
    store.fetchUsers();
  }, 250);
});

onMounted(() => store.fetchOverview());

watch(tab, (t) => {
  if (t === 'overview' && !store.stats) store.fetchOverview();
  if (t === 'files' && store.files.length === 0) store.fetchFiles();
  if (t === 'users' && store.users.length === 0) store.fetchUsers();
});

const deleteTarget = ref<AdminUploadItem | null>(null);
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

const cards = computed(() => {
  const s = store.stats;
  return [
    { label: 'Total files', value: s?.totalFiles ?? 0, sub: `${s?.activeFiles ?? 0} active`, icon: 'database' as const },
    { label: 'Users', value: s?.totalUsers ?? 0, sub: `${s?.totalAdmins ?? 0} admins`, icon: 'users' as const },
    { label: 'Storage', value: s ? formatBytes(s.totalStorageBytes) : '0 B', sub: s ? `avg ${formatBytes(s.avgFileSizeBytes)}` : '', icon: 'bar' as const },
    { label: 'Downloads', value: s?.totalDownloads ?? 0, sub: `${s?.downloadsToday ?? 0} today`, icon: 'download' as const },
  ];
});
</script>

<template>
  <div class="container container-wide" style="padding: 32px 24px">
    <div class="row-between" style="margin-bottom: 16px">
      <div>
        <div class="row" style="gap: 8px; align-items: center">
          <h1 class="h2" style="margin: 0">Admin</h1>
          <Badge tone="accent" mono>ADMIN</Badge>
        </div>
        <p class="muted" style="font-size: 13px; margin-top: 4px">
          System overview, files, and users.
        </p>
      </div>
      <Button variant="secondary" @click="store.exportCsv(tab === 'users' ? 'users' : 'files')">
        <template #icon><Icon name="download" :size="13" /></template>
        Export {{ tab === 'users' ? 'users' : 'files' }} CSV
      </Button>
    </div>

    <div style="margin-bottom: 20px">
      <Segmented
        v-model="tab"
        :options="[
          { value: 'overview', label: 'Overview' },
          { value: 'files', label: 'Files' },
          { value: 'users', label: 'Users' },
        ]"
      />
    </div>

    <!-- Overview -->
    <div v-if="tab === 'overview'" class="stack-lg">
      <div class="grid-4" style="gap: 12px">
        <Card v-for="c in cards" :key="c.label" pad="sm">
          <div class="row" style="gap: 10px">
            <div
              style="width: 32px; height: 32px; border-radius: var(--r-md); background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; border: 1px solid var(--accent-soft-border)"
            >
              <Icon :name="c.icon" :size="14" />
            </div>
            <div style="flex: 1; min-width: 0">
              <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">
                {{ c.label }}
              </div>
              <div style="font-size: 18px; font-weight: 600; margin-top: 2px">{{ c.value }}</div>
              <div v-if="c.sub" class="subtle" style="font-size: 11px">{{ c.sub }}</div>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid-2" style="gap: 12px">
        <Card pad="lg">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px">Uploads / day</div>
          <MiniBarChart v-if="store.stats" :data="store.stats.uploadsPerDay" label="Uploads" :height="140" />
        </Card>
        <Card pad="lg">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px">Downloads / day</div>
          <MiniLineChart v-if="store.stats" :data="store.stats.downloadsPerDay" :height="140" />
        </Card>
      </div>

      <Card pad="lg" v-if="store.health">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px">System health</div>
        <div class="grid-4" style="gap: 12px">
          <div>
            <div class="muted" style="font-size: 11px; text-transform: uppercase">Uptime</div>
            <div class="mono" style="font-size: 14px; margin-top: 2px">{{ store.health.uptime }}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 11px; text-transform: uppercase">Cleanup queue</div>
            <div class="mono" style="font-size: 14px; margin-top: 2px">{{ store.health.cleanupQueueSize }}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 11px; text-transform: uppercase">Storage</div>
            <div class="mono" style="font-size: 14px; margin-top: 2px">
              {{ formatBytes(store.health.storageUsedBytes) }} / {{ formatBytes(store.health.storageTotalBytes) }}
            </div>
          </div>
          <div>
            <div class="muted" style="font-size: 11px; text-transform: uppercase">DB pool</div>
            <div class="mono" style="font-size: 14px; margin-top: 2px">
              {{ store.health.dbActiveConnections }} / {{ store.health.dbConnectionPoolSize }}
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Files -->
    <Card v-else-if="tab === 'files'" pad="lg">
      <div class="row" style="gap: 8px; margin-bottom: 12px; flex-wrap: wrap">
        <div style="flex: 1; min-width: 200px; position: relative">
          <Icon
            name="search"
            :size="13"
            style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none"
          />
          <Input v-model="fileSearchInput" placeholder="Search by file or uploader…" style="padding-left: 30px" />
        </div>
        <Toggle
          :model-value="store.filesAnon"
          @update:model-value="(v) => { store.filesAnon = v; store.filesPage = 1; store.fetchFiles(); }"
          label="Anonymous only"
        />
        <select
          class="select"
          :value="store.filesSort"
          @change="(e) => { store.filesSort = (e.target as HTMLSelectElement).value as never; store.fetchFiles(); }"
          style="max-width: 160px"
        >
          <option value="newest">Newest</option>
          <option value="largest">Largest</option>
          <option value="most">Most downloaded</option>
        </select>
      </div>

      <div v-if="store.filesLoading" style="padding: 40px; display: flex; justify-content: center">
        <Spinner :size="28" />
      </div>

      <EmptyState
        v-else-if="store.files.length === 0"
        icon="file"
        title="No files match"
        message="Try a different search."
      />

      <table v-else class="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Uploader</th>
            <th>Size</th>
            <th>Downloads</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in store.files" :key="f.id">
            <td>
              <div class="row" style="gap: 10px; min-width: 0">
                <FileTypeIcon :mime-type="f.mimeType" :size="16" />
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px">
                  {{ f.fileName }}
                </span>
              </div>
            </td>
            <td>
              <span v-if="f.uploaderEmail" style="font-size: 12px">{{ f.uploaderEmail }}</span>
              <Badge v-else outline mono>anon</Badge>
            </td>
            <td class="mono">{{ formatBytes(f.fileSize) }}</td>
            <td class="mono">{{ f.downloadCount }}</td>
            <td>
              <span class="muted" style="font-size: 12px">{{ formatRelative(f.createdAt) }}</span>
            </td>
            <td>
              <IconButton icon="trash" :icon-size="13" label="Delete" @click="deleteTarget = f" />
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.filesTotalPages > 1" class="row-between" style="margin-top: 16px">
        <div class="muted" style="font-size: 12px">{{ store.filesTotal }} files</div>
        <Pagination
          :page="store.filesPage"
          :total-pages="store.filesTotalPages"
          @change="(p) => { store.filesPage = p; store.fetchFiles(); }"
        />
      </div>
    </Card>

    <!-- Users -->
    <Card v-else-if="tab === 'users'" pad="lg">
      <div class="row" style="gap: 8px; margin-bottom: 12px; flex-wrap: wrap">
        <div style="flex: 1; min-width: 200px; position: relative">
          <Icon
            name="search"
            :size="13"
            style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none"
          />
          <Input v-model="userSearchInput" placeholder="Search by email or name…" style="padding-left: 30px" />
        </div>
        <select
          class="select"
          :value="store.usersSort"
          @change="(e) => { store.usersSort = (e.target as HTMLSelectElement).value as never; store.fetchUsers(); }"
          style="max-width: 160px"
        >
          <option value="newest">Newest</option>
          <option value="uploads">Most uploads</option>
          <option value="storage">Most storage</option>
        </select>
      </div>

      <div v-if="store.usersLoading" style="padding: 40px; display: flex; justify-content: center">
        <Spinner :size="28" />
      </div>

      <EmptyState
        v-else-if="store.users.length === 0"
        icon="users"
        title="No users"
        message="No users match the current filter."
      />

      <table v-else class="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Uploads</th>
            <th>Downloads</th>
            <th>Storage</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.users" :key="u.id">
            <td>
              <div>
                <div style="font-weight: 500; font-size: 13px">
                  {{ u.firstName || '' }} {{ u.lastName || '' }}
                </div>
                <div class="muted" style="font-size: 11px">{{ u.email }}</div>
              </div>
            </td>
            <td>
              <Badge :tone="u.role === 'ADMIN' ? 'accent' : 'default'" mono>{{ u.role }}</Badge>
            </td>
            <td class="mono">{{ u.uploadCount }}</td>
            <td class="mono">{{ u.totalDownloads }}</td>
            <td class="mono">{{ formatBytes(u.storageUsedBytes) }}</td>
            <td>
              <span class="muted" style="font-size: 12px">{{ formatDate(u.createdAt) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.usersTotalPages > 1" class="row-between" style="margin-top: 16px">
        <div class="muted" style="font-size: 12px">{{ store.usersTotal }} users</div>
        <Pagination
          :page="store.usersPage"
          :total-pages="store.usersTotalPages"
          @change="(p) => { store.usersPage = p; store.fetchUsers(); }"
        />
      </div>
    </Card>

    <ConfirmDialog
      :open="deleteTarget != null"
      title="Delete this file?"
      :message="deleteTarget ? `Permanently delete \u201C${deleteTarget.fileName}\u201D? This cannot be undone.` : ''"
      confirm-label="Delete"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
