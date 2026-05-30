import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRule } from '../types/rules';
import { loadRules, saveRules } from '../lib/rulesEngine';

interface RulesCtx {
  rules: UserRule[];
  setRules: (rules: UserRule[]) => void;
}

const RulesContext = createContext<RulesCtx>({ rules: [], setRules: () => {} });

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRulesState] = useState<UserRule[]>(() => loadRules());

  function setRules(r: UserRule[]) {
    setRulesState(r);
    saveRules(r);
  }

  return <RulesContext.Provider value={{ rules, setRules }}>{children}</RulesContext.Provider>;
}

export const useRules = () => useContext(RulesContext);
