/**
 * EduAccess - Splash / Loading Screen
 * Stunning animated loading experience
 */

import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  visible: boolean;
}

export default function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 6 + 2,
                  height: Math.random() * 6 + 2,
                  background: `rgba(${139 + Math.random() * 60}, ${92 + Math.random() * 80}, 246, ${0.3 + Math.random() * 0.4})`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Glowing rings */}
          <motion.div
            className="absolute rounded-full border border-purple-500/20"
            style={{ width: 300, height: 300 }}
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute rounded-full border border-blue-400/15"
            style={{ width: 400, height: 400 }}
            animate={{ rotate: -360, scale: [1.1, 1, 1.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Logo icon with glow */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-3xl blur-2xl"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  opacity: 0.5,
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/favicon.png"
                alt="EduAccess"
                className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl shadow-2xl"
              />
            </motion.div>

            {/* App name with stagger */}
            <div className="flex items-baseline gap-0.5">
              {'EduAccess'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="text-3xl sm:text-4xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Tagline */}
            <motion.p
              className="text-purple-200/70 text-sm sm:text-base font-light tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Educación sin barreras
            </motion.p>

            {/* Loading bar */}
            <motion.div
              className="w-48 h-1 rounded-full overflow-hidden mt-4"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
