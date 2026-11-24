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
import { oauthReturnPath } from '@/lib/oauth-return-path';

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
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedRecovery, setGeneratedRecovery] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');
  const [teacherCode, setTeacherCode] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const next = new URLSearchParams(window.location.search).get('next');
      if (next) {
        navigate(oauthReturnPath(next), { replace: true });
      } else if (hasCompletedOnboarding) {
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

    const result = await register(email, selectedRole, teacherCode);
    if (result.success && result.token) {
      setGeneratedToken(result.token);
      setGeneratedRecovery(result.recoveryCode || '');
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

    const result = await resetToken(email, recoveryCode);
    if (result.success && result.token) {
      setGeneratedToken(result.token);
      setGeneratedRecovery(result.recoveryCode || '');
      setRecoveryCode('');
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

  const es = lang === 'es';
  const pillars = es
    ? [
        ['Lectura en voz', 'Cada lección se escucha, con la frase actual resaltada.'],
        ['Hecho a tu vista', 'Tamaño de letra, contraste y brillo según tu perfil visual.'],
        ['Aulas reales', 'Tu docente publica lecciones; tú entras con un código.'],
      ]
    : [
        ['Read aloud', 'Every lesson can be heard, with the current sentence highlighted.'],
        ['Built for your eyes', 'Text size, contrast and brightness follow your visual profile.'],
        ['Real classrooms', 'Your teacher publishes lessons; you join with a code.'],
      ];

  return (
    <div className="login-shell min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Editorial brand panel */}
      <aside className="login-brand relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16">
        <div className="login-brand-grid" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="login-monogram" aria-hidden="true">E</span>
          <span className="login-brand-name">{t('common.appName')}</span>
        </div>

        <div className="relative max-w-xl">
          <p className="login-eyebrow">{es ? 'Plataforma educativa accesible' : 'Accessible learning platform'}</p>
          <h2 className="login-display">
            {es ? (<>Aprender no debería<br />depender de <em>cuánto</em><br />alcanzas a ver.</>)
                : (<>Learning shouldn't<br />depend on <em>how much</em><br />you can see.</>)}
          </h2>
          <ol className="mt-12 space-y-6">
            {pillars.map(([title, body], i) => (
              <li key={title} className="login-pillar">
                <span className="login-pillar-num">0{i + 1}</span>
                <div>
                  <p className="login-pillar-title">{title}</p>
                  <p className="login-pillar-body">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative login-brand-foot">
          {es ? 'Proyecto de tesis · EduAccess Integral' : 'Thesis project · EduAccess Integral'}
        </p>
      </aside>

      {/* Form side */}
      <div className="flex flex-col bg-background min-w-0">
        <header className="px-6 py-5 sm:px-10 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 lg:invisible">
            <span className="login-monogram" aria-hidden="true">E</span>
            <span className="text-lg font-semibold">{t('common.appName')}</span>
          </div>
          <LanguageSelector />
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[26rem] login-form"
          >
            <AnimatePresence mode="wait">
              {/* ===== LOGIN ===== */}
              {step === 'login' && (
                <motion.div key="login" {...slideVariants} className="space-y-6">
                  <div>
                    <h1 className="login-title">
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
                  <div>
                    <h1 className="login-title">
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

                  {selectedRole === 'teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="teacher-code">{lang === 'es' ? 'Código de institución' : 'Institution code'}</Label>
                      <Input
                        id="teacher-code"
                        value={teacherCode}
                        onChange={(e) => setTeacherCode(e.target.value)}
                        className="text-lg h-12"
                        autoComplete="off"
                        aria-describedby="teacher-code-hint"
                      />
                      <p id="teacher-code-hint" className="text-xs text-muted-foreground">
                        {lang === 'es' ? 'Pídelo a la administración de tu institución.' : 'Ask your institution administrator for it.'}
                      </p>
                    </div>
                  )}

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
                    <h1 className="login-title">
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

                  {generatedRecovery && (
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        {lang === 'es' ? 'Código de recuperación (úsalo si olvidas tu token):' : 'Recovery code (use it if you forget your token):'}
                      </p>
                      <p className="text-2xl font-bold font-mono tracking-widest text-foreground break-all">{generatedRecovery}</p>
                    </div>
                  )}

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
                  <div>
                    <h1 className="login-title">
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-recovery">
                      {lang === 'es' ? 'Código de recuperación' : 'Recovery code'}
                    </Label>
                    <Input
                      id="forgot-recovery"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      autoComplete="off"
                      className="text-lg h-12 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleResetToken()}
                    />
                  </div>

                  <Button
                    onClick={handleResetToken}
                    disabled={isLoading || !email || !recoveryCode.trim()}
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
                    <h1 className="login-title">
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

                  {generatedRecovery && (
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        {lang === 'es' ? 'Código de recuperación (úsalo si olvidas tu token):' : 'Recovery code (use it if you forget your token):'}
                      </p>
                      <p className="text-2xl font-bold font-mono tracking-widest text-foreground break-all">{generatedRecovery}</p>
                    </div>
                  )}

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
          </motion.div>
        </main>

        <footer className="px-6 py-5 sm:px-10 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t('common.appName')} — {t('settings.about.description')}
          </p>
        </footer>
      </div>
    </div>
  );
}
