import React, { useState, useEffect } from 'react';
import { Video, FileText, DollarSign, Calendar, Plus, UserPlus, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  pendingVideos: number;
  activeOrders: number;
  revenueMTD: number;
  completedOrders: number;
}

interface Activity {
  id: number;
  type: 'order' | 'pilot' | 'referral';
  action: string;
  timestamp: string;
  details: string;
}

const HomeContent: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    pendingVideos: 0,
    activeOrders: 0,
    revenueMTD: 0,
    completedOrders: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent activities
      const activitiesResponse = await fetch('http://localhost:5000/api/admin/dashboard/activities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch recent activities');
      }

      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'newOrder':
        navigate('/admin/orders');
        break;
      case 'newPilot':
        navigate('/admin/pilots');
        break;
      case 'newReferral':
        navigate('/admin/referrals');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <Video className="text-primary-600 mb-2" size={32} />
          <div className="text-2xl font-bold">{stats.pendingVideos}</div>
          <div className="text-gray-500">Pending Videos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <FileText className="text-primary-600 mb-2" size={32} />
          <div className="text-2xl font-bold">{stats.activeOrders}</div>
          <div className="text-gray-500">Active Orders</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <DollarSign className="text-primary-600 mb-2" size={32} />
          <div className="text-2xl font-bold">₹{stats.revenueMTD.toLocaleString()}</div>
          <div className="text-gray-500">Revenue (MTD)</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <Calendar className="text-primary-600 mb-2" size={32} />
          <div className="text-2xl font-bold">{stats.completedOrders}</div>
          <div className="text-gray-500">Completed Orders</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => handleQuickAction('newOrder')}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus size={20} className="mr-2" />
            Create New Order
          </button>
          <button 
            onClick={() => handleQuickAction('newPilot')}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <UserPlus size={20} className="mr-2" />
            Add New Pilot
          </button>
          <button 
            onClick={() => handleQuickAction('newReferral')}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Users size={20} className="mr-2" />
            Add New Referral
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 border-b last:border-b-0">
                <div className="flex-shrink-0">
                  {activity.type === 'order' && <FileText className="text-primary-600" size={20} />}
                  {activity.type === 'pilot' && <UserPlus className="text-primary-600" size={20} />}
                  {activity.type === 'referral' && <Users className="text-primary-600" size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.details}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            No recent activity to display
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeContent; 