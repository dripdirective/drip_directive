import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { authAPI } from '../lib/api';
import { tokenStorage } from '../lib/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const hydrateSession = useEffectEvent(async () => {
    if (!token) {
      startTransition(() => setUser(null));
      setBooting(false);
      return;
    }

    try {
      const currentUser = await authAPI.getCurrentUser();
      startTransition(() => setUser(currentUser));
    } catch {
      tokenStorage.clear();
      setToken('');
      startTransition(() => setUser(null));
    } finally {
      setBooting(false);
    }
  });

  useEffect(() => {
    hydrateSession();
  }, [token]);

  async function completeAuth(flow) {
    const data = await flow();
    tokenStorage.set(data.access_token);
    setToken(data.access_token);
    const currentUser = await authAPI.getCurrentUser();
    startTransition(() => setUser(currentUser));
    return currentUser;
  }

  const value = useMemo(
    () => ({
      booting,
      isAuthenticated: Boolean(user),
      token,
      user,
      async login(email, password) {
        return completeAuth(() => authAPI.login(email, password));
      },
      async signup(email, password) {
        return completeAuth(() => authAPI.signup(email, password));
      },
      async refreshCurrentUser() {
        const currentUser = await authAPI.getCurrentUser();
        startTransition(() => setUser(currentUser));
        return currentUser;
      },
      logout() {
        tokenStorage.clear();
        setToken('');
        startTransition(() => setUser(null));
      },
    }),
    [booting, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
