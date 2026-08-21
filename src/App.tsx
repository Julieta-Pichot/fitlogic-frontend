import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { ClientDashboard } from '@/components/client/client-dashboard';
import { TrainerDashboard } from '@/components/trainer/trainer-dashboard';
import { ReceptionistDashboard } from '@/components/receptionist/receptionist-dashboard';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { setNavigateFunction } from '@/services/api';
import type { UserRole } from '@/types';

function NavigateSetter() {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigateFunction(navigate);
  }, [navigate]);

  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Cargando...</div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles = null,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[] | null;
}) {
  const { isAuthenticated, loading, roleKey } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && roleKey && !allowedRoles.includes(roleKey)) {
    return <Navigate to={roleHomePath(roleKey)} replace />;
  }

  return children;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, roleKey } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    if (roleKey) return <Navigate to={roleHomePath(roleKey)} replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
}

function roleHomePath(roleKey: UserRole) {
  const map: Record<UserRole, string> = {
    cliente: '/home/cliente',
    profesor: '/home/profesor',
    recepcionista: '/home/recepcionista',
    admin: '/home/admin',
  };

  return map[roleKey];
}

function RoleHomeRedirect() {
  const { roleKey } = useAuth();

  if (!roleKey) return <Navigate to="/login" replace />;
  return <Navigate to={roleHomePath(roleKey)} replace />;
}

function ClienteHomePage() {
  const { displayName, logout } = useAuth();
  return <ClientDashboard userName={displayName} onLogout={logout} />;
}

function ProfesorHomePage() {
  const { displayName, user, logout } = useAuth();
  return <TrainerDashboard userName={displayName} userId={user?.id} onLogout={logout} />;
}

function RecepcionistaHomePage() {
  const { displayName, logout } = useAuth();
  return <ReceptionistDashboard userName={displayName} onLogout={logout} />;
}

function AdminHomePage() {
  const { displayName, logout } = useAuth();
  return <AdminDashboard userName={displayName} onLogout={logout} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <RoleHomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/cliente"
        element={
          <ProtectedRoute allowedRoles={['cliente']}>
            <ClienteHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/profesor"
        element={
          <ProtectedRoute allowedRoles={['profesor']}>
            <ProfesorHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/recepcionista"
        element={
          <ProtectedRoute allowedRoles={['recepcionista']}>
            <RecepcionistaHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminHomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <NavigateSetter />
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </ConfigProvider>
  );
}
