import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, MessageSquare, Settings, LogOut, ChevronRight } from 'lucide-react';
import axios from 'axios';

const ReferralDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Basic auth check: verify token, redirect to login if invalid
  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        await axios.get('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        navigate('/login', { replace: true });
      }
    };
    verify();
  }, [navigate]);

  const menuItems = [
    { path: '/referral', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent /> },
    { path: '/referral/leads', icon: <Users size={20} />, label: 'My Leads', component: <LeadsContent /> },
    { path: '/referral/messages', icon: <MessageSquare size={20} />, label: 'Messages', component: <MessagesContent /> },
    { path: '/referral/settings', icon: <Settings size={20} />, label: 'Settings', component: <SettingsContent /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-primary-950 text-white ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
        <div className="p-4 border-b border-primary-800">
          <h2 className={`font-heading font-bold ${isSidebarOpen ? 'text-xl' : 'text-center text-2xl'}`}>
            {isSidebarOpen ? 'HMX Referral' : 'HMX'}
          </h2>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-900 text-white'
                  : 'text-gray-300 hover:bg-primary-900 hover:text-white'
              }`}
            >
              {item.icon}
              {isSidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-primary-900 hover:text-white transition-colors mt-4"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-heading font-bold text-gray-900">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h1>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-50"
            >
              <ChevronRight size={20} className={`transform transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <Routes>
            {menuItems.map((item) => (
              <Route key={item.path} path={item.path.replace('/referral', '')} element={item.component} />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  );
};

const DashboardContent: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Total Referrals', value: 0 },
        { label: 'Conversions', value: 0 },
        { label: 'Pending Leads', value: 0 },
        { label: 'Earnings', value: '₹0' },
      ].map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <h3 className="mt-2 text-gray-500 text-sm font-medium">{stat.label}</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        <p className="text-gray-500 text-center py-4">No recent activity to show</p>
      </div>
    </div>
  </div>
);

const LeadsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">My Leads</h2>
    <div className="text-center text-gray-500 py-8">No leads yet</div>
  </div>
);

const MessagesContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
    <div className="text-center text-gray-500 py-8">No messages to display</div>
  </div>
);

const SettingsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
    <div className="text-center text-gray-500 py-8">No settings available</div>
  </div>
);

export default ReferralDashboard;
