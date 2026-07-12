import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const THEME_STORAGE_KEY = 'multidrop.theme';
const THEME_VALUES = new Set(['dark', 'light']);

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (THEME_VALUES.has(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function AppLayout() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`theme-${theme} min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30`}>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main className="grow pb-24">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
