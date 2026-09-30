import { Moon, Sun } from 'lucide-react';
import { useLearningData } from '../data/LearningContext';

export default function ThemeToggle({ large = false }: { large?: boolean }) {
  const { preferences, updatePreferences } = useLearningData();
  const dark = preferences.darkMode;

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
      onClick={() => updatePreferences({ darkMode: !dark })}
      className={`theme-toggle${large ? ' theme-toggle--large' : ''}`}
      data-dark={dark}
    >
      <span className="theme-toggle__thumb" aria-hidden="true" />
      <Sun className="theme-toggle__sun" aria-hidden="true" />
      <Moon className="theme-toggle__moon" aria-hidden="true" />
    </button>
  );
}
