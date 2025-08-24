import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import IndustryPage from './pages/IndustryPage';
import PilotsReferralsPage from './pages/PilotsReferralsPage';
import FaqPage from './pages/FaqPage';
import AboutPage from './pages/AboutPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import PilotSignupPage from './pages/PilotSignupPage';
import ReferralSignupPage from './pages/ReferralSignupPage';
import EditorSignupPage from './pages/EditorSignupPage';
import AdminDashboard from './pages/AdminDashboardNew';
import ClientDashboard from './pages/ClientDashboard';
import PilotDashboard from './pages/PilotDashboard';
import EditorDashboard from './pages/EditorDashboard';


import ReferralDashboard from './pages/ReferralDashboard';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './contexts/AuthContext';
import WelcomePage from './pages/WelcomePage';

const RequireAuth: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};



function App() {
  return (
    <Routes>
      {/* Standalone public pages without layout */}
      <Route index element={<WelcomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="pilot-signup" element={<PilotSignupPage />} />
      <Route path="referral-signup" element={<ReferralSignupPage />} />
      <Route path="editor-signup" element={<EditorSignupPage />} />
      {/* Public and protected routes with header and footer */}
      <Route element={<Layout />}>
        {/* Layout-wrapped protected routes */}

        {/* Protected marketing site routes: must be authenticated */}
        <Route element={<RequireAuth />}>
          <Route path="home" element={<HomePage />} />
          <Route path="industries/:industry" element={<IndustryPage />} />
          <Route path="pilots-referrals" element={<PilotsReferralsPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Route>

      {/* Dashboard routes without header and footer */}
      <Route path="admin/*" element={<AdminDashboard />} />
      <Route path="client/*" element={<ClientDashboard />} />
      <Route path="pilot/*" element={<PilotDashboard />} />
      <Route path="referral/*" element={<ReferralDashboard />} />
      <Route path="editor/*" element={<EditorDashboard />} />
      
      {/* Payment callback route */}
      <Route path="payment/callback" element={<PaymentCallbackPage />} />
      
      {/* 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;