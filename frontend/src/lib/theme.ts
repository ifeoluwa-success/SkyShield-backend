export type AppTheme = 'dark' | 'light';

/** Default light; only `dark` / `light` from storage are accepted. */
export function readStoredTheme(): AppTheme {
  const raw = localStorage.getItem('ss-theme');
  if (raw === 'dark' || raw === 'light') return raw;
  return 'light';
}

/** Syncs design tokens (`:root.light`) and Tailwind `dark:` (`.dark` on `html`). */
export function applyThemeToDocument(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('ss-theme', theme);
}
