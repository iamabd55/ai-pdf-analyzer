import { useLayoutEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply theme immediately to prevent flicker
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      aria-label="Toggle Dark Mode"
      className="
        flex items-center justify-center
        w-12 h-12 sm:w-10 sm:h-10
        p-2 rounded-full
        bg-gray-200 dark:bg-gray-800
        shadow-md dark:shadow-gray-900
        transition-colors duration-200
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400
      "
    >
      {isDark ? (
        <span className="material-symbols-outlined text-2xl sm:text-xl text-yellow-400">
          light_mode
        </span>
      ) : (
        <span className="material-symbols-outlined text-2xl sm:text-xl text-gray-700">
          dark_mode
        </span>
      )}
    </button>
  );
}
