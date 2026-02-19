import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Playbook } from './pages/Playbook';
import { ServiceList } from './pages/ServiceList';
import { Profile } from './pages/Profile';
import { MerchantProfile } from './pages/MerchantProfile';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { SubmitTask } from './pages/SubmitTask';

function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes for Students/Merchants */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/dining" element={<ServiceList category="Food" title="Dining" />} />
            <Route path="/print" element={<ServiceList category="Stationary" title="Print & Stationaries" />} />
            <Route path="/travel" element={<ServiceList category="Travel" title="Campus Travel" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/submit-task" element={<SubmitTask />} />
            <Route path="/orders" element={<Orders />} />
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
      </OrderProvider>
    </AuthProvider>
  );
}

export default App;
