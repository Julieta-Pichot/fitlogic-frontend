import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authService, getStoredToken, setStoredToken } from '@/services/api';
import type { AuthUser, LoginPayload, LoginResult, UserRole } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  roleKey: UserRole | null;
  displayName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isCheckingAuth = useRef(false);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setLoading(false);
    isCheckingAuth.current = false;
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (isCheckingAuth.current) return;

    isCheckingAuth.current = true;

    try {
      setLoading(true);
      const response = await authService.me();
      setUser(response.data?.user ?? null);
    } catch {
      logout();
    } finally {
      setLoading(false);
      isCheckingAuth.current = false;
    }
  }, [logout]);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setStoredToken(token);
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const response = await authService.login(payload);
      const nextUser = response.data?.user ?? null;
      setUser(nextUser);
      setLoading(false);
      return { success: true, message: response.message, user: nextUser };
    } catch (error) {
      logout();
      const message =
        axiosErrorMessage(error) ?? 'No se pudo iniciar sesión';
      return { success: false, message, user: null };
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      refreshUser,
      roleKey: user?.roleKey ?? null,
      displayName: user ? `${user.nombre} ${user.apellido}`.trim() : '',
    }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function axiosErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  return null;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
