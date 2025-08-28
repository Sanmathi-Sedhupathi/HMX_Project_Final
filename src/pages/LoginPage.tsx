import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // context

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

type Step = 'email' | 'otp' | 'reset';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const navigate = useNavigate();

  const { login, isAuthenticated, user } = useAuth();

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState<Step>('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  // 🔑 Redirect after successful login
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'pilot') navigate('/pilot', { replace: true });
      else if (user.role === 'editor') navigate('/editor', { replace: true });
      else if (user.role === 'referral') navigate('/referral', { replace: true });
      else navigate('/client', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name as keyof FormData]) setErrors({ ...errors, [name]: undefined });
    setLoginError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setLoginError('');
    try {
      await login(formData.email, formData.password);
      // Navigation handled by useEffect above ✅
    } catch (err: any) {
      setLoginError(err.response?.data.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  /** ---------------- FORGOT PASSWORD ---------------- **/
  const sendOtp = async () => {
    setFpError('');
    if (!fpEmail) return setFpError('Email is required');
    setFpLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/request-otp', {
        email: fpEmail,
        user_type: 'user'
      });
      setFpStep('otp');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'Failed to send OTP');
    } finally {
      setFpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setFpError('');
    if (!fpOtp) return setFpError('OTP is required');
    setFpLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email: fpEmail,
        otp: fpOtp
      });
      setFpStep('reset');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'OTP verification failed');
    } finally {
      setFpLoading(false);
    }
  };

  const resetPassword = async () => {
    setFpError('');
    if (!fpNewPassword) return setFpError('Password is required');
    setFpLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', {
        email: fpEmail,
        new_password: fpNewPassword
      });

      setShowForgotPassword(false);
      setFpStep('email');
      setFpEmail('');
      setFpOtp('');
      setFpNewPassword('');
      alert('Password reset successfully. You can now login.');
    } catch (err: any) {
      setFpError(err.response?.data.error || 'Failed to reset password');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary-900 text-white p-8 text-center">
              <div className="inline-block p-3 bg-primary-800 rounded-full mb-4">
                <span className="text-2xl font-heading font-bold text-primary-400">HMX</span>
              </div>
              <h1 className="text-3xl font-heading font-bold mb-2">Welcome Back</h1>
              <p className="text-gray-200">Sign in to access your HMX account</p>
            </div>

            {/* Form */}
            <div className="p-8">
              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Your email"
                      disabled={isLoading}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:text-primary-700"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Your password"
                      disabled={isLoading}
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-gray-600">
                Don't have an account?{' '}
                <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign up
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Forgot Password</h2>
            {fpError && <p className="text-red-600 mb-2">{fpError}</p>}

            {fpStep === 'email' && (
              <>
                <input
                  type="email"
                  placeholder="Your email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={sendOtp}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </>
            )}

            {fpStep === 'otp' && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={fpOtp}
                  onChange={(e) => setFpOtp(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={verifyOtp}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Verifying OTP...' : 'Verify OTP'}
                </button>
              </>
            )}

            {fpStep === 'reset' && (
              <>
                <input
                  type="password"
                  placeholder="New Password"
                  value={fpNewPassword}
                  onChange={(e) => setFpNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded mb-4"
                  disabled={fpLoading}
                />
                <button
                  onClick={resetPassword}
                  className="w-full bg-primary-600 text-white py-3 rounded"
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </>
            )}

            <button
              className="mt-4 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowForgotPassword(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
