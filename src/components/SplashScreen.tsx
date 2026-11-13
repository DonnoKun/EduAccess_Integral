import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/eduaccess-logo.png';

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
          <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
            <img src={logo} alt="" width={1024} height={1024} className="eduaccess-splash-logo" decoding="sync" fetchPriority="high" />
            <div className="eduaccess-splash-name">EduAccess</div>
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