import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type CMUser } from '../lib/api';

interface Toast { id: number; kind: 'success' | 'error' | 'info'; message: string; }
interface StoreShape {
  user: CMUser | null;
  login: (u: CMUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toasts: Toast[];
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
}

const StoreCtx = createContext<StoreShape | null>(null);
let toastId = 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CMUser | null>(() => {
    try {
      const raw = localStorage.getItem('cm_session');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authOpen, setAuthOpen] = useState(false);

  const toast = (message: string, kind: Toast['kind'] = 'info') => {
    const id = toastId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const login = (u: CMUser) => {
    setUser(u);
    localStorage.setItem('cm_session', JSON.stringify(u));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('cm_session');
    toast('Logged out. Prices are now hidden — log in to shop.', 'info');
  };
  const refreshUser = async () => {
    if (!user) return;
    try {
      const fresh = await api.getUser(user.id);
      login(fresh);
    } catch { /* keep cached */ }
  };

  useEffect(() => { refreshUser(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StoreCtx.Provider value={{ user, login, logout, refreshUser, toasts, toast, dismissToast, authOpen, setAuthOpen }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
