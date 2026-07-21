"use client";

import { motion } from "framer-motion";

interface SplashScreenProps {
  visible: boolean;
}

export default function SplashScreen({ visible }: SplashScreenProps) {
  if (!visible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--retro-surface)]"
    >
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-12 relative w-32 h-32 shrink-0 aspect-square"
      >
        <div className="absolute inset-0 rounded-full border-[3px] border-[var(--retro-accent)] opacity-20" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="absolute inset-2 rounded-full border-[3px] border-[var(--retro-accent)] border-t-transparent" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-6 rounded-full border-[3px] border-[var(--retro-accent)] border-b-transparent" 
        />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="font-display text-4xl mb-4 tracking-widest uppercase"
        
      >
        Moodflix
      </motion.h1>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="h-2 w-56 bg-transparent border-2 border-[var(--retro-border)] overflow-hidden"
      >
        <motion.div 
          className="h-full bg-[var(--retro-fg)]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 10, ease: "linear" }}
        />
      </motion.div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-6 text-xs uppercase tracking-[0.3em]"
        
      >
        Curating Cinematic Experience...
      </motion.p>
    </motion.div>
  );
}
