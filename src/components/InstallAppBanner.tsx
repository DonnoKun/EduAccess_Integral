/**
 * EduAccess - Install App Banner
 * Shows a banner prompting users to install the app on their device
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallAppBanner() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const { isInstallable, isInstalled, promptInstall, showIOSInstructions } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('install-banner-dismissed') === 'true';
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !showIOSInstructions) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (showIOSInstructions) {
      setShowIOSGuide(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) {
      handleDismiss();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-primary text-primary-foreground px-4 py-3"
      >
        <div className="container mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Smartphone className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium truncate">
              {lang === 'es'
                ? '📲 Instala EduAccess en tu dispositivo para acceso rápido y sin conexión'
                : '📲 Install EduAccess on your device for quick offline access'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleInstall}
              className="text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {lang === 'es' ? 'Instalar' : 'Install'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* iOS Install Guide */}
        <AnimatePresence>
          {showIOSGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="container mx-auto pt-3 pb-1 border-t border-primary-foreground/20 mt-3">
                <p className="text-sm font-semibold mb-2">
                  {lang === 'es' ? 'Para instalar en iPhone/iPad:' : 'To install on iPhone/iPad:'}
                </p>
                <ol className="text-xs space-y-1.5 pl-4">
                  <li className="flex items-center gap-2">
                    <span className="bg-primary-foreground/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                    <span className="flex items-center gap-1">
                      {lang === 'es' ? 'Toca el botón' : 'Tap the'} <Share className="h-3.5 w-3.5 inline" /> {lang === 'es' ? 'Compartir' : 'Share button'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary-foreground/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                    <span className="flex items-center gap-1">
                      {lang === 'es' ? 'Selecciona' : 'Select'} "<Plus className="h-3.5 w-3.5 inline" /> {lang === 'es' ? 'Agregar a Inicio"' : 'Add to Home Screen"'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary-foreground/20 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                    {lang === 'es' ? 'Confirma tocando "Agregar"' : 'Confirm by tapping "Add"'}
                  </li>
                </ol>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-xs mt-2 text-primary-foreground/70"
                >
                  {lang === 'es' ? 'Entendido' : 'Got it'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
