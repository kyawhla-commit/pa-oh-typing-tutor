import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import './theme-toggle.css';

export default function TutorThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#f8fafc');
  }, [dark]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'typing-tutor.theme') setDark(event.newValue === 'dark');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <button type="button" role="switch" aria-label="Dark mode" aria-checked={dark}
    title={`Switch to ${dark ? 'light' : 'dark'} mode`} className="theme-toggle" data-dark={dark}
    onClick={() => {
      setDark(!dark);
      try { localStorage.setItem('typing-tutor.theme', dark ? 'light' : 'dark'); } catch { /* Keep the toggle usable when storage is unavailable. */ }
    }}>
    <span className="theme-toggle__thumb" aria-hidden="true" />
    <Sun className="theme-toggle__sun" aria-hidden="true" />
    <Moon className="theme-toggle__moon" aria-hidden="true" />
  </button>;
}
