import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Services
export const authService = {
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  login: async (data: any) => {
    const response = await api.post('/auth/login', data);
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};

// Pilot Services
export const pilotService = {
  register: async (data: any) => {
    const response = await api.post('/pilots/register', data);
    return response.data;
  },
  // New method for pilot applications
  apply: async (data: any) => {
    const response = await api.post('/pilots/apply', data);
    return response.data;
  },
};

// Editor Services
export const editorService = {
  register: async (data: any) => {
    const response = await api.post('/editors/register', data);
    return response.data;
  },
};

// Referral Services
export const referralService = {
  register: async (data: any) => {
    const response = await api.post('/referrals/register', data);
    return response.data;
  },
};

// Booking Services
export const bookingService = {
  create: async (data: any) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },
};

// Message Services
export const messageService = {
  send: async (data: any) => {
    const response = await api.post('/messages', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/messages');
    return response.data;
  },
};

// Admin Services
export const adminService = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  getPilots: async () => {
    const response = await api.get('/admin/pilots');
    return response.data;
  },

  getReferrals: async () => {
    const response = await api.get('/admin/referrals');
    return response.data;
  },
};

// Payment Services
export const paymentService = {
  initiatePayment: async (bookingId: number, amount: number) => {
    const response = await api.post('/payment/initiate', {
      booking_id: bookingId,
      amount: amount
    });
    return response.data;
  },

  checkPaymentStatus: async (merchantTransactionId: string) => {
    const response = await api.get(`/payment/status/${merchantTransactionId}`);
    return response.data;
  },

  processRefund: async (merchantTransactionId: string, refundAmount: number, refundNote?: string) => {
    const response = await api.post('/payment/refund', {
      merchant_transaction_id: merchantTransactionId,
      refund_amount: refundAmount,
      refund_note: refundNote
    });
    return response.data;
  },
};