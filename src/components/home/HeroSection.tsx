import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading the video
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Video Background */}
      {loading ? (
        <div className="absolute inset-0 bg-primary-950 animate-pulse" />
      ) : (
        <div className="absolute inset-0 bg-primary-950">
          <div className="absolute inset-0 bg-black opacity-60 z-10"></div>
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute w-full h-full object-cover"
          >
            <source
              src="https://player.vimeo.com/external/481638839.hd.mp4?s=cee01e4160e90af10ccff28db4cf2b73e7bd6d90&profile_id=175&oauth2_token_id=57447761"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Hero Content */}
      <div className="container mx-auto px-4 h-full flex items-center relative z-20">
        <div className="max-w-3xl">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Piloting the Future
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-200 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            HMX is a creative drone innovation company specializing in immersive FPV drone walkthroughs that capture the "real vibe" of locations. We bring details to life through cinematic motion for restaurants, resorts, adventure parks, and more. HMX is a movement redefining travel, marketing, and experience in the 21st century by merging storytelling with drone tech.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <Link 
              to="/signup" 
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors flex-shrink-0 text-center"
            >
              Unlock Your Brand's Virtual Experience
            </Link>
            
            <Link 
              to="/login" 
              className="border border-white hover:border-primary-400 text-white hover:text-primary-400 px-8 py-3 rounded-md font-medium text-lg transition-colors flex-shrink-0 text-center"
            >
              Login
            </Link>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.div>
    </div>
  );
};

export default HeroSection;