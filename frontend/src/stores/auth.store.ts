import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PublicUser, LoginBody, SignupBody, ForgotPasswordBody, ResetPasswordBody } from '@filedrop/shared';
import { authApi } from '@/api/auth.api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<PublicUser | null>(null);
  const isInitialized = ref(false);
  const loading = ref(false);

  const isAuthenticated = computed(() => user.value != null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const displayName = computed(() => {
    if (!user.value) return '';
    return user.value.firstName || user.value.email.split('@')[0];
  });

  async function init() {
    if (isInitialized.value) return;
    try {
      user.value = await authApi.me();
    } catch {
      user.value = null;
    } finally {
      isInitialized.value = true;
    }
    // global 401 hook
    window.addEventListener('filedrop:unauthorized', () => {
      user.value = null;
    });
  }

  async function login(body: LoginBody) {
    loading.value = true;
    try {
      user.value = await authApi.login(body);
    } finally {
      loading.value = false;
    }
  }

  async function signup(body: SignupBody) {
    loading.value = true;
    try {
      user.value = await authApi.signup(body);
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      user.value = null;
    }
  }

  async function logoutAll() {
    try {
      await authApi.logoutAll();
    } finally {
      user.value = null;
    }
  }

  function forgotPassword(body: ForgotPasswordBody) {
    return authApi.forgotPassword(body);
  }
  function resetPassword(body: ResetPasswordBody) {
    return authApi.resetPassword(body);
  }

  return {
    user,
    isInitialized,
    loading,
    isAuthenticated,
    isAdmin,
    displayName,
    init,
    login,
    signup,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
  };
});
