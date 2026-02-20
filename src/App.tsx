import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { HODDashboard } from './pages/HODDashboard';
import { SecretaryDashboard } from './pages/SecretaryDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { CommitteeDashboard } from './pages/CommitteeDashboard';
import { Requests } from './pages/Requests';
import { Notices } from './pages/Notices';
import { Vault } from './pages/Vault';

const ProtectedRoute = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      );
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
  };

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/hod" element={<HODDashboard />} />
                <Route path="/dashboard/secretary" element={<SecretaryDashboard />} />
                <Route path="/dashboard/staff" element={<StaffDashboard />} />
                <Route path="/dashboard/committee" element={<CommitteeDashboard />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/vault" element={<Vault />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
