import React from 'react';
import { X, MapPin, Calendar, Clock, User, FileText, Link, Video, ExternalLink } from 'lucide-react';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  userRole: 'pilot' | 'editor';
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  booking, 
  userRole 
}) => {
  if (!isOpen || !booking) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'Not specified';
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="mr-2" size={20} />
            Booking Details - Order #{booking.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="mr-2" size={18} />
                Basic Information
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'editing' ? 'bg-purple-100 text-purple-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Industry</label>
                  <p className="mt-1 text-sm text-gray-900">{booking.industry || booking.category || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Property Type</label>
                  <p className="mt-1 text-sm text-gray-900">{booking.property_type || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Amount</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(booking.payment_amount)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.payment_status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="mr-2" size={18} />
                Location & Schedule
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">{booking.location || 'Not specified'}</p>
                </div>

                {booking.location_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Address</label>
                    <p className="mt-1 text-sm text-gray-900">{booking.location_address}</p>
                  </div>
                )}

                {booking.gps_link && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">GPS Location</label>
                    <div className="mt-1">
                      <a
                        href={booking.gps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        Open Location
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Date</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(booking.preferred_date)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Time</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {booking.preferred_time || 'Not specified'}
                    </p>
                  </div>
                </div>

                {booking.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duration</label>
                    <p className="mt-1 text-sm text-gray-900">{booking.duration} hours</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Requirements & Notes */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="mr-2" size={18} />
              Requirements & Notes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booking.requirements && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-blue-800">Project Requirements</label>
                  <p className="mt-2 text-sm text-blue-900">{booking.requirements}</p>
                </div>
              )}

              {booking.special_requirements && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-purple-800">Special Requirements</label>
                  <p className="mt-2 text-sm text-purple-900">{booking.special_requirements}</p>
                </div>
              )}

              {booking.client_notes && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-green-800">Client Notes</label>
                  <p className="mt-2 text-sm text-green-900">{booking.client_notes}</p>
                </div>
              )}

              {booking.pilot_notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-yellow-800">Pilot Notes</label>
                  <p className="mt-2 text-sm text-yellow-900">{booking.pilot_notes}</p>
                </div>
              )}

              {booking.admin_comments && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-red-800">Admin Comments</label>
                  <p className="mt-2 text-sm text-red-900">{booking.admin_comments}</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Links */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Video className="mr-2" size={18} />
              Video Links
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booking.drive_link && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-700">Raw Video Footage</label>
                  <div className="mt-2">
                    <a
                      href={booking.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      <Link size={14} className="mr-2" />
                      View Raw Footage
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {userRole === 'pilot' ? 'Video uploaded by you' : 'Video uploaded by pilot'}
                  </p>
                </div>
              )}

              {booking.delivery_video_link && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-700">Final Edited Video</label>
                  <div className="mt-2">
                    <a
                      href={booking.delivery_video_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      <Link size={14} className="mr-2" />
                      View Final Video
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Final edited and approved video
                  </p>
                </div>
              )}
            </div>

            {!booking.drive_link && !booking.delivery_video_link && (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500">No video links available yet</p>
              </div>
            )}
          </div>

          {/* Technical Details (if available) */}
          {(booking.area_size || booking.rooms_sections || booking.fpv_tour_type) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Technical Details</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                {booking.area_size && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Area Size</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {booking.area_size} {booking.area_unit || 'sq ft'}
                    </p>
                  </div>
                )}
                
                {booking.rooms_sections && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rooms/Sections</label>
                    <p className="mt-1 text-sm text-gray-900">{booking.rooms_sections}</p>
                  </div>
                )}
                
                {booking.fpv_tour_type && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tour Type</label>
                    <p className="mt-1 text-sm text-gray-900">{booking.fpv_tour_type}</p>
                  </div>
                )}
                
                {booking.video_length && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Video Length</label>
                    <p className="mt-1 text-sm text-gray-900">{booking.video_length}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
