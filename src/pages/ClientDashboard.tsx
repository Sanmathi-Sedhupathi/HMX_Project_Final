import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Settings, LogOut, BarChart3, MessageSquare, Award, ChevronRight, Play, Video } from 'lucide-react';
import axios from 'axios';
import { authService } from '../services/api';
import PhonePePayment from '../components/PhonePePayment';

const ClientDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    pendingMessages: 0,
    totalSpent: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(response.data);
        fetchStats();
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        navigate('/login');
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
        activeProjects: bookings.filter((b: any) => b.status === 'in_progress').length,
        completedProjects: bookings.filter((b: any) => b.status === 'completed').length,
        pendingMessages: 0, // This would come from a messages API
        totalSpent: bookings
          .filter((b: any) => b.status === 'completed' && b.payment_status === 'paid')
          .reduce((sum: number, b: any) => sum + (b.payment_amount || 0), 0)
      };
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const menuItems = [
    { path: '/client', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent stats={stats} /> },
    { path: '/client/projects', icon: <Calendar size={20} />, label: 'Projects', component: <ProjectsContent /> },
    { path: '/client/messages', icon: <MessageSquare size={20} />, label: 'Messages', component: <MessagesContent /> },
    { path: '/client/settings', icon: <Settings size={20} />, label: 'Settings', component: <SettingsContent /> },
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-primary-950 text-white ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
        <div className="p-4 border-b border-primary-800">
          <h2 className={`font-heading font-bold ${isSidebarOpen ? 'text-xl' : 'text-center text-2xl'}`}>
            {isSidebarOpen ? 'HMX Client' : 'HMX'}
          </h2>
        </div>

        <div className="p-4 border-b border-primary-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
              {userData.business_name?.charAt(0) || userData.name?.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div>
                <p className="font-medium text-white">{userData.business_name || userData.name}</p>
                <p className="text-sm text-gray-400">{userData.email}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 transition-colors ${location.pathname === item.path
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
              <Route key={item.path} path={item.path.replace('/client', '')} element={item.component} />
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
        { label: 'Active Projects', value: stats.activeProjects, icon: <Calendar className="text-blue-500" /> },
        { label: 'Completed Projects', value: stats.completedProjects, icon: <Award className="text-green-500" /> },
        { label: 'Pending Messages', value: stats.pendingMessages, icon: <MessageSquare className="text-yellow-500" /> },
        { label: 'Total Spent', value: `$${stats.totalSpent}`, icon: <BarChart3 className="text-purple-500" /> },
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
const ProjectsContent: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const handlePhonePePayment = (booking: any) => {
    setSelectedBooking(booking);
    setShowPhonePePayment(true);
  };
  // Step navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };


  // Pricing Table (updated)
  const COSTING_TABLE: Record<string, (number | null)[]> = {
    "Retail Store / Showroom": [5999, 9999, 15999, 20999, null],
    "Restaurants & Cafes": [7999, 11999, 19999, 25999, null],
    "Fitness & Sports Arenas": [9999, 13999, 22999, 31999, null],
    "Resorts & Farmstays / Hotels": [11999, 17999, 29999, 39999, null],
    "Real Estate Property": [13999, 23999, 37999, 49999, null],
    "Shopping Mall / Complex": [15999, 29999, 47999, 63999, null],
    "Adventure / Water Parks": [12999, 23999, 39999, 55999, null],
    "Gaming & Entertainment Zones": [10999, 19999, 33999, 45999, null],
  };

  const AREA_RANGES = [1000, 5000, 10000, 50000];

  // Calculate base + final cost
  const calculateCost = (category: string, area_sqft: number, num_floors: number) => {
    if (!COSTING_TABLE[category]) return { base: null, final: null, custom: 'Invalid Category' };
    if (area_sqft > 50000) return { base: null, final: null, custom: 'Custom Quote' };

    let idx = 0;
    for (let i = 0; i < AREA_RANGES.length; i++) {
      if (area_sqft <= AREA_RANGES[i]) {
        idx = i;
        break;
      }
      idx = i + 1;
    }

    const base = COSTING_TABLE[category][idx];
    if (base == null) return { base: null, final: null, custom: 'Custom Quote' };

    if (!num_floors || num_floors < 1) num_floors = 1;
    const final = Math.round(base * (1 + 0.1 * (num_floors - 1)));

    return { base, final, custom: null };
  };

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPhonePePayment, setShowPhonePePayment] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(2); // now only 3 steps
  const [newBooking, setNewBooking] = useState<any>({
    location_address: '',
    gps_link: '',
    property_type: '',
    indoor_outdoor: '',
    area_size: '',
    area_unit: 'sq_ft',
    rooms_sections: '',
    num_floors: '1',
    preferred_date: '',
    preferred_time: '',
    special_requirements: '',

    // Cost fields
    base_package_cost: 0,
    total_cost: 0,

    // Status fields
    status: 'pending',
    payment_status: 'pending',
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  // Auto calculate cost
  useEffect(() => {
    if (newBooking.property_type && newBooking.area_size && newBooking.num_floors) {
      const { base, final } = calculateCost(
        newBooking.property_type,
        parseFloat(newBooking.area_size),
        parseInt(newBooking.num_floors)
      );
      if (base && final) {
        setNewBooking((prev: any) => ({
          ...prev,
          base_package_cost: base,
          total_cost: final
        }));
      }
    }
  }, [newBooking.property_type, newBooking.area_size, newBooking.num_floors]);

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

  const handleNewBooking = async () => {
    try {
      const token = localStorage.getItem('token');

      // Prepare booking data
      const bookingData = {
        // Project/Shoot Details
        location_address: newBooking.location_address,
        gps_link: newBooking.gps_link,
        property_type: newBooking.property_type,
        indoor_outdoor: newBooking.indoor_outdoor,
        area_size: parseFloat(newBooking.area_size) || 0,
        area_unit: newBooking.area_unit,
        rooms_sections: parseInt(newBooking.rooms_sections) || 0,
        num_floors: parseInt(newBooking.num_floors) || 1,
        preferred_date: newBooking.preferred_date,
        preferred_time: newBooking.preferred_time,
        special_requirements: newBooking.special_requirements,



        // Cost Calculation (auto only)
        base_package_cost: newBooking.base_package_cost,
        total_cost: newBooking.total_cost,

        // Status
        status: 'pending',
        payment_status: 'pending'
      };

      await axios.post('http://localhost:5000/api/bookings', bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowNewBookingModal(false);
      resetBookingForm();
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
    }
  };


  // Validation
  const validateStep1 = () => (
    newBooking.location_address &&
    newBooking.property_type &&
    newBooking.indoor_outdoor &&
    newBooking.area_size &&
    newBooking.rooms_sections &&
    newBooking.num_floors &&
    newBooking.preferred_date &&
    newBooking.preferred_time
  );
  const validateStep2 = () => true;

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      default: return false;
    }
  };



  const resetBookingForm = () => {
    setCurrentStep(1);
    setNewBooking({
      // Project/Shoot Details
      location_address: '',
      gps_link: '',
      property_type: '',
      indoor_outdoor: '',
      area_size: '',
      area_unit: 'sq_ft',
      rooms_sections: '',
      num_floors: '1',
      preferred_date: '',
      preferred_time: '',
      special_requirements: '',

      // Video Specifications
      fpv_tour_type: '',
      video_length: '',
      resolution: '',
      background_music_voiceover: false,
      editing_style: '',

      // Cost Calculation (auto only)
      base_package_cost: 0,
      total_cost: 0,

      // Status fields
      status: 'pending',
      payment_status: 'pending'
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  function handlePayment(id: any): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowNewBookingModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          New Booking
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pilot</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <div className="text-sm">
                    No bookings found. Create your first booking to get started!
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.pilot_name || 'Unassigned'}</div>
                    <div className="text-sm text-gray-500">{booking.pilot_email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.preferred_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.delivery_video_link || booking.delivery_drive_link ? (
                      <a
                        href={booking.delivery_video_link || booking.delivery_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-900 font-medium"
                      >
                        <Play size={16} className="mr-1" />
                        Watch Video
                      </a>
                    ) : (
                      <div className="inline-flex items-center text-gray-400">
                        <Video size={16} className="mr-1" />
                        Not available
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'completed'
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {booking.status === 'completed' && booking.payment_status === 'pending' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePhonePePayment(booking)}
                          className="text-purple-600 hover:text-purple-900 font-medium"
                        >
                          Pay with PhonePe
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowPaymentModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Manual Pay
                        </button>
                      </div>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Step-by-Step Booking Modal */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-8 border w-[800px] max-h-[90vh] shadow-xl rounded-lg bg-white overflow-y-auto">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                onClick={() => {
                  setShowNewBookingModal(false);
                  resetBookingForm();
                }}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Booking</h3>

              {/* Step Progress Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {[1, 2].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step <= currentStep
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                          }`}
                      >
                        {step}
                      </div>
                      <div
                        className={`ml-2 text-sm font-medium ${step <= currentStep ? 'text-primary-600' : 'text-gray-500'
                          }`}
                      >
                        {step === 1 && 'Project Details'}
                        {step === 2 && 'Review & Submit'}
                      </div>
                      {step < 2 && (
                        <div
                          className={`ml-4 w-16 h-0.5 ${step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                            }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>


              {/* Step Content */}
              <div className="min-h-[400px]">

                {/* Step 1: Project Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        📍 Step 1: Project / Shoot Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location of Shoot (Address)</label>
                          <textarea
                            value={newBooking.location_address}
                            onChange={e => setNewBooking({ ...newBooking, location_address: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="Enter complete address of the shoot location"
                            rows={2}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">GPS Location Link (Optional)</label>
                          <input
                            type="url"
                            value={newBooking.gps_link}
                            onChange={e => setNewBooking({ ...newBooking, gps_link: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. https://maps.google.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type of Property / Business</label>
                          <select
                            value={newBooking.property_type}
                            onChange={e => setNewBooking({ ...newBooking, property_type: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Property Type</option>
                            <option value="Retail Store / Showroom">Retail Store / Showroom</option>
                            <option value="Restaurants & Cafes">Restaurants & Cafes</option>
                            <option value="Fitness & Sports Arenas">Fitness & Sports Arenas</option>
                            <option value="Resorts & Farmstays / Hotels">Resorts & Farmstays / Hotels</option>
                            <option value="Real Estate Property">Real Estate Property</option>
                            <option value="Shopping Mall / Complex">Shopping Mall / Complex</option>
                            <option value="Adventure / Water Parks">Adventure / Water Parks</option>
                            <option value="Gaming & Entertainment Zones">Gaming & Entertainment Zones</option>
                          </select>

                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Indoor / Outdoor / Both</label>
                          <select
                            value={newBooking.indoor_outdoor}
                            onChange={e => setNewBooking({ ...newBooking, indoor_outdoor: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Type</option>
                            <option value="Indoor">Indoor</option>
                            <option value="Outdoor">Outdoor</option>
                            <option value="Both">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Area Size</label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              min="1"
                              value={newBooking.area_size}
                              onChange={e => setNewBooking({ ...newBooking, area_size: e.target.value })}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                              placeholder="e.g. 2500"
                              required
                            />
                            <select
                              value={newBooking.area_unit}
                              onChange={e => setNewBooking({ ...newBooking, area_unit: e.target.value })}
                              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            >
                              <option value="sq_ft">sq. ft</option>
                              <option value="acres">acres</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms / Sections / Areas to Cover</label>
                          <input
                            type="number"
                            min="1"
                            value={newBooking.rooms_sections}
                            onChange={e => setNewBooking({ ...newBooking, rooms_sections: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 5"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Floors</label>
                          <input
                            type="number"
                            min="1"
                            value={newBooking.num_floors}
                            onChange={e => setNewBooking({ ...newBooking, num_floors: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 2"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">Additional 10% per floor (excluding ground floor)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                          <input
                            type="date"
                            value={newBooking.preferred_date}
                            onChange={e => setNewBooking({ ...newBooking, preferred_date: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                          <select
                            value={newBooking.preferred_time}
                            onChange={e => setNewBooking({ ...newBooking, preferred_time: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Time</option>
                            <option value="Morning (6 AM - 12 PM)">Morning (6 AM - 12 PM)</option>
                            <option value="Afternoon (12 PM - 6 PM)">Afternoon (12 PM - 6 PM)</option>
                            <option value="Evening (6 PM - 10 PM)">Evening (6 PM - 10 PM)</option>
                            <option value="Flexible">Flexible</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                          <textarea
                            value={newBooking.special_requirements}
                            onChange={e => setNewBooking({ ...newBooking, special_requirements: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="branding, guided voiceover, additional editing, etc."
                            rows={2}
                          />
                        </div>

                        {/* Enhanced Requirements Section */}
                        <div className="col-span-2">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Additional Services</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.voiceover_script}
                                onChange={e => setNewBooking({ ...newBooking, voiceover_script: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Professional Voiceover Script</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.background_music_licensed}
                                onChange={e => setNewBooking({ ...newBooking, background_music_licensed: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Licensed Background Music</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.branding_overlay}
                                onChange={e => setNewBooking({ ...newBooking, branding_overlay: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Branding Overlay</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.multiple_revisions}
                                onChange={e => setNewBooking({ ...newBooking, multiple_revisions: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Multiple Revisions</span>
                            </label>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newBooking.drone_permissions_required}
                              onChange={e => setNewBooking({ ...newBooking, drone_permissions_required: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Drone Flight Permissions Required?</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        📋 Step 4: Review & Submit
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-900">Project Details</h5>
                            <p className="text-sm text-gray-600">📍 {newBooking.location_address}</p>
                            <p className="text-sm text-gray-600">🏢 {newBooking.property_type}</p>
                            <p className="text-sm text-gray-600">📐 {newBooking.area_size} {newBooking.area_unit}</p>
                            <p className="text-sm text-gray-600">📅 {newBooking.preferred_date} - {newBooking.preferred_time}</p>
                          </div>
            
                        </div>
                        <div className="border-t pt-4">
                          <h5 className="font-medium text-gray-900">Total Cost</h5>
                          <p className="text-2xl font-bold text-green-600">₹ {newBooking.total_cost.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`px-6 py-2.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {currentStep === 1 ? 'Cancel' : 'Previous'}
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowNewBookingModal(false);
                      resetBookingForm();
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>

                  {currentStep < totalSteps ? (
                    <button
                      onClick={nextStep}
                      disabled={!validateCurrentStep()}
                      className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${!validateCurrentStep()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      onClick={handleNewBooking}
                      disabled={!validateCurrentStep()}
                      className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${!validateCurrentStep()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                      Create Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      )}

      {/* Payment Modal */}
      {
        showPaymentModal && selectedBooking && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Process Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Enter payment amount"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPaymentAmount('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePayment(selectedBooking.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                      disabled={!paymentAmount || isNaN(Number(paymentAmount))}
                    >
                      Pay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* PhonePe Payment Modal */}
      {
        showPhonePePayment && selectedBooking && (
          <PhonePePayment
            bookingId={selectedBooking.id}
            amount={selectedBooking.total_cost || selectedBooking.base_package_cost || 0}
            onSuccess={() => {
              setShowPhonePePayment(false);
              setSelectedBooking(null);
              fetchBookings();
            }}
            onCancel={() => {
              setShowPhonePePayment(false);
              setSelectedBooking(null);
            }}
          />

        )
      }
    </div >
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

const SettingsContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = response.data;
      setSettings({
        ...settings,
        business_name: userData.business_name || '',
        contact_name: userData.contact_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError('Failed to fetch user data');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/clients/profile', {
        business_name: settings.business_name,
        contact_name: settings.contact_name,
        phone: settings.phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (settings.new_password !== settings.confirm_password) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/clients/password', {
        current_password: settings.current_password,
        new_password: settings.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Password updated successfully');
      setSettings(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/clients/account', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg">
            {success}
          </div>
        )}
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                name="business_name"
                value={settings.business_name}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                name="contact_name"
                value={settings.contact_name}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={settings.email}
                disabled
                className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={settings.phone}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                }`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="current_password"
                value={settings.current_password}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={settings.new_password}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={settings.confirm_password}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                }`}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h3 className="text-lg font-medium text-red-800">Delete Account</h3>
              <p className="mt-1 text-sm text-red-600">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${deleteLoading
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Removed unused CATEGORY_OPTIONS and CITY_LIST constants
// These were legacy constants not used in the step-by-step form



export default ClientDashboard; 