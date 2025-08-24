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
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPhonePePayment, setShowPhonePePayment] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(4);
  const [newBooking, setNewBooking] = useState({
    // Project/Shoot Details
    location_address: '',
    gps_coordinates: '',
    property_type: '',
    indoor_outdoor: '',
    area_size: '',
    area_unit: 'sq_ft',
    rooms_sections: '',
    preferred_date: '',
    preferred_time: '',
    special_requirements: '',
    drone_permissions_required: false,

    // Video Specifications
    fpv_tour_type: '',
    video_length: '',
    resolution: '',
    background_music_voiceover: false,
    editing_style: '',

    // Cost Calculation
    base_package_cost: '',
    area_covered: '',
    shooting_hours: '',
    editing_color_grading: false,
    voiceover_script: false,
    background_music_licensed: false,
    branding_overlay: false,
    multiple_revisions: false,
    drone_licensing_fee: false,
    travel_cost: '',
    tax_percentage: 18,
    discount_code: '',
    discount_amount: 0,
    total_cost: 0,

    // Status fields (managed by admin, not shown in form)
    status: 'pending',
    payment_status: 'pending',

    // Legacy fields for compatibility
    location: '',
    description: '',
    requirements: '',
    industry: '',
    duration: '',
    category: '',
    area_sqft: '',
    num_floors: ''
  });
  // Removed unused cost preview states - using direct calculation in form

  useEffect(() => {
    fetchBookings();
  }, []);



  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Client bookings fetched:', response.data);
      setBookings(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to fetch bookings');
      setLoading(false);
    }
  };

  const handlePayment = async (bookingId: number) => {
    if (!paymentAmount || isNaN(Number(paymentAmount))) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/payment`, {
        amount: Number(paymentAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process payment');
    }
  };

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

  // Validation functions for each step
  const validateStep1 = () => {
    return (
      newBooking.location_address &&
      newBooking.property_type &&
      newBooking.indoor_outdoor &&
      newBooking.area_size &&
      newBooking.rooms_sections &&
      newBooking.preferred_date &&
      newBooking.preferred_time
    );
  };

  const validateStep2 = () => {
    return (
      newBooking.fpv_tour_type &&
      newBooking.video_length &&
      newBooking.resolution &&
      newBooking.editing_style
    );
  };

  const validateStep3 = () => {
    return true; // Cost calculation step is optional
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 3: return validateStep3();
      case 4: return true; // Review step
      default: return false;
    }
  };

  const resetBookingForm = () => {
    setCurrentStep(1);
    setNewBooking({
      // Project/Shoot Details
      location_address: '',
      gps_coordinates: '',
      property_type: '',
      indoor_outdoor: '',
      area_size: '',
      area_unit: 'sq_ft',
      rooms_sections: '',
      preferred_date: '',
      preferred_time: '',
      special_requirements: '',
      drone_permissions_required: false,

      // Video Specifications
      fpv_tour_type: '',
      video_length: '',
      resolution: '',
      background_music_voiceover: false,
      editing_style: '',

      // Cost Calculation
      base_package_cost: '',
      area_covered: '',
      shooting_hours: '',
      editing_color_grading: false,
      voiceover_script: false,
      background_music_licensed: false,
      branding_overlay: false,
      multiple_revisions: false,
      drone_licensing_fee: false,
      travel_cost: '',
      tax_percentage: 18,
      discount_code: '',
      discount_amount: 0,
      total_cost: 0,

      // Status fields (managed by admin, not shown in form)
      status: 'pending',
      payment_status: 'pending',

      // Legacy fields for compatibility
      location: '',
      description: '',
      requirements: '',
      industry: '',
      duration: '',
      category: '',
      area_sqft: '',
      num_floors: ''
    });
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    let total = 0;

    // Base package cost
    if (newBooking.base_package_cost) {
      total += parseFloat(newBooking.base_package_cost);
    }

    // Add-on services (estimated costs)
    if (newBooking.editing_color_grading) total += 5000;
    if (newBooking.voiceover_script) total += 3000;
    if (newBooking.background_music_licensed) total += 2000;
    if (newBooking.branding_overlay) total += 2500;
    if (newBooking.multiple_revisions) total += 3000;
    if (newBooking.drone_licensing_fee) total += 1500;

    // Travel cost
    if (newBooking.travel_cost) {
      total += parseFloat(newBooking.travel_cost);
    }

    // Apply tax
    if (newBooking.tax_percentage) {
      total = total * (1 + newBooking.tax_percentage / 100);
    }

    // Apply discount
    if (newBooking.discount_amount) {
      total -= newBooking.discount_amount;
    }

    return Math.max(0, total);
  };

  // Update total cost whenever relevant fields change
  React.useEffect(() => {
    const total = calculateTotalCost();
    setNewBooking(prev => ({ ...prev, total_cost: total }));
  }, [
    newBooking.base_package_cost,
    newBooking.editing_color_grading,
    newBooking.voiceover_script,
    newBooking.background_music_licensed,
    newBooking.branding_overlay,
    newBooking.multiple_revisions,
    newBooking.drone_licensing_fee,
    newBooking.travel_cost,
    newBooking.tax_percentage,
    newBooking.discount_amount
  ]);

  const handleNewBooking = async () => {
    try {
      const token = localStorage.getItem('token');

      // Prepare booking data with all fields
      const bookingData = {
        // Project/Shoot Details
        location_address: newBooking.location_address,
        gps_coordinates: newBooking.gps_coordinates,
        property_type: newBooking.property_type,
        indoor_outdoor: newBooking.indoor_outdoor,
        area_size: parseFloat(newBooking.area_size) || 0,
        area_unit: newBooking.area_unit,
        rooms_sections: parseInt(newBooking.rooms_sections) || 0,
        preferred_date: newBooking.preferred_date,
        preferred_time: newBooking.preferred_time,
        special_requirements: newBooking.special_requirements,
        drone_permissions_required: newBooking.drone_permissions_required,

        // Video Specifications
        fpv_tour_type: newBooking.fpv_tour_type,
        video_length: parseInt(newBooking.video_length) || 0,
        resolution: newBooking.resolution,
        background_music_voiceover: newBooking.background_music_voiceover,
        editing_style: newBooking.editing_style,

        // Cost Calculation
        base_package_cost: parseFloat(newBooking.base_package_cost) || 0,
        area_covered: parseFloat(newBooking.area_size) || 0,
        shooting_hours: parseInt(newBooking.shooting_hours) || 0,
        editing_color_grading: newBooking.editing_color_grading,
        voiceover_script: newBooking.voiceover_script,
        background_music_licensed: newBooking.background_music_licensed,
        branding_overlay: newBooking.branding_overlay,
        multiple_revisions: newBooking.multiple_revisions,
        drone_licensing_fee: newBooking.drone_licensing_fee,
        travel_cost: parseFloat(newBooking.travel_cost) || 0,
        tax_percentage: newBooking.tax_percentage,
        discount_code: newBooking.discount_code,
        discount_amount: newBooking.discount_amount,
        total_cost: newBooking.total_cost,

        // Status fields (will be set by backend defaults)
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

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
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step <= currentStep
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                        }`}>
                        {step}
                      </div>
                      <div className={`ml-2 text-sm font-medium ${step <= currentStep ? 'text-primary-600' : 'text-gray-500'
                        }`}>
                        {step === 1 && 'Project Details'}
                        {step === 2 && 'Video Specs'}
                        {step === 3 && 'Cost Calculation'}
                        {step === 4 && 'Review & Submit'}
                      </div>
                      {step < 4 && (
                        <div className={`ml-4 w-16 h-0.5 ${step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                          }`} />
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">GPS Coordinates (Optional)</label>
                          <input
                            type="text"
                            value={newBooking.gps_coordinates}
                            onChange={e => setNewBooking({ ...newBooking, gps_coordinates: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 12.9716, 77.5946"
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
                            <option value="Hotel">Hotel</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Factory">Factory</option>
                            <option value="Showroom">Showroom</option>
                            <option value="Resort">Resort</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Office">Office</option>
                            <option value="Warehouse">Warehouse</option>
                            <option value="Retail Store">Retail Store</option>
                            <option value="Event Venue">Event Venue</option>
                            <option value="Other">Other</option>
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

                {/* Step 2: Video Specifications */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        🎥 Step 2: Video Specifications
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type of FPV Tour</label>
                          <select
                            value={newBooking.fpv_tour_type}
                            onChange={e => setNewBooking({ ...newBooking, fpv_tour_type: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Tour Type</option>
                            <option value="Walkthrough Tour">Walkthrough Tour</option>
                            <option value="Fly-through Tour">Fly-through Tour</option>
                            <option value="Hybrid (Indoor + Outdoor)">Hybrid (Indoor + Outdoor)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Video Length Required (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={newBooking.video_length}
                            onChange={e => setNewBooking({ ...newBooking, video_length: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 3"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                          <select
                            value={newBooking.resolution}
                            onChange={e => setNewBooking({ ...newBooking, resolution: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Resolution</option>
                            <option value="Full HD (1080p)">Full HD (1080p)</option>
                            <option value="4K">4K</option>
                            <option value="6K">6K</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Editing Style</label>
                          <select
                            value={newBooking.editing_style}
                            onChange={e => setNewBooking({ ...newBooking, editing_style: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            required
                          >
                            <option value="">Select Style</option>
                            <option value="Cinematic">Cinematic</option>
                            <option value="Informative">Informative</option>
                            <option value="Fast-paced">Fast-paced</option>
                            <option value="Luxury/Premium">Luxury/Premium</option>
                            <option value="Corporate">Corporate</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newBooking.background_music_voiceover}
                              onChange={e => setNewBooking({ ...newBooking, background_music_voiceover: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Background Music / Voiceover Needed</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Cost Calculation */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        💰 Step 3: Cost Calculation
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Package Cost (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={newBooking.base_package_cost}
                            onChange={e => setNewBooking({ ...newBooking, base_package_cost: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 25000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Shooting Hours / Days</label>
                          <input
                            type="number"
                            min="1"
                            value={newBooking.shooting_hours}
                            onChange={e => setNewBooking({ ...newBooking, shooting_hours: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 4"
                          />
                        </div>

                        {/* Add-on Services */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Add-on Services</label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.editing_color_grading}
                                onChange={e => setNewBooking({ ...newBooking, editing_color_grading: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Editing & Color Grading</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.voiceover_script}
                                onChange={e => setNewBooking({ ...newBooking, voiceover_script: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Voiceover / Script</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.background_music_licensed}
                                onChange={e => setNewBooking({ ...newBooking, background_music_licensed: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Background Music (licensed)</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.branding_overlay}
                                onChange={e => setNewBooking({ ...newBooking, branding_overlay: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Branding Overlay (logos/text)</span>
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
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newBooking.drone_licensing_fee}
                                onChange={e => setNewBooking({ ...newBooking, drone_licensing_fee: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Drone Licensing / Permission Fee</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Travel & Logistics Cost (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={newBooking.travel_cost}
                            onChange={e => setNewBooking({ ...newBooking, travel_cost: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tax / GST %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newBooking.tax_percentage}
                            onChange={e => setNewBooking({ ...newBooking, tax_percentage: parseFloat(e.target.value) || 0 })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="18"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code (Optional)</label>
                          <input
                            type="text"
                            value={newBooking.discount_code}
                            onChange={e => setNewBooking({ ...newBooking, discount_code: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
                            placeholder="Enter discount code"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (Auto-calculated)</label>
                          <div className="text-2xl font-bold text-green-600">
                            ₹ {newBooking.total_cost.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
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
                          <div>
                            <h5 className="font-medium text-gray-900">Video Specifications</h5>
                            <p className="text-sm text-gray-600">🎥 {newBooking.fpv_tour_type}</p>
                            <p className="text-sm text-gray-600">⏱️ {newBooking.video_length} minutes</p>
                            <p className="text-sm text-gray-600">📺 {newBooking.resolution}</p>
                            <p className="text-sm text-gray-600">🎨 {newBooking.editing_style}</p>
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

{/* Payment Modal */ }
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

{/* PhonePe Payment Modal */ }
{
  showPhonePePayment && selectedBooking && (
    <PhonePePayment
      bookingId={selectedBooking.id}
      amount={selectedBooking.final_cost || selectedBooking.base_cost || 0}
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

function calculateCost(category: string, area_sqft: number, num_floors: number) {
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
  const area_ranges = [1000, 5000, 10000, 50000];
  if (!COSTING_TABLE[category]) return { base: null, final: null, custom: 'Invalid category' };
  if (area_sqft > 50000) return { base: null, final: null, custom: 'Custom Quote' };
  let idx = 0;
  for (let i = 0; i < area_ranges.length; i++) {
    if (area_sqft <= area_ranges[i]) { idx = i; break; }
    idx = i + 1;
  }
  const base = COSTING_TABLE[category][idx];
  if (base == null) return { base: null, final: null, custom: 'Custom Quote' };
  if (!num_floors || num_floors < 1) num_floors = 1;
  const final = Math.round(base * (1 + 0.1 * (num_floors - 1)));
  return { base, final, custom: null };
}

export default ClientDashboard; 