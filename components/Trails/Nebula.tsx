import React from 'react';
import { motion } from 'framer-motion';

export const Nebula: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      {/* Deep Space Background */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black" />

      {/* Floating Orbs - Representing 'Trails' */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[128px] opacity-20"
        animate={{ 
          x: [0, 100, -50, 0], 
          y: [0, -50, 100, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600 rounded-full blur-[128px] opacity-15"
        animate={{ 
          x: [0, -70, 30, 0], 
          y: [0, 60, -40, 0],
          scale: [1, 1.1, 0.95, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Grid Overlay for 'Tech' feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  );
};