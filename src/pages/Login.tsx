/**
 * EduAccess - Login Page
 * Token-based authentication: register, login, and recover token.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mail,
  ArrowRight,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  UserPlus,
  Copy,
  Check,
  RefreshCw,
  GraduationCap,
  School,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore, type AppRole } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import LanguageSelector from '@/components/LanguageSelector';

type Step = 'login' | 'register' | 'register-success' | 'forgot' | 'forgot-success';

export default function Login() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login, register, resetToken, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();
  const lang = i18n.language?.split('-')[0] || 'es';

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

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

  // Focus management
  useEffect(() => {
    if (step === 'login' || step === 'register' || step === 'forgot') {
      emailInputRef.current?.focus();
    }
  }, [step]);

  // Clear error on input change
  useEffect(() => {
    if (error) clearError();
  }, [email, token]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      toast.error(lang === 'es' ? 'Ingresa un correo válido' : 'Enter a valid email');
      return;
    }
    if (!token.trim()) {
      toast.error(lang === 'es' ? 'Ingresa tu token de acceso' : 'Enter your access token');
      return;
    }

    const success = await login(email, token);
    if (success) {
      toast.success(lang === 'es' ? '¡Sesión iniciada!' : 'Signed in!');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleRegister = async () => {
    if (!isValidEmail(email)) {
      toast.error(lang === 'es' ? 'Ingresa un correo válido' : 'Enter a valid email');
      return;
    }

    const result = await register(email, selectedRole);
    if (result.success && result.token) {
      setGeneratedToken(result.token);
      setStep('register-success');
      toast.success(lang === 'es' ? '¡Cuenta creada exitosamente!' : 'Account created successfully!');
    } else {
      toast.error(result.error || 'Error');
    }
  };

  const handleResetToken = async () => {
    if (!isValidEmail(email)) {
      toast.error(lang === 'es' ? 'Ingresa un correo válido' : 'Enter a valid email');
      return;
    }

    const result = await resetToken(email);
    if (result.success && result.token) {
      setGeneratedToken(result.token);
      setStep('forgot-success');
      toast.success(lang === 'es' ? '¡Token actualizado!' : 'Token updated!');
    } else {
      toast.error(result.error || 'Error');
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      toast.success(lang === 'es' ? '¡Token copiado!' : 'Token copied!');
      setTimeout(() => setTokenCopied(false), 3000);
    } catch {
      toast.error(lang === 'es' ? 'No se pudo copiar' : 'Could not copy');
    }
  };

  const goToLogin = () => {
    setStep('login');
    setToken('');
    setGeneratedToken('');
    setTokenCopied(false);
    clearError();
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold">{t('common.appName')}</span>
        </div>
        <LanguageSelector />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-2xl p-8">
            <AnimatePresence mode="wait">
              {/* ===== LOGIN ===== */}
              {step === 'login' && (
                <motion.div key="login" {...slideVariants} className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                    </h1>
                    <p className="text-muted-foreground">
                      {lang === 'es'
                        ? 'Ingresa tu correo y token de acceso'
                        : 'Enter your email and access token'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {lang === 'es' ? 'Correo electrónico' : 'Email'}
                      </Label>
                      <Input
                        ref={emailInputRef}
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="estudiante@correo.com"
                        className="text-lg h-12"
                        onKeyDown={(e) => e.key === 'Enter' && tokenInputRef.current?.focus()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-token" className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        {lang === 'es' ? 'Token de acceso' : 'Access token'}
                      </Label>
                      <Input
                        ref={tokenInputRef}
                        id="login-token"
                        type="text"
                        inputMode="numeric"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="12345678"
                        className="text-lg h-12 tracking-widest text-center font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleLogin}
                    disabled={isLoading || !email || !token}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {lang === 'es' ? 'Entrar' : 'Sign In'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      onClick={() => { setStep('register'); clearError(); }}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {lang === 'es' ? '¿No tienes cuenta? Crear cuenta' : "Don't have an account? Register"}
                    </button>
                    <button
                      onClick={() => { setStep('forgot'); clearError(); }}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {lang === 'es' ? '¿Olvidaste tu token?' : 'Forgot your token?'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ===== REGISTER ===== */}
              {step === 'register' && (
                <motion.div key="register" {...slideVariants} className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? 'Crear Cuenta' : 'Create Account'}
                    </h1>
                    <p className="text-muted-foreground">
                      {lang === 'es'
                        ? 'Ingresa tu correo para obtener tu token de acceso permanente'
                        : 'Enter your email to get your permanent access token'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {lang === 'es' ? 'Correo electrónico' : 'Email'}
                    </Label>
                    <Input
                      ref={emailInputRef}
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="estudiante@correo.com"
                      className="text-lg h-12"
                      onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    />
                  </div>

                  {/* Role selection */}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium mb-2 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      {lang === 'es' ? 'Tipo de cuenta' : 'Account type'}
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {([
                        {
                          value: 'student' as AppRole,
                          icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
                          label: lang === 'es' ? 'Estudiante' : 'Student',
                          hint: lang === 'es' ? 'Aprende y se une a cursos' : 'Learns and joins courses',
                        },
                        {
                          value: 'teacher' as AppRole,
                          icon: <School className="h-5 w-5" aria-hidden="true" />,
                          label: lang === 'es' ? 'Docente / Institución' : 'Teacher / Institution',
                          hint: lang === 'es' ? 'Crea grupos y lecciones' : 'Creates groups and lessons',
                        },
                      ]).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedRole(option.value)}
                          aria-pressed={selectedRole === option.value}
                          className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors touch-target ${
                            selectedRole === option.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-primary mt-0.5">{option.icon}</span>
                          <span className="min-w-0">
                            <span className="block font-medium break-words">{option.label}</span>
                            <span className="block text-xs text-muted-foreground break-words">{option.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <Button
                    onClick={handleRegister}
                    disabled={isLoading || !email}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        {lang === 'es' ? 'Crear Cuenta' : 'Create Account'}
                      </>
                    )}
                  </Button>

                  <Button variant="ghost" onClick={goToLogin} className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {lang === 'es' ? 'Ya tengo cuenta' : 'I have an account'}
                  </Button>
                </motion.div>
              )}

              {/* ===== REGISTER SUCCESS ===== */}
              {step === 'register-success' && (
                <motion.div key="register-success" {...slideVariants} className="space-y-6">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    >
                      <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
                    </motion.div>
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? '¡Cuenta Creada!' : 'Account Created!'}
                    </h1>
                  </div>

                  <div className="bg-card border-2 border-primary/30 rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {lang === 'es' ? 'Tu Token de Acceso:' : 'Your Access Token:'}
                    </p>
                    <p className="text-4xl font-bold font-mono tracking-[0.2em] text-primary">
                      {generatedToken}
                    </p>
                  </div>

                  <Button
                    onClick={handleCopyToken}
                    variant="outline"
                    className="w-full h-11"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-emerald-500" />
                        {lang === 'es' ? '¡Copiado!' : 'Copied!'}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        {lang === 'es' ? 'Copiar Token' : 'Copy Token'}
                      </>
                    )}
                  </Button>

                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium text-center">
                      ⚠️ {lang === 'es'
                        ? 'Guarda este token en un lugar seguro. Lo necesitarás cada vez que inicies sesión.'
                        : 'Save this token somewhere safe. You will need it every time you sign in.'}
                    </p>
                  </div>

                  <Button onClick={goToLogin} className="w-full h-12 text-lg">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    {lang === 'es' ? 'Ir a Iniciar Sesión' : 'Go to Sign In'}
                  </Button>
                </motion.div>
              )}

              {/* ===== FORGOT TOKEN ===== */}
              {step === 'forgot' && (
                <motion.div key="forgot" {...slideVariants} className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? 'Recuperar Token' : 'Recover Token'}
                    </h1>
                    <p className="text-muted-foreground">
                      {lang === 'es'
                        ? 'Se generará un nuevo token para tu cuenta'
                        : 'A new token will be generated for your account'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {lang === 'es' ? 'Correo electrónico' : 'Email'}
                    </Label>
                    <Input
                      ref={emailInputRef}
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="estudiante@correo.com"
                      className="text-lg h-12"
                      onKeyDown={(e) => e.key === 'Enter' && handleResetToken()}
                    />
                  </div>

                  <Button
                    onClick={handleResetToken}
                    disabled={isLoading || !email}
                    className="w-full h-12 text-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        {lang === 'es' ? 'Generar Nuevo Token' : 'Generate New Token'}
                      </>
                    )}
                  </Button>

                  <Button variant="ghost" onClick={goToLogin} className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {lang === 'es' ? 'Volver a Iniciar Sesión' : 'Back to Sign In'}
                  </Button>
                </motion.div>
              )}

              {/* ===== FORGOT SUCCESS ===== */}
              {step === 'forgot-success' && (
                <motion.div key="forgot-success" {...slideVariants} className="space-y-6">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    >
                      <RefreshCw className="h-14 w-14 text-primary mx-auto mb-3" />
                    </motion.div>
                    <h1 className="text-2xl font-bold mb-2">
                      {lang === 'es' ? '¡Token Actualizado!' : 'Token Updated!'}
                    </h1>
                  </div>

                  <div className="bg-card border-2 border-primary/30 rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {lang === 'es' ? 'Tu Nuevo Token de Acceso:' : 'Your New Access Token:'}
                    </p>
                    <p className="text-4xl font-bold font-mono tracking-[0.2em] text-primary">
                      {generatedToken}
                    </p>
                  </div>

                  <Button
                    onClick={handleCopyToken}
                    variant="outline"
                    className="w-full h-11"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-emerald-500" />
                        {lang === 'es' ? '¡Copiado!' : 'Copied!'}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        {lang === 'es' ? 'Copiar Token' : 'Copy Token'}
                      </>
                    )}
                  </Button>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground text-center">
                      ⚠️ {lang === 'es'
                        ? 'Tu token anterior ya no funciona. Usa este nuevo token.'
                        : 'Your previous token no longer works. Use this new token.'}
                    </p>
                  </div>

                  <Button onClick={goToLogin} className="w-full h-12 text-lg">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    {lang === 'es' ? 'Ir a Iniciar Sesión' : 'Go to Sign In'}
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
