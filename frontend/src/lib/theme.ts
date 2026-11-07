export const THEME_STORAGE_KEY = 'insightlens-theme';

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong
 * theme. A saved choice wins; without one the page follows the system setting,
 * including when it changes while the page is open.
 */
export const themeScript = `(function () {
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function saved() {
    try { return localStorage.getItem('${THEME_STORAGE_KEY}'); } catch (e) { return null; }
  }
  function apply() {
    var theme = saved();
    document.documentElement.classList.toggle('dark', theme ? theme === 'dark' : media.matches);
  }
  apply();
  media.addEventListener('change', apply);
})();`;

export function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private windows); the choice then lasts for this page only.
  }
}
