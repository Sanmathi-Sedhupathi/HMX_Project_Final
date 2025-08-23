import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Settings, LogOut, BarChart3, MessageSquare, Award, Video, Menu, X, ChevronRight, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { authService } from '../services/api';

const EditorDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingVideos: 0,
    completedVideos: 0,
    inProgressVideos: 0,
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
      const response = await axios.get('http://localhost:5000/api/editor/videos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const videos = response.data;
      const stats = {
        pendingVideos: videos.filter((v: any) => v.status === 'pending').length,
        completedVideos: videos.filter((v: any) => v.status === 'completed').length,
        inProgressVideos: videos.filter((v: any) => v.status === 'in_progress').length,
        totalEarnings: videos
          .filter((v: any) => v.status === 'completed')
          .reduce((sum: number, v: any) => sum + (v.earnings || 0), 0)
      };
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const menuItems = [
    { path: '/editor', icon: <BarChart3 size={20} />, label: 'Dashboard', component: <DashboardContent stats={stats} /> },
    { path: '/editor/videos', icon: <Video size={20} />, label: 'Video Projects', component: <VideosContent /> },
    { path: '/editor/messages', icon: <MessageSquare size={20} />, label: 'Messages', component: <MessagesContent /> },
    { path: '/editor/settings', icon: <Settings size={20} />, label: 'Settings', component: <SettingsContent /> },
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
            {isSidebarOpen ? 'HMX Editor' : 'HMX'}
          </h2>
        </div>
        
        <div className="p-4 border-b border-primary-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
              {userInitial}
            </div>
            {isSidebarOpen && (
              <div>
                <p className="font-medium text-white">{userData.name || 'Editor'}</p>
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
              <Route key={item.path} path={item.path.replace('/editor', '')} element={item.component} />
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
        { label: 'Pending Videos', value: stats.pendingVideos, icon: <Clock className="text-yellow-500" /> },
        { label: 'In Progress', value: stats.inProgressVideos, icon: <Play className="text-blue-500" /> },
        { label: 'Completed', value: stats.completedVideos, icon: <CheckCircle className="text-green-500" /> },
        { label: 'Total Earnings', value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, icon: <BarChart3 className="text-purple-500" /> },
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Video Projects</h2>
      <div className="space-y-4">
        <p className="text-gray-500 text-center py-4">No recent video projects to show</p>
      </div>
    </div>
  </div>
);

const VideosContent: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/editor/videos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVideoStatus = async (videoId: number, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/editor/videos/${videoId}`, {
        status,
        review_notes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchVideos();
      setSelectedVideo(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update video');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-yellow-500" size={16} />;
      case 'in_progress': return <Play className="text-blue-500" size={16} />;
      case 'completed': return <CheckCircle className="text-green-500" size={16} />;
      case 'rejected': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredVideos = videos.filter(video => {
    if (filter === 'all') return true;
    return video.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'in_progress', 'completed', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div key={video.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{video.title}</h3>
              {getStatusIcon(video.status)}
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{video.description}</p>
            
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                {video.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(video.created_at).toLocaleDateString()}
              </span>
            </div>

            {video.drive_link && (
              <a
                href={video.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-4"
              >
                <Video size={16} className="mr-1" />
                View Video
              </a>
            )}

            <div className="flex gap-2">
              {video.status === 'pending' && (
                <button
                  onClick={() => handleUpdateVideoStatus(video.id, 'in_progress')}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Start Editing
                </button>
              )}
              
              {video.status === 'in_progress' && (
                <button
                  onClick={() => setSelectedVideo(video)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <Video className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No videos found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'No video projects assigned yet.' : `No ${filter} videos found.`}
          </p>
        </div>
      )}

      {/* Complete Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Complete Video Project</h3>
            <p className="text-gray-600 mb-4">Add any notes about the completed video:</p>
            
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              rows={3}
              placeholder="Optional notes..."
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateVideoStatus(selectedVideo.id, 'completed')}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
              >
                Mark Complete
              </button>
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
    <div className="text-center py-12">
      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
      <p className="mt-1 text-sm text-gray-500">You don't have any messages yet.</p>
    </div>
  </div>
);

const SettingsContent: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Notifications</label>
        <div className="flex items-center">
          <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <span className="ml-2 text-sm text-gray-600">Receive email notifications for new video assignments</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Video Format</label>
        <select className="w-full p-3 border border-gray-300 rounded-lg">
          <option>MP4 (H.264)</option>
          <option>MOV (ProRes)</option>
          <option>AVI</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quality Preference</label>
        <select className="w-full p-3 border border-gray-300 rounded-lg">
          <option>4K</option>
          <option>1080p</option>
          <option>720p</option>
        </select>
      </div>
    </div>
  </div>
);

export default EditorDashboard; 