"use client";

import { motion, Variants } from "framer-motion";

interface PaddleLoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PaddleLoading({ size = "md", className = "" }: PaddleLoadingProps) {
  const containerSizes = {
    sm: "w-24 h-12",
    md: "w-40 h-20",
    lg: "w-64 h-32",
  };

  const ballSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  // Ball animation variants
  const ballVariants: Variants = {
    animate: {
      x: ["0%", "100%", "0%"],
      y: ["0%", "-40%", "0%", "-40%", "0%"], // Parabolic effect
      scale: [1, 1.1, 1, 1.1, 1], // Impact effect
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.5, 1],
      },
    },
  };

  const paddleLeftVariants: Variants = {
    animate: {
      rotate: [0, -25, 15, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.1, 0.2, 1],
      },
    },
  };

  const paddleRightVariants: Variants = {
    animate: {
      rotate: [0, 25, -15, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0.4, 0.5, 0.6, 1],
      },
    },
  };

  return (
    <div className={`relative flex items-center justify-center ${containerSizes[size]} ${className}`}>
      {/* Left Paddle */}
      <motion.div
        className="absolute left-0 h-full flex items-center"
        variants={paddleLeftVariants}
        animate="animate"
        style={{ originX: 0.5, originY: 1 }}
      >
        <svg
          viewBox="0 0 100 150"
          className={size === "sm" ? "w-8 h-12" : size === "md" ? "w-12 h-18" : "w-16 h-24"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Handle */}
          <rect x="42" y="100" width="16" height="50" rx="4" fill="#334155" />
          {/* Head */}
          <path
            d="M50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100Z"
            fill="var(--color-azul-primary)"
          />
          {/* Surface holes (Padel style) */}
          <circle cx="30" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="30" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="30" cy="70" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="70" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="70" r="4" fill="white" fillOpacity="0.2" />
        </svg>
      </motion.div>

      {/* Ball Track */}
      <div className="relative w-[70%] h-full flex items-center justify-center">
        <motion.div
            className={`${ballSizes[size]} bg-[#ccff00] rounded-full shadow-[0_0_15px_rgba(204,255,0,0.6)]`}
            variants={ballVariants}
            animate="animate"
        />
      </div>

      {/* Right Paddle */}
      <motion.div
        className="absolute right-0 h-full flex items-center"
        variants={paddleRightVariants}
        animate="animate"
        style={{ originX: 0.5, originY: 1 }}
      >
        <svg
          viewBox="0 0 100 150"
          className={size === "sm" ? "w-8 h-12" : size === "md" ? "w-12 h-18" : "w-16 h-24"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: "scaleX(-1)" }}
        >
          {/* Handle */}
          <rect x="42" y="100" width="16" height="50" rx="4" fill="#334155" />
          {/* Head */}
          <path
            d="M50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100Z"
            fill="var(--color-azul-primary)"
          />
          {/* Surface holes */}
          <circle cx="30" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="30" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="30" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="50" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="30" cy="70" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="50" cy="70" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="70" cy="70" r="4" fill="white" fillOpacity="0.2" />
        </svg>
      </motion.div>
    </div>
  );
}
