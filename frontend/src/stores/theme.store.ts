import { defineStore } from 'pinia';
import { ref } from 'vue';

type ThemeMode = 'light' | 'dark';
type AccentName = 'orange' | 'green' | 'blue' | 'violet';

const THEME_KEY = 'fd_theme';
const ACCENT_KEY = 'fd_accent';

function readInitial<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>(readInitial(THEME_KEY, 'light', ['light', 'dark']));
  const accent = ref<AccentName>(readInitial(ACCENT_KEY, 'orange', ['orange', 'green', 'blue', 'violet']));

  function setTheme(v: ThemeMode) {
    theme.value = v;
  }
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }
  function setAccent(v: AccentName) {
    accent.value = v;
  }
  function applyToDom() {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme.value;
    document.documentElement.dataset.accent = accent.value;
  }
  function persist() {
    try {
      localStorage.setItem(THEME_KEY, theme.value);
      localStorage.setItem(ACCENT_KEY, accent.value);
    } catch {
      // ignore
    }
  }

  return { theme, accent, setTheme, toggleTheme, setAccent, applyToDom, persist };
});
