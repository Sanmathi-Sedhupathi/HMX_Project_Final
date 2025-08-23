import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Settings, LogOut, BarChart3, MessageSquare, Award, MapPin, Menu, X, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { authService } from '../services/api';

const PilotDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeAssignments: 0,
    completedTours: 0,
    pendingMessages: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('User data received:', response.data);
        setUserData(response.data);
        await fetchStats();
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const bookings = response.data;
      const stats = {
        activeAssignments: bookings.filter((b: any) => b.status === 'in_progress').length,
        completedTours: bookings.filter((b: any) => b.status === 'completed').length,
        pendingMessages: 0, // This would come from a messages API
        totalEarnings: bookings
          .filter((b: any) => b.status === 'completed' && b.payment_status === 'paid')
          .reduce((sum: number, b: any) => sum + (b.payment_amount || 0), 0)
      };
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const menuItems = [
    { path: '/pilot', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent stats={stats} /> },
    { path: '/pilot/assignments', icon: <Calendar size={20} />, label: 'Assignments', component: <AssignmentsContent /> },
    { path: '/pilot/messages', icon: <MessageSquare size={20} />, label: 'Messages', component: <MessagesContent /> },
    { path: '/pilot/settings', icon: <Settings size={20} />, label: 'Settings', component: <SettingsContent /> },
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Add a safety check for userData.name
  const userInitial = userData.name ? userData.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-primary-950 text-white ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
        <div className="p-4 border-b border-primary-800">
          <h2 className={`font-heading font-bold ${isSidebarOpen ? 'text-xl' : 'text-center text-2xl'}`}>
            {isSidebarOpen ? 'HMX Pilot' : 'HMX'}
          </h2>
        </div>
        
        <div className="p-4 border-b border-primary-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
              {userInitial}
            </div>
            {isSidebarOpen && (
              <div>
                <p className="font-medium text-white">{userData.name || 'Pilot'}</p>
                <p className="text-sm text-gray-400">{userData.email || ''}</p>
              </div>
            )}
          </div>
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
              <Route key={item.path} path={item.path.replace('/pilot', '')} element={item.component} />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  );
};

// Dashboard Components
const DashboardContent: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Active Assignments', value: stats.activeAssignments, icon: <Calendar className="text-blue-500" /> },
        { label: 'Completed Tours', value: stats.completedTours, icon: <Award className="text-green-500" /> },
        { label: 'Pending Messages', value: stats.pendingMessages, icon: <MessageSquare className="text-yellow-500" /> },
        { label: 'Total Earnings', value: `$${stats.totalEarnings}`, icon: <BarChart3 className="text-purple-500" /> },
      ].map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-gray-50">
              {stat.icon}
            </div>
          </div>
          <h3 className="mt-4 text-gray-500 text-sm font-medium">{stat.label}</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>

    {/* Recent Activity */}
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        <p className="text-gray-500 text-center py-4">No recent activity to show</p>
      </div>
    </div>
  </div>
);

const AssignmentsContent: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch bookings');
      setLoading(false);
    }
  };

  const handleClaimBooking = async (bookingId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to claim booking');
    }
  };

  const handleStartBooking = async (bookingId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBookings();
      setShowBookingDetails(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start booking');
    }
  };

  const handleCompleteBooking = async (bookingId: number) => {
    if (!driveLink) {
      setError('Drive link is required to complete the booking');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/complete`, {
        drive_link: driveLink
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCompleteModal(false);
      setDriveLink('');
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete booking');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.business_name}</div>
                  <div className="text-sm text-gray-500">{booking.client_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(booking.preferred_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : booking.status === 'assigned'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status.split('_').map((word: string) => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {booking.booking_status === 'available' ? (
                    <button
                      onClick={() => handleClaimBooking(booking.id)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Claim
                    </button>
                  ) : booking.status === 'assigned' ? (
                    <button
                      onClick={() => handleStartBooking(booking.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Start
                    </button>
                  ) : booking.status === 'in_progress' ? (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowCompleteModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Complete
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingDetails(true);
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Complete Project Modal */}
      {showCompleteModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Drive Link</label>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter Google Drive link"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCompleteModal(false);
                      setDriveLink('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCompleteBooking(selectedBooking.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    disabled={!driveLink}
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MessagesContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
    <div className="text-center text-gray-500 py-8">
      No messages to display
    </div>
  </div>
);

const SettingsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Your Name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Your Phone Number"
        />
      </div>
      <div className="pt-4">
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

export default PilotDashboard; 