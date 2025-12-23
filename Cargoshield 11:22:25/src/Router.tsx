import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import DashboardPage from './pages/DashboardPage';
import DriverDashboardPage from './pages/DriverDashboardPage';
import CDLUploadPage from './pages/CDLUploadPage';
import LoadVerificationPage from './pages/LoadVerificationPage';
import LoadVerificationFlowPage from './pages/LoadVerificationFlowPage';
import DeliveryVerificationPage from './pages/DeliveryVerificationPage';
import ManageLoadsPage from './pages/ManageLoadsPage';
import AdminInvitesPage from './pages/AdminInvitesPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function Router() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setForceUpdate((prev) => prev + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPath === '/login') {
    return <LoginPage key={`login-${forceUpdate}`} />;
  }

  if (currentPath === '/signup') {
    return <SignUpPage key={`signup-${forceUpdate}`} />;
  }

  if (currentPath === '/invite') {
    return <AcceptInvitePage key={`invite-${forceUpdate}`} />;
  }

  if (currentPath === '/dashboard') {
    return (
      <ProtectedRoute>
        <DashboardPage key={`dashboard-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/onboarding/cdl') {
    return (
      <ProtectedRoute>
        <CDLUploadPage key={`cdl-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/loads/verify') {
    return (
      <ProtectedRoute>
        <LoadVerificationPage key={`verify-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/loads/manage') {
    return (
      <ProtectedRoute>
        <ManageLoadsPage key={`manage-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/driver/dashboard') {
    return (
      <>
        <Navigation />
        <ProtectedRoute>
          <DriverDashboardPage key={`driver-dashboard-${forceUpdate}`} />
        </ProtectedRoute>
      </>
    );
  }

  if (currentPath.startsWith('/loads/verify/')) {
    return (
      <ProtectedRoute>
        <LoadVerificationFlowPage key={`verify-flow-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/verify-delivery/')) {
    return (
      <ProtectedRoute>
        <DeliveryVerificationPage key={`delivery-verify-${forceUpdate}`} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin/invites') {
    return (
      <>
        <Navigation />
        <ProtectedRoute>
          <AdminInvitesPage key={`admin-invites-${forceUpdate}`} />
        </ProtectedRoute>
      </>
    );
  }

  if (currentPath === '/admin/companies') {
    return (
      <>
        <Navigation />
        <ProtectedRoute>
          <AdminCompaniesPage key={`admin-companies-${forceUpdate}`} />
        </ProtectedRoute>
      </>
    );
  }

  if (currentPath.startsWith('/admin/companies/')) {
    return (
      <>
        <Navigation />
        <ProtectedRoute>
          <CompanyDetailsPage key={`company-details-${forceUpdate}`} />
        </ProtectedRoute>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <LandingPage />
    </>
  );
}
