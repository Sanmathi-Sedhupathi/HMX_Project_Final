import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { industries } from '../../data/industries';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface Pilot {
  id: number;
  name: string;
  email: string;
}

interface OrderFormData {
  client_name: string;
  client_email: string;
  pilot_id: number;
  industry: string;
  preferred_date: string;
  location: string;
  duration: number;
  requirements: string;
  payment_amount: number;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const [formData, setFormData] = useState<OrderFormData>({
    client_name: '',
    client_email: '',
    pilot_id: 0,
    industry: '',
    preferred_date: '',
    location: '',
    duration: 1,
    requirements: '',
    payment_amount: 0
  });
  
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPilots();
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        preferred_date: tomorrow.toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const fetchPilots = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      
      const response = await fetch('http://localhost:5000/api/admin/pilots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Pilots response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setPilots(data);
      } else {
        console.error('Failed to fetch pilots:', response.status, response.statusText);
        if (response.status === 401) {
          console.error('Authentication failed - please login again');
        }
      }
    } catch (error) {
      console.error('Error fetching pilots:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'payment_amount' ? parseFloat(value) || 0 : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      setError('Please enter client name');
      return false;
    }
    if (!formData.client_email.trim()) {
      setError('Please enter client email');
      return false;
    }
    if (!formData.pilot_id) {
      setError('Please select a pilot');
      return false;
    }
    if (!formData.industry) {
      setError('Please select an industry');
      return false;
    }
    if (!formData.preferred_date) {
      setError('Please select a preferred date');
      return false;
    }
    if (!formData.location) {
      setError('Please enter a location');
      return false;
    }
    if (formData.duration < 1 || formData.duration > 8) {
      setError('Duration must be between 1 and 8 hours');
      return false;
    }
    if (formData.payment_amount <= 0) {
      setError('Please enter a valid payment amount');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      console.log('Submitting order with token:', !!token);
      
      const response = await fetch('http://localhost:5000/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Order creation response status:', response.status);

      const data = await response.json();
      console.log('Order creation response:', data);

      if (response.ok) {
        setSuccess('Order created successfully!');
        setTimeout(() => {
          onOrderCreated();
          onClose();
          setFormData({
            client_name: '',
            client_email: '',
            pilot_id: 0,
            industry: '',
            preferred_date: '',
            location: '',
            duration: 1,
            requirements: '',
            payment_amount: 0
          });
        }, 1500);
      } else {
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
        } else {
          setError(data.message || 'Failed to create order');
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError('An error occurred while creating the order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-600">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Client Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email *
              </label>
              <input
                type="email"
                name="client_email"
                value={formData.client_email}
                onChange={handleInputChange}
                placeholder="Enter client email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Pilot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilot *
              </label>
              <select
                name="pilot_id"
                value={formData.pilot_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select a pilot</option>
                {pilots.map(pilot => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.name} - {pilot.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select an industry</option>
                {industries.map(industry => (
                  <option key={industry.slug} value={industry.name}>
                    {industry.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Date *
              </label>
              <input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (hours) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                max="8"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                name="payment_amount"
                value={formData.payment_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleInputChange}
              rows={4}
              placeholder="Enter any special requirements or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal; 