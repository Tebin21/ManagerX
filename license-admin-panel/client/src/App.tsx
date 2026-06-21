import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GenerateLicensePage } from './pages/GenerateLicensePage';
import { LicensesPage } from './pages/LicensesPage';
import { LicenseDetailPage } from './pages/LicenseDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { GenerateOnlineStoreSubscriptionPage } from './pages/GenerateOnlineStoreSubscriptionPage';
import { OnlineStoreSubscriptionsPage } from './pages/OnlineStoreSubscriptionsPage';

function ProtectedShell() {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  if (status === 'unauthed') {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/generate" element={<GenerateLicensePage />} />
            <Route path="/licenses" element={<LicensesPage />} />
            <Route path="/licenses/:id" element={<LicenseDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/online-store-subscriptions/generate" element={<GenerateOnlineStoreSubscriptionPage />} />
            <Route path="/online-store-subscriptions" element={<OnlineStoreSubscriptionsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
