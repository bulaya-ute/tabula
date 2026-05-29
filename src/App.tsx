import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { UnderConstructionModal } from './components/UnderConstructionModal';
import { ToastProvider } from './context/ToastContext';
import { TOOLS } from './tools';
import type { ComponentType, Theme } from './types';

function ActiveTool({ component: C }: { component: ComponentType }) {
  return <C />;
}

const getHashView = () => window.location.hash.replace(/^#/, '') || 'home';

export default function App() {
  const [view, setView] = useState<string>(getHashView);
  const [stubModal, setStubModal] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('tb-theme') as Theme) ?? 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tb-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = () => setView(getHashView());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const activeTool  = TOOLS.find(t => t.id === view && !t.stub) ?? null;
  const navigateHome = () => { window.location.hash = ''; };
  const selectTool   = (id: string) => {
    const tool = TOOLS.find(t => t.id === id);
    if (!tool) return;
    if (tool.stub) { setStubModal(tool.name); return; }
    window.location.hash = id;
  };
  const toggleTheme  = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white">
        <Header
          activeTool={activeTool}
          onNavigateHome={navigateHome}
          onSelectTool={selectTool}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {activeTool
          ? <ActiveTool component={activeTool.component!} />
          : <ToolGrid tools={TOOLS} onSelectTool={selectTool} />
        }
        {stubModal && (
          <UnderConstructionModal name={stubModal} onClose={() => setStubModal(null)} />
        )}
      </div>
    </ToastProvider>
  );
}
