import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DarkModeToggle() {
  const { darkMode, setDarkMode } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-full hover:bg-[var(--bg2)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      title={darkMode ? t('light_mode') : t('dark_mode')}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-slate-600" />
      )}
    </button>
  );
}
