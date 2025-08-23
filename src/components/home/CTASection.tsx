import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const CTASection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-primary-900 to-primary-800">
      <div className="container mx-auto px-4">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center text-white"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
            Ready to Transform Your Business with Immersive FPV Tours?
          </h2>
          
          <p className="text-xl text-gray-200 mb-8">
            Join hundreds of businesses that have elevated their online presence and increased customer engagement with our cutting-edge FPV virtual tours.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/signup"
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors inline-flex items-center justify-center"
            >
              Get Started Today
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="ml-2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            
            <Link
              to="/industries/retail-stores"
              className="border border-white hover:border-primary-300 hover:bg-white/10 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors inline-flex items-center justify-center"
            >
              Explore Industry Examples
            </Link>
          </div>
          
          <div className="mt-10 pt-10 border-t border-primary-700 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-white">200+</div>
              <p className="text-gray-300">Successful Projects</p>
            </div>
            
            <div>
              <div className="text-4xl font-bold text-white">15+</div>
              <p className="text-gray-300">Industries Served</p>
            </div>
            
            <div>
              <div className="text-4xl font-bold text-white">30%+</div>
              <p className="text-gray-300">Average Conversion Increase</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;