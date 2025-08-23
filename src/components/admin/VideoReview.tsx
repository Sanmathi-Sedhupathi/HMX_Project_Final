import React, { useState, useEffect } from 'react';
import { Video, CheckCircle, XCircle, Clock, Search, Filter, Download, Eye, Check, X, User, Users } from 'lucide-react';
import axios from 'axios';

interface Video {
  id: number;
  title: string;
  description: string;
  status: string;
  review_notes: string;
  created_at: string;
  editor_id?: number;
  editor_name?: string;
  editor_email?: string;
}

interface Editor {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface VideoReviewProps {
  type: 'before' | 'after';
}

const VideoReview: React.FC<VideoReviewProps> = ({ type }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedEditorId, setSelectedEditorId] = useState<number | null>(null);

  useEffect(() => {
    fetchVideos();
    fetchEditors();
  }, [type]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/videos?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setVideos(data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch videos');
      setLoading(false);
    }
  };

  const fetchEditors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/editors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setEditors(data.filter((editor: Editor) => editor.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch editors:', error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/videos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, review_notes: reviewNotes })
      });
      
      if (response.ok) {
        fetchVideos();
        setShowDetailsModal(false);
        setReviewNotes('');
      }
    } catch (error) {
      setError('Failed to update video status');
    }
  };

  const handleAssignEditor = async (videoId: number) => {
    if (!selectedEditorId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/videos/${videoId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ editor_id: selectedEditorId })
      });
      
      if (response.ok) {
        fetchVideos();
        setShowAssignModal(false);
        setSelectedEditorId(null);
      }
    } catch (error) {
      setError('Failed to assign editor');
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Video Review - {type === 'before' ? 'Before Edit' : 'After Edit'}</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Videos Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Editor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVideos.map((video) => (
              <tr key={video.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{video.title}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">{video.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    video.status === 'approved' ? 'bg-green-100 text-green-800' :
                    video.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    video.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {video.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {video.editor_name ? (
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">{video.editor_name}</div>
                      <div className="text-gray-500">{video.editor_email}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not assigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(video.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedVideo(video);
                      setShowDetailsModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    <Eye size={20} />
                  </button>
                  {!video.editor_id && (
                    <button
                      onClick={() => {
                        setSelectedVideo(video);
                        setShowAssignModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Assign Editor"
                    >
                      <Users size={20} />
                    </button>
                  )}
                  {video.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(video.id, 'approved')}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(video.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X size={20} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Video Details Modal */}
      {showDetailsModal && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Video Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVideo.title}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVideo.description}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedVideo.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedVideo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedVideo.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedVideo.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Editor</label>
                <div className="mt-1 text-sm text-gray-900">
                  {selectedVideo.editor_name ? `${selectedVideo.editor_name} (${selectedVideo.editor_email})` : 'Not assigned'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(selectedVideo.created_at).toLocaleString()}
                </div>
              </div>
              {selectedVideo.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Notes</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Add review notes..."
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400"
              >
                Close
              </button>
              {selectedVideo.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedVideo.id, 'approved')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedVideo.id, 'rejected')}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Editor Modal */}
      {showAssignModal && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Assign Editor</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Video</label>
                <div className="mt-1 text-sm text-gray-900">{selectedVideo.title}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Editor</label>
                <select
                  value={selectedEditorId || ''}
                  onChange={(e) => setSelectedEditorId(Number(e.target.value))}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose an editor...</option>
                  {editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.name} ({editor.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedEditorId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignEditor(selectedVideo.id)}
                disabled={!selectedEditorId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Assign Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoReview; 