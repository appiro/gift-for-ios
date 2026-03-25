"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addSave, removeSave } from '@/lib/saves';

interface WantButtonProps {
  initialCount?: number;
  initialVoted?: boolean;
  reviewId?: string;
  onLike?: (type: 'want' | 'gift') => Promise<{ userVotedWant: boolean; userVotedGift: boolean; wantCount: number; giftCount: number } | void>;
  onRequireLogin?: () => void;
  isLoggedIn?: boolean;
}

export function WantButton({ initialCount = 0, initialVoted = false, reviewId, onLike, onRequireLogin, isLoggedIn }: WantButtonProps) {
  const [hasVoted, setHasVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);

  const handleClick = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    // Optimistic update
    const next = !hasVoted;
    setHasVoted(next);
    setCount((c) => next ? c + 1 : Math.max(0, c - 1));
    if (reviewId) {
      if (next) addSave(reviewId, 'want');
      else removeSave(reviewId, 'want');
    }
    if (onLike) {
      const res = await onLike('want');
      if (res) {
        setCount(res.wantCount);
        setHasVoted(res.userVotedWant);
        if (reviewId) {
          if (res.userVotedWant) addSave(reviewId, 'want');
          else removeSave(reviewId, 'want');
        }
      }
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full font-bold shadow-lg backdrop-blur bg-white/95 border transition-colors duration-300 ${
        hasVoted
          ? 'border-[#ff8fa3] text-[#ff8fa3]'
          : 'border-border-light text-text-sub hover:border-[#ff8fa3] hover:text-[#ff8fa3]'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={hasVoted ? '#ffb3c1' : 'transparent'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={hasVoted ? { scale: [1, 0.8, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, type: 'tween', ease: 'easeInOut' }}
          className="relative z-10"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>

        <AnimatePresence>
          {hasVoted && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#ffb3c1]"
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: [1, 0],
                    x: Math.cos((i * 72 * Math.PI) / 180) * 20,
                    y: Math.sin((i * 72 * Math.PI) / 180) * 20,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      欲しい！ {count}
    </motion.button>
  );
}

interface GiftButtonProps {
  initialCount?: number;
  initialVoted?: boolean;
  reviewId?: string;
  onLike?: (type: 'want' | 'gift') => Promise<{ userVotedWant: boolean; userVotedGift: boolean; wantCount: number; giftCount: number } | void>;
  onRequireLogin?: () => void;
  isLoggedIn?: boolean;
}

export function GiftButton({ initialCount = 0, initialVoted = false, reviewId, onLike, onRequireLogin, isLoggedIn }: GiftButtonProps) {
  const [hasVoted, setHasVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);

  const handleClick = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    const next = !hasVoted;
    setHasVoted(next);
    setCount((c) => next ? c + 1 : Math.max(0, c - 1));
    if (reviewId) {
      if (next) addSave(reviewId, 'gift');
      else removeSave(reviewId, 'gift');
    }
    if (onLike) {
      const res = await onLike('gift');
      if (res) {
        setCount(res.giftCount);
        setHasVoted(res.userVotedGift);
        if (reviewId) {
          if (res.userVotedGift) addSave(reviewId, 'gift');
          else removeSave(reviewId, 'gift');
        }
      }
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full font-bold shadow-lg backdrop-blur bg-white/95 border transition-colors duration-300 ${
        hasVoted
          ? 'border-[#8ecae6] text-[#219ebc]'
          : 'border-border-light text-text-sub hover:border-[#8ecae6] hover:text-[#8ecae6]'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={hasVoted ? '#bde0fe' : 'transparent'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={hasVoted ? { scale: [1, 0.8, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, type: 'tween', ease: 'easeInOut' }}
          className="relative z-10"
        >
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="12" y1="8" x2="12" y2="21" />
          <motion.path
            d="M12 3 v-1 c0 -1.5 -2.5 -2 -4 -1 s-2 2 -1 3 c1 1 3 1 5 -1 z"
            animate={hasVoted ? { y: [0, -4, 0], rotate: [0, -10, 0] } : { y: 0, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.4, type: 'tween', ease: 'easeInOut' }}
          />
          <motion.path
            d="M12 3 v-1 c0 -1.5 2.5 -2 4 -1 s2 2 1 3 c-1 1 -3 1 -5 -1 z"
            animate={hasVoted ? { y: [0, -4, 0], rotate: [0, 10, 0] } : { y: 0, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.4, type: 'tween', ease: 'easeInOut' }}
          />
        </motion.svg>
      </div>
      贈りたい！ {count}
    </motion.button>
  );
}
