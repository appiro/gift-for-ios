"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        duration: 0.5, 
        type: "spring",
        bounce: 0.2
      }}
      className="w-full flex-1 flex flex-col origin-top"
    >
      {children}
    </motion.div>
  );
}
