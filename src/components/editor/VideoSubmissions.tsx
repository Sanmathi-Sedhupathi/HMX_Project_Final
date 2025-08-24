import React, { useState, useEffect } from 'react';
import { Upload, Video, Calendar, MessageSquare, CheckCircle, Clock, AlertCircle, Edit, Eye, X, ChevronRight, ChevronDown } from 'lucide-react';

interface VideoSubmission {
  video_id: number;
  order_id: number;
  booking_id: string;
  client_name: string;
  drive_link: string;
  editor_comments: string;
  admin_comments: string;
  status: string;
  submitted_date: string;
}

interface AssignedOrder {
  id: number;
  booking_id: string;
  client_name: string;
  client_email: string;
  client_id: number;
  pilot_id: number;
  pilot_name: string;
  status: string;
  preferred_date: string;
  location_address: string;
  property_type: string;
  raw_video_link: string; // Link to pilot's raw video
}

const VideoSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AssignedOrder | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [editorComments, setEditorComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchSubmissions();
    fetchAssignedOrders();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/editor/video-submissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (error) {
      setError('Failed to fetch submissions');
    }
  };

  const fetchAssignedOrders = async () => {
    try {
      // Get orders assigned to this editor that are ready for editing
      const response = await fetch('http://localhost:5000/api/editor/assigned-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAssignedOrders(data);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch assigned orders');
      setLoading(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!selectedOrder || !driveLink.trim()) {
      setError('Please provide a valid drive link');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/editor/video-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          client_id: selectedOrder.client_id,
          pilot_id: selectedOrder.pilot_id,
          drive_link: driveLink,
          editor_comments: editorComments
        })
      });

      if (response.ok) {
        setShowUploadModal(false);
        setDriveLink('');
        setEditorComments('');
        setSelectedOrder(null);
        fetchSubmissions();
        fetchAssignedOrders();
      } else {
        setError('Failed to submit edited video');
      }
    } catch (error) {
      setError('Failed to submit edited video');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'review_changes': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock size={16} className="text-blue-600" />;
      case 'review_changes': return <AlertCircle size={16} className="text-yellow-600" />;
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Assignments</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* My Assignments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pilot ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assignedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No orders ready for editing</div>
                  <div className="text-sm">Orders forwarded from pilot review will appear here.</div>
                </td>
              </tr>
            ) : (
              assignedOrders.map((order) => {
                const isExpanded = expandedRows.has(order.id);
                const orderSubmissions = submissions.filter(sub => sub.order_id === order.id);
                const canSubmit = order.status !== 'completed';

                return (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRows);
                            if (isExpanded) {
                              newExpanded.delete(order.id);
                            } else {
                              newExpanded.add(order.id);
                            }
                            setExpandedRows(newExpanded);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">{order.booking_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.client_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.pilot_id || 'Not assigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'review_changes' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {canSubmit && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowUploadModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Upload Edited Video"
                          >
                            <Upload size={16} />
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <span className="text-gray-400" title="Submission disabled - Order completed">
                            <Upload size={16} />
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Row - Conversation History */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700">Conversation History with Admin</h4>

                            {/* Raw Video Link */}
                            {order.raw_video_link && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-blue-800">Raw Video from Pilot: </span>
                                <a
                                  href={order.raw_video_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900 flex items-center text-sm mt-1"
                                >
                                  <Video size={16} className="mr-1" />
                                  View Raw Video
                                </a>
                              </div>
                            )}

                            {orderSubmissions.length === 0 ? (
                              <div className="text-sm text-gray-500 italic">No submissions yet for this order.</div>
                            ) : (
                              <div className="space-y-3">
                                {orderSubmissions.map((submission) => (
                                  <div key={submission.video_id} className="bg-white p-4 rounded-lg border">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                                          {submission.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          {new Date(submission.submitted_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {submission.drive_link && (
                                        <a
                                          href={submission.drive_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-900 flex items-center text-sm"
                                        >
                                          <Video size={16} className="mr-1" />
                                          View Edited Video
                                        </a>
                                      )}
                                    </div>

                                    {submission.editor_comments && (
                                      <div className="mb-2">
                                        <span className="text-sm font-medium text-gray-700">My Comments: </span>
                                        <span className="text-sm text-gray-900">{submission.editor_comments}</span>
                                      </div>
                                    )}

                                    {submission.admin_comments && (
                                      <div className="bg-yellow-50 p-2 rounded">
                                        <span className="text-sm font-medium text-yellow-800">Admin Feedback: </span>
                                        <span className="text-sm text-yellow-900">{submission.admin_comments}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {canSubmit && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowUploadModal(true);
                                }}
                                className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                              >
                                Upload Edited Video
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>



      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Submit Edited Video</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {selectedOrder ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold">Order Details</h3>
                    <p className="text-sm text-gray-600">Order ID: {selectedOrder.booking_id}</p>
                    <p className="text-sm text-gray-600">Client: {selectedOrder.client_name}</p>
                    <p className="text-sm text-gray-600">Pilot: {selectedOrder.pilot_name}</p>
                    
                    {selectedOrder.raw_video_link && (
                      <div className="mt-2">
                        <a 
                          href={selectedOrder.raw_video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 flex items-center text-sm"
                        >
                          <Video size={16} className="mr-1" />
                          View Raw Video
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Edited Video Drive Link *
                    </label>
                    <input
                      type="url"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Editor Comments (Optional)
                    </label>
                    <textarea
                      value={editorComments}
                      onChange={(e) => setEditorComments(e.target.value)}
                      placeholder="Notes about the editing process, changes made, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitVideo}
                      disabled={submitting || !driveLink.trim()}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Edited Video'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Please select an order to submit edited video for.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default VideoSubmissions;
