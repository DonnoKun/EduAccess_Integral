import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/eduaccess-original-logo.png.asset.json';

interface SplashScreenProps {
  visible: boolean;
}

export default function SplashScreen({ visible }: SplashScreenProps) {
  const reducedMotion = useReducedMotion();
  const { i18n } = useTranslation();
  const english = i18n.language.startsWith('en');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="eduaccess-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-auto p-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          role="status"
          aria-label={english ? 'Loading EduAccess' : 'Cargando EduAccess'}
          aria-live="polite"
        >
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => (
              <motion.div key={i} className={`eduaccess-splash-particle eduaccess-particle-${i % 5}`}
                style={{ left: `${(i * 37 + 13) % 100}%`, top: `${(i * 23 + 9) % 100}%` }}
                animate={reducedMotion ? {} : { y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }} />
            ))}
          </div>
          <motion.div className="eduaccess-splash-ring eduaccess-splash-ring-inner" aria-hidden="true"
            animate={reducedMotion ? {} : { scale: [1, 1.1, 1], rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
          <motion.div className="eduaccess-splash-ring eduaccess-splash-ring-outer" aria-hidden="true"
            animate={reducedMotion ? {} : { scale: [1.1, 1, 1.1], rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} />
          <div className="relative flex w-full max-w-sm flex-col items-center gap-8 text-center">
            <motion.div className="relative" initial={reducedMotion ? false : { scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}>
              <motion.div className="eduaccess-splash-glow absolute inset-0" aria-hidden="true" animate={reducedMotion ? {} : { opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <img src={logo.url} alt="" width={512} height={512} className="eduaccess-splash-logo relative" decoding="sync" fetchPriority="high" />
            </motion.div>
            <div className="eduaccess-splash-name flex items-baseline">
              {'EduAccess'.split('').map((char, i) => <motion.span key={i} initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}>{char}</motion.span>)}
            </div>
            <p className="eduaccess-splash-tagline">{english ? 'Education without barriers' : 'Educación sin barreras'}</p>
            <div className="eduaccess-splash-track" aria-hidden="true">
              <div className="eduaccess-splash-progress" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}