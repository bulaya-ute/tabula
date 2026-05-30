import { useEffect, useRef, useState } from 'react';
import { TOOLS } from '../tools';
import type { Theme, Tool } from '../types';

interface Props {
  activeTool: Tool | null;
  onNavigateHome: () => void;
  onSelectTool: (id: string) => void;
  onOpenRulesLibrary: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ activeTool, onNavigateHome, onSelectTool, onOpenRulesLibrary, theme, onToggleTheme }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery]             = useState('');
  const [cursor, setCursor]           = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = TOOLS.filter(t => {
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some(k => k.includes(q))
    );
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (paletteOpen) { setTimeout(() => inputRef.current?.focus(), 50); setCursor(0); }
    else setQuery('');
  }, [paletteOpen]);

  const pick = (id: string) => { setPaletteOpen(false); onSelectTool(id); };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && filtered[cursor]) pick(filtered[cursor].id);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onNavigateHome} className="font-bold text-slate-900 dark:text-white text-sm shrink-0 hover:opacity-75 transition-opacity">
              Tabula
            </button>
            {activeTool && (
              <>
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{activeTool.name}</span>
              </>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {!activeTool && (
              <nav className="hidden sm:flex items-center gap-1 mr-2">
                {['Transform', 'File Operations', 'Analysis', 'Cleaning'].map(cat => (
                  <button
                    key={cat}
                    onClick={onNavigateHome}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            )}

            <button
              onClick={onOpenRulesLibrary}
              className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors hidden sm:block"
              title="Rules Library"
            >
              Rules
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light'
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              }
            </button>
          </div>
        </div>
      </header>

      {/* Search palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search tools…"
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={handleKey}
                className="flex-1 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 outline-none text-sm"
              />
              <kbd className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0
                ? <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">No results</p>
                : filtered.map((t, i) => (
                  <li key={t.id}>
                    <button
                      onClick={() => pick(t.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors
                        ${i === cursor ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <t.icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium text-slate-800 dark:text-white ${t.stub ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                          {t.name} {t.stub && <span className="text-xs font-normal text-slate-400">(coming soon)</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{t.description}</p>
                      </div>
                    </button>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
