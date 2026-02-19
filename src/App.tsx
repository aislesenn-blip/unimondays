import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';

// Lazy Load Core Pages
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Playbook = lazy(() => import('./pages/Playbook').then(module => ({ default: module.Playbook })));
const ServiceList = lazy(() => import('./pages/ServiceList').then(module => ({ default: module.ServiceList })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const MerchantProfile = lazy(() => import('./pages/MerchantProfile').then(module => ({ default: module.MerchantProfile })));
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard').then(module => ({ default: module.MerchantDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Checkout = lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })));
const Orders = lazy(() => import('./pages/Orders').then(module => ({ default: module.Orders })));
const SubmitTask = lazy(() => import('./pages/SubmitTask').then(module => ({ default: module.SubmitTask })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
      </OrderProvider>
    </AuthProvider>
  );
}

export default App;
