/**
 * EduAccess - Login Page
 * OTP-based authentication with email/phone
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import LanguageSelector from '@/components/LanguageSelector';
import CountryCodeSelector from '@/components/CountryCodeSelector';
import { getCountryByCode, validatePhoneNumber, getFullPhoneNumber } from '@/data/countries';

type AuthMethod = 'email' | 'phone';
type Step = 'identifier' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { sendOTP, verifyOTP, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();

  const [step, setStep] = useState<Step>('identifier');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('MX');
  const [otpValue, setOtpValue] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const firstInputRef = useRef<HTMLInputElement>(null);

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

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, [step]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Clear error on input change
  useEffect(() => {
    if (error) clearError();
  }, [identifier, otpValue]);

  const validateIdentifier = (): boolean => {
    if (authMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(identifier);
    } else {
      return validatePhoneNumber(countryCode, phoneNumber);
    }
  };

  const getPhoneValidationError = (): string | null => {
    const country = getCountryByCode(countryCode);
    if (!country) return null;
    
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (cleanNumber.length < country.minLength) {
      return t('auth.phoneTooShort', { min: country.minLength });
    }
    if (cleanNumber.length > country.maxLength) {
      return t('auth.phoneTooLong', { max: country.maxLength });
    }
    return null;
  };

  // Get the full identifier (email or full phone with country code)
  const getFullIdentifier = (): string => {
    if (authMethod === 'email') {
      return identifier;
    }
    return getFullPhoneNumber(countryCode, phoneNumber);
  };

  const handleSendOTP = async () => {
    if (!validateIdentifier()) {
      const errorMessage = authMethod === 'email' 
        ? t('auth.invalidEmail')
        : getPhoneValidationError() || t('auth.invalidPhone');
      
      toast({
        variant: 'destructive',
        description: errorMessage,
      });
      return;
    }

    const fullIdentifier = getFullIdentifier();
    const success = await sendOTP(fullIdentifier, authMethod);
    if (success) {
      setStep('otp');
      setResendTimer(30);
      toast({
        description: t('auth.codeSent', { method: t(`auth.${authMethod}`) }),
      });
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 4) return;

    const result = await verifyOTP(otpValue);
    if (result.success) {
      toast({
        description: t('auth.loginSuccess'),
      });
      
      if (result.isNewUser || !hasCompletedOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } else if (error) {
      toast({
        variant: 'destructive',
        description: t(`auth.${error === 'Invalid code' ? 'invalidCode' : error === 'Code has expired' ? 'codeExpired' : 'tooManyAttempts'}`),
      });
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    const fullIdentifier = getFullIdentifier();
    const success = await sendOTP(fullIdentifier, authMethod);
    if (success) {
      setResendTimer(30);
      setOtpValue('');
      toast({
        description: t('auth.codeSent', { method: t(`auth.${authMethod}`) }),
      });
    }
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otpValue.length === 4 && step === 'otp') {
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-2xl p-8">
            <AnimatePresence mode="wait">
              {step === 'identifier' ? (
                <motion.div
                  key="identifier"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">{t('auth.welcome')}</h1>
                    <p className="text-muted-foreground">{t('auth.signInSubtitle')}</p>
                  </div>

                  {/* Auth Method Toggle */}
                  <RadioGroup
                    value={authMethod}
                    onValueChange={(v) => setAuthMethod(v as AuthMethod)}
                    className="flex justify-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="auth-email" />
                      <Label htmlFor="auth-email" className="flex items-center gap-1 cursor-pointer">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {t('auth.email')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="auth-phone" />
                      <Label htmlFor="auth-phone" className="flex items-center gap-1 cursor-pointer">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {t('auth.phone')}
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Input */}
                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {authMethod === 'email' ? t('auth.email') : t('login.phoneNumber')}
                    </Label>
                    
                    {authMethod === 'email' ? (
                      <Input
                        ref={firstInputRef}
                        id="identifier"
                        type="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        className="text-lg h-12"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <CountryCodeSelector
                          value={countryCode}
                          onChange={setCountryCode}
                          compact
                        />
                        <Input
                          ref={firstInputRef}
                          id="phone-number"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder={getCountryByCode(countryCode)?.placeholder || t('auth.phonePlaceholder')}
                          className="text-lg h-12 flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                          aria-label={t('login.phoneNumber')}
                        />
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading || (authMethod === 'email' ? !identifier : !phoneNumber)}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {t('auth.sendCode')}
                        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </Button>

                  {/* New User Note */}
                  <p className="text-sm text-muted-foreground text-center">
                    {t('auth.newUserNote')}
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
                  {/* Header */}
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">{t('auth.verificationTitle')}</h1>
                    <p className="text-muted-foreground">{t('auth.verificationSubtitle')}</p>
                    <p className="font-medium text-primary mt-1">{getFullIdentifier()}</p>
                  </div>

                  {/* OTP Input */}
                  <div className="space-y-4">
                    <Label className="text-center block">{t('auth.enterCode')}</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otpValue}
                        onChange={setOtpValue}
                        maxLength={4}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                          <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                          <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                          <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <p className="text-destructive text-center text-sm" role="alert" aria-live="assertive">
                      {t(`auth.${error === 'Invalid code' ? 'invalidCode' : error === 'Code has expired' ? 'codeExpired' : 'tooManyAttempts'}`)}
                    </p>
                  )}

                  {/* Resend */}
                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || isLoading}
                      className="text-sm"
                    >
                      {resendTimer > 0
                        ? t('auth.resendIn', { seconds: resendTimer })
                        : t('auth.resendCode')}
                    </Button>
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otpValue.length !== 4}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {t('auth.verifyButton')}
                        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </Button>

                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep('identifier');
                      setOtpValue('');
                      clearError();
                    }}
                    className="w-full"
                  >
                    {t('common.back')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>EduAccess - {t('settings.about.description').slice(0, 60)}...</p>
      </footer>
    </div>
  );
}
