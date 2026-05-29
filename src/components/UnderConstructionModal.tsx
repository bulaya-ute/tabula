interface Props {
  name: string;
  onClose: () => void;
}

export function UnderConstructionModal({ name, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{name}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This feature is under construction. Check back soon.
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
