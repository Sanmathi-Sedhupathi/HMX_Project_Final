import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Calendar, Settings, LogOut, BarChart3, MessageSquare, Award, MapPin, Menu, X, ChevronRight, Video, Play, Eye } from 'lucide-react';
import axios from 'axios';
import { authService } from '../services/api';
import VideoSubmissions from '../components/pilot/VideoSubmissions';
import BookingDetailsModal from '../components/common/BookingDetailsModal';

const PilotDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    ongoingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalEarnings: 0
  });
  const [earnings, setEarnings] = useState({
    total_earnings: 0,
    completed_orders: 0,
    avg_earnings_per_order: 0,
    monthly_earnings: [],
    recent_orders: []
  });
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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

      // First test if the simple endpoint works
      try {
        const testResponse = await axios.get('http://localhost:5000/api/pilot/test-simple');
        console.log('Simple test endpoint works:', testResponse.data);
      } catch (testErr) {
        console.error('Simple test endpoint failed:', testErr);
      }

      // Use the modified assigned-orders endpoint that now returns all orders
      const response = await axios.get('http://localhost:5000/api/pilot/assigned-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allOrders = response.data;
      const ongoingOrders = allOrders.filter((b: any) => !['completed', 'cancelled', 'rejected'].includes(b.status));
      const completedOrders = allOrders.filter((b: any) => b.status === 'completed');
      const cancelledOrders = allOrders.filter((b: any) => ['cancelled', 'rejected'].includes(b.status));

      const stats = {
        ongoingOrders: ongoingOrders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalEarnings: completedOrders
          .filter((b: any) => b.payment_status === 'paid')
          .reduce((sum: number, b: any) => sum + (b.payment_amount || 0), 0)
      };
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const menuItems = [
    { path: '/pilot', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent stats={stats} /> },
    { path: '/pilot/ongoing-orders', icon: <Calendar size={20} />, label: 'Ongoing Orders', component: <OngoingOrdersContent /> },
    { path: '/pilot/completed-orders', icon: <Award size={20} />, label: 'Completed Orders', component: <CompletedOrdersContent /> },
    { path: '/pilot/cancelled-orders', icon: <X size={20} />, label: 'Cancelled Orders', component: <CancelledOrdersContent /> },
    { path: '/pilot/final-review', icon: <Video size={20} />, label: 'Final Review', component: <FinalReviewContent /> },
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
            <Route path="/submission-history/:orderId" element={<SubmissionHistoryPage />} />
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
        { label: 'Ongoing Orders', value: stats.ongoingOrders, icon: <Calendar className="text-blue-500" /> },
        { label: 'Completed Orders', value: stats.completedOrders, icon: <Award className="text-green-500" /> },
        { label: 'Cancelled Orders', value: stats.cancelledOrders, icon: <X className="text-red-500" /> },
        { label: 'Total Earnings', value: `₹${stats.totalEarnings}`, icon: <BarChart3 className="text-purple-500" /> },
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

const OngoingOrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOngoingOrders();
  }, []);

  const fetchOngoingOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/pilot/assigned-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for ongoing orders only
      const ongoingOrders = response.data.filter((order: any) =>
        !['completed', 'cancelled', 'rejected'].includes(order.status)
      );
      setOrders(ongoingOrders);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch ongoing orders');
      setLoading(false);
    }
  };

  const handleViewHistory = (orderId: number) => {
    navigate(`/pilot/submission-history/${orderId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'editing': return 'bg-indigo-100 text-indigo-800';
      case 'review_changes': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Editor ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No ongoing orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight
                      size={16}
                      className={`transform transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  HMX{order.id.toString().padStart(4, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.client_id || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.editor_id || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status.split('_').map((word: string) =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewHistory(order.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBooking(order);
                        setShowBookingDetails(true);
                      }}
                      className="text-green-600 hover:text-green-900 font-medium flex items-center"
                    >
                      <Eye size={14} className="mr-1" />
                      Details
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={showBookingDetails}
        onClose={() => setShowBookingDetails(false)}
        booking={selectedBooking}
        userRole="pilot"
      />
    </div>
  );
};

const CompletedOrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/pilot/assigned-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for completed orders only
      const completedOrders = response.data.filter((order: any) => order.status === 'completed');
      setOrders(completedOrders);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch completed orders');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Completed Orders</h2>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          No completed orders found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Video</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    HMX{order.id.toString().padStart(4, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.client_name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{order.client_email || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.location_address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      order.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.delivery_video_link ? (
                      <a
                        href={order.delivery_video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        <Play size={16} className="inline mr-1" />
                        Watch Video
                      </a>
                    ) : (
                      <span className="text-gray-400">Not available</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedBooking(order);
                        setShowBookingDetails(true);
                      }}
                      className="text-green-600 hover:text-green-900 font-medium flex items-center"
                    >
                      <Eye size={14} className="mr-1" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={showBookingDetails}
        onClose={() => setShowBookingDetails(false)}
        booking={selectedBooking}
        userRole="pilot"
      />
    </div>
  );
};

const CancelledOrdersContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCancelledOrders();
  }, []);

  const fetchCancelledOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/pilot/assigned-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter for cancelled/rejected orders only
      const cancelledOrders = response.data.filter((order: any) =>
        ['cancelled', 'rejected'].includes(order.status)
      );
      setOrders(cancelledOrders);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch cancelled orders');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancelled Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No cancelled orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Order HMX{order.id.toString().padStart(4, '0')}</h3>
                  <p className="text-sm text-gray-500">Client: {order.client_name}</p>
                  <p className="text-sm text-gray-500">Status: {order.status}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FinalReviewContent: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFinalReviewOrders();
  }, []);

  const fetchFinalReviewOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/pilot/final-review', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch final review orders');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Review</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No orders ready for final review.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Order HMX{order.id.toString().padStart(4, '0')}</h3>
                  <p className="text-sm text-gray-500">Client: {order.client_name}</p>
                  {order.final_video_link && (
                    <a
                      href={order.final_video_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      View Final Video
                    </a>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded">
                    Approve
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded">
                    Request Changes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

const SubmissionHistoryPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newVideoLink, setNewVideoLink] = useState('');
  const [newComments, setNewComments] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (orderId) {
      fetchSubmissionHistory();
    }
  }, [orderId]);

  const fetchSubmissionHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/pilot/submission-history/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch submission history');
      setLoading(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!newVideoLink.trim()) {
      alert('Please enter a video link');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/pilot/video-submissions`, {
        order_id: orderId,
        drive_link: newVideoLink,
        pilot_comments: newComments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowSubmitModal(false);
      setNewVideoLink('');
      setNewComments('');
      fetchSubmissionHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit video');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/pilot/ongoing-orders')}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Ongoing Orders
          </button>
          <h1 className="text-2xl font-bold">Submission History - Order HMX{orderId?.padStart(4, '0')}</h1>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Submit New Video
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pilot Comments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin Comments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No submissions found for this order.
                </td>
              </tr>
            ) : (
              submissions.map((submission, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.submitted_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={submission.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Video
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {submission.pilot_comments || 'No comments'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {submission.admin_comments || 'No comments'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                      submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {submission.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Submit Video Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submit New Video</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Video Link</label>
                <input
                  type="url"
                  value={newVideoLink}
                  onChange={(e) => setNewVideoLink(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter Google Drive link"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comments</label>
                <textarea
                  value={newComments}
                  onChange={(e) => setNewComments(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any comments..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitVideo}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotDashboard;