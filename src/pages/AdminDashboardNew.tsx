import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  UserPlus,
  Video,
  DollarSign,
  Settings as SettingsIcon,
  HelpCircle,
  Loader2,
  Database,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HomeContent from '../components/admin/HomeContent';
import Orders from '../components/admin/Orders';
import EditorManagement from '../components/admin/EditorManagement';
import PilotManagement from '../components/admin/PilotManagement';
import UserManagement from '../components/admin/UserManagement';
import ClientDatabase from '../components/admin/ClientDatabase';
import Payments from '../components/admin/Payments';
import Cancellations from '../components/admin/Cancellations';
import NewInquiries from '../components/admin/NewInquiries';
import ReferralManagement from '../components/admin/ReferralManagement';
import VideoReviews from '../components/admin/VideoReviews';
import Settings from '../components/admin/Settings';
import Help from '../components/admin/Help';
import Applications from '../components/admin/Applications';

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        navigate('/login');
        return;
      }

      if (!user) {
        console.log('No user data, redirecting to login');
        navigate('/login');
        return;
      }

      if (user.role !== 'admin') {
        console.log('User is not admin, redirecting to appropriate dashboard');
        if (user.role === 'client') {
          navigate('/client');
        } else if (user.role === 'pilot') {
          navigate('/pilot');
        } else if (user.role === 'editor') {
          navigate('/editor');
        } else if (user.role === 'referral') {
          navigate('/referral');
        } else {
          navigate('/login');
        }
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/orders', icon: <FileText size={20} />, label: 'Orders' },
    { path: '/admin/editors', icon: <Users size={20} />, label: 'Editors' },
    { path: '/admin/pilots', icon: <UserPlus size={20} />, label: 'Pilots' },
    { path: '/admin/payments', icon: <DollarSign size={20} />, label: 'Payments' },
    { path: '/admin/cancellations', icon: <FileText size={20} />, label: 'Cancellations' },
    { path: '/admin/inquiries', icon: <MessageSquare size={20} />, label: 'Inquiries' },
    { path: '/admin/referrals', icon: <Users size={20} />, label: 'Referrals' },
    { path: '/admin/video-reviews', icon: <Video size={20} />, label: 'Video Reviews' },
    { path: '/admin/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
    { path: '/admin/database', icon: <Database size={20} />, label: 'Client Database' },
    { path: '/admin/applications', icon: <FileText size={20} />, label: 'Applications' }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-primary-600">Admin Panel</h1>
          {user && (
            <p className="text-sm text-gray-600 mt-1">
              Welcome, {user.contact_name || user.email}
            </p>
          )}
        </div>
        <nav className="mt-4 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 ${
                pathname === item.path ? 'bg-gray-100 border-r-4 border-primary-600' : ''
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            <LogOut size={20} />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<HomeContent />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/editors" element={<EditorManagement />} />
            <Route path="/pilots" element={<PilotManagement />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/cancellations" element={<Cancellations />} />
            <Route path="/inquiries" element={<NewInquiries />} />
            <Route path="/referrals" element={<ReferralManagement />} />
            <Route path="/video-reviews" element={<VideoReviews />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/database" element={<ClientDatabase />} />
            <Route path="/applications" element={<Applications />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
