/**
 * EduAccess - Login Page
 * Email OTP authentication via Supabase
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import LanguageSelector from '@/components/LanguageSelector';

type Step = 'email' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { sendOTP, verifyOTP, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();
  const lang = i18n.language?.split('-')[0] || 'es';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (hasCompletedOnboarding) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigate]);

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
  }, [email, otpValue]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      toast.error(lang === 'es' ? 'Ingresa un correo válido' : 'Enter a valid email');
      return;
    }

    const success = await sendOTP(email);
    if (success) {
      setStep('otp');
      setResendTimer(60);
      toast.success(
        lang === 'es'
          ? `Código enviado a ${email}`
          : `Code sent to ${email}`
      );
    } else if (error) {
      toast.error(error);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) return;

    const result = await verifyOTP(otpValue);
    if (result.success) {
      toast.success(lang === 'es' ? '¡Bienvenido!' : 'Welcome!');
      if (result.isNewUser || !hasCompletedOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } else if (error) {
      toast.error(
        lang === 'es' ? 'Código inválido o expirado' : 'Invalid or expired code'
      );
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const success = await sendOTP(email);
    if (success) {
      setResendTimer(60);
      setOtpValue('');
      toast.success(lang === 'es' ? 'Código reenviado' : 'Code resent');
    }
  };

  // Auto-verify when OTP complete
  useEffect(() => {
    if (otpValue.length === 6 && step === 'otp') {
      handleVerifyOTP();
    }
  }, [otpValue]);

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
                        ? 'Ingresa tu correo electrónico para recibir un código de acceso'
                        : 'Enter your email to receive an access code'}
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
                        {lang === 'es' ? 'Enviar Código' : 'Send Code'}
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
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? 'Ingresa tu Código' : 'Enter your Code'}
                    </h1>
                    <p className="text-muted-foreground">
                      {lang === 'es'
                        ? 'Revisa tu correo electrónico'
                        : 'Check your email'}
                    </p>
                    <p className="font-medium text-primary mt-1">{email}</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-center block">
                      {lang === 'es' ? 'Código de 6 dígitos' : '6-digit code'}
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otpValue}
                        onChange={setOtpValue}
                        maxLength={6}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-14 text-2xl" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-2xl" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-2xl" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-2xl" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-2xl" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-2xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {error && (
                    <p className="text-destructive text-center text-sm" role="alert">
                      {lang === 'es' ? 'Código inválido o expirado' : 'Invalid or expired code'}
                    </p>
                  )}

                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={handleResend}
                      disabled={resendTimer > 0 || isLoading}
                      className="text-sm"
                    >
                      {resendTimer > 0
                        ? `${lang === 'es' ? 'Reenviar en' : 'Resend in'} ${resendTimer}s`
                        : (lang === 'es' ? 'Reenviar código' : 'Resend code')}
                    </Button>
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otpValue.length !== 6}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {lang === 'es' ? 'Verificar' : 'Verify'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep('email');
                      setOtpValue('');
                      clearError();
                    }}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {lang === 'es' ? 'Cambiar correo' : 'Change email'}
                  </Button>
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
