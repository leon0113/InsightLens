'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { setTheme } from '@/lib/theme';

// The <html> class is the single source of truth, set by the theme script
// before React loads. The toggle reads it and re-renders when it changes.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

const isDarkInBrowser = () =>
  document.documentElement.classList.contains('dark');
const isDarkOnServer = () => false;

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribe,
    isDarkInBrowser,
    isDarkOnServer,
  );
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
