/**
 * EduAccess - Login Page
 * Email magic link authentication via Supabase
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import LanguageSelector from '@/components/LanguageSelector';

type Step = 'email' | 'waiting';

export default function Login() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { sendOTP, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();
  const lang = i18n.language?.split('-')[0] || 'es';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [authDetected, setAuthDetected] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setAuthDetected(true);
      // Small delay to show success message
      const timer = setTimeout(() => {
        if (hasCompletedOnboarding) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }, step === 'waiting' ? 1500 : 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigate, step]);

  // Focus input on step change
  useEffect(() => {
    if (step === 'email') emailInputRef.current?.focus();
  }, [step]);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((p) => p - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Clear error on input
  useEffect(() => {
    if (error) clearError();
  }, [email]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      toast.error(lang === 'es' ? 'Ingresa un correo válido' : 'Enter a valid email');
      return;
    }

    const success = await sendOTP(email);
    if (success) {
      setStep('waiting');
      setResendTimer(60);
      toast.success(
        lang === 'es'
          ? `Enlace de acceso enviado a ${email}`
          : `Access link sent to ${email}`
      );
    } else if (error) {
      toast.error(error);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const success = await sendOTP(email);
    if (success) {
      setResendTimer(60);
      toast.success(lang === 'es' ? 'Enlace reenviado' : 'Link resent');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold">{t('common.appName')}</span>
        </div>
        <LanguageSelector />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-2xl p-8">
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                    </h1>
                    <p className="text-muted-foreground">
                      {lang === 'es'
                        ? 'Ingresa tu correo electrónico para recibir un enlace de acceso'
                        : 'Enter your email to receive an access link'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {lang === 'es' ? 'Correo electrónico' : 'Email'}
                    </Label>
                    <Input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="estudiante@correo.com"
                      className="text-lg h-12"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>

                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading || !email}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {lang === 'es' ? 'Enviar Enlace' : 'Send Link'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    {lang === 'es'
                      ? 'Si eres nuevo, se creará tu cuenta automáticamente.'
                      : 'If you\'re new, your account will be created automatically.'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {authDetected ? (
                    /* Auth Success State */
                    <div className="text-center py-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      >
                        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                      </motion.div>
                      <h1 className="text-2xl font-bold mb-2">
                        {lang === 'es' ? '¡Bienvenido!' : 'Welcome!'}
                      </h1>
                      <p className="text-muted-foreground">
                        {lang === 'es'
                          ? 'Sesión iniciada correctamente. Redirigiendo...'
                          : 'Successfully signed in. Redirecting...'}
                      </p>
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
                    </div>
                  ) : (
                    /* Waiting for Magic Link State */
                    <>
                      <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">
                          {lang === 'es' ? 'Revisa tu Correo' : 'Check your Email'}
                        </h1>
                        <p className="text-muted-foreground">
                          {lang === 'es'
                            ? 'Te enviamos un enlace de acceso a:'
                            : 'We sent an access link to:'}
                        </p>
                        <p className="font-medium text-primary mt-1">{email}</p>
                      </div>

                      <div className="flex flex-col items-center gap-4 py-6">
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Mail className="h-14 w-14 text-primary" />
                        </motion.div>

                        <div className="text-center space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {lang === 'es'
                              ? 'Haz clic en el enlace "Log In" en el correo para iniciar sesión.'
                              : 'Click the "Log In" link in the email to sign in.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {lang === 'es'
                              ? 'Esta página se actualizará automáticamente'
                              : 'This page will update automatically'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground text-center">
                          💡 {lang === 'es'
                            ? 'Si no encuentras el correo, revisa tu carpeta de spam o correo no deseado.'
                            : 'If you can\'t find the email, check your spam folder.'}
                        </p>
                      </div>

                      <div className="text-center">
                        <Button
                          variant="link"
                          onClick={handleResend}
                          disabled={resendTimer > 0 || isLoading}
                          className="text-sm"
                        >
                          {resendTimer > 0
                            ? `${lang === 'es' ? 'Reenviar en' : 'Resend in'} ${resendTimer}s`
                            : (lang === 'es' ? 'Reenviar enlace' : 'Resend link')}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setStep('email');
                          clearError();
                        }}
                        className="w-full"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {lang === 'es' ? 'Cambiar correo' : 'Change email'}
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <footer className="p-4 text-center border-t border-border">
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {t('common.appName')} - {t('settings.about.description')}
        </p>
      </footer>
    </div>
  );
}
