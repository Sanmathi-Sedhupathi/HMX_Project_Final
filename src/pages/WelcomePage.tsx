import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white shadow-lg rounded-xl p-10 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary-900 mb-6">
          Welcome to HMX
        </h1>
        <p className="text-gray-600 mb-10">
          Choose how you want to continue
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-md transition-colors"
          >
            Business SignUp
          </button>
          <button
            onClick={() => navigate('/pilot-signup')}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-md transition-colors"
          >
            Pilot SignUp
          </button>
          <button
            onClick={() => navigate('/referral-signup')}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-md transition-colors"
          >
            Referral SignUp
          </button>
          <button
            onClick={() => navigate('/editor-signup')}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-md transition-colors"
          >
            Editor SignUp
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
