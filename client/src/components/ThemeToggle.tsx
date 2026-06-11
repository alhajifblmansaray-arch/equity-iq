import { Moon, Sun } from '../lib/icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { theme, toggle } = useTheme();
  const px = size === 'md' ? 'p-2.5' : 'p-2';
  const icon = size === 'md' ? 16 : 14;
  return (
    <button
      onClick={toggle}
      className={`${px} rounded-full text-ink-tertiary hover:text-ink hover:bg-cream-tint transition`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={icon} weight="regular" /> : <Sun size={icon} weight="fill" />}
    </button>
  );
}
