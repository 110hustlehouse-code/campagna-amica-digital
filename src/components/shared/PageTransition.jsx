import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children, direction = 'forward' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'forward' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 'forward' ? -20 : 20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}