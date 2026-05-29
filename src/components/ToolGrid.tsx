import { useState } from 'react';
import type { Tool } from '../types';
import { ToolCard } from './ToolCard';

const CATEGORIES = ['Transform', 'File Operations', 'Analysis', 'Cleaning'];

interface Props {
  tools: Tool[];
  onSelectTool: (id: string) => void;
}

export function ToolGrid({ tools, onSelectTool }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? tools.filter(t => {
        const q = query.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords.some(k => k.includes(q))
        );
      })
    : null;

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
          Tabula
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
          A local-first spreadsheet toolkit. Your data never leaves the browser.
        </p>
        <div className="mt-6 max-w-md mx-auto relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tools…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Search results */}
      {filtered ? (
        filtered.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 py-16">No tools match "{query}"</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => <ToolCard key={t.id} tool={t} onSelect={onSelectTool} />)}
          </div>
        )
      ) : (
        CATEGORIES.map(cat => {
          const catTools = tools.filter(t => t.category === cat);
          if (catTools.length === 0) return null;
          return (
            <section key={cat} className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catTools.map(t => <ToolCard key={t.id} tool={t} onSelect={onSelectTool} />)}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
