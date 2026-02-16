import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Ernest } from './pages/Ernest';
import { Marketplace } from './pages/Marketplace';
import { Profile } from './pages/Profile';
import { MerchantProfile } from './pages/MerchantProfile';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes for Students/Merchants */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/ernest" element={<Ernest />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/merchant-dashboard" element={<MerchantDashboard />} />
            <Route path="/merchant/:id" element={<MerchantProfile />} />
          </Route>
        </Route>

        {/* Admin Route - Also uses AppLayout but restricted to admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
           <Route element={<AppLayout />}>
             <Route path="/admin" element={<AdminDashboard />} />
           </Route>
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
