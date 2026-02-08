/**
 * EduAccess - Platform Tutorial
 * Interactive step-by-step guide for new users showing all platform features
 * with automatic TTS narration for each step
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Palette,
  Headphones,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TutorialStep {
  icon: React.ReactNode;
  titleES: string;
  titleEN: string;
  descriptionES: string;
  descriptionEN: string;
  tipsES: string[];
  tipsEN: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: <Search className="h-12 w-12" />,
    titleES: '🔍 Buscar Contenido',
    titleEN: '🔍 Search Content',
    descriptionES:
      'Escribe cualquier tema educativo en la barra de búsqueda. La plataforma buscará contenido de múltiples fuentes como Wikipedia y lo adaptará a tus necesidades visuales.',
    descriptionEN:
      'Type any educational topic in the search bar. The platform searches content from multiple sources like Wikipedia and adapts it to your visual needs.',
    tipsES: [
      'Escribe un tema como "Sistema Solar" o "Revolución Francesa"',
      'Los resultados se generan con IA y se adaptan a tu perfil visual',
      'Puedes buscar en español o inglés',
    ],
    tipsEN: [
      'Type a topic like "Solar System" or "French Revolution"',
      'Results are AI-generated and adapted to your visual profile',
      'You can search in Spanish or English',
    ],
  },
  {
    icon: <GraduationCap className="h-12 w-12" />,
    titleES: '📚 Cursos Generados por IA',
    titleEN: '📚 AI-Generated Courses',
    descriptionES:
      'Cada búsqueda genera un curso completo con secciones, ejemplos prácticos, ejercicios y un resumen. Todo el contenido se adapta automáticamente a tu configuración de accesibilidad.',
    descriptionEN:
      'Each search generates a complete course with sections, practical examples, exercises, and a summary. All content automatically adapts to your accessibility settings.',
    tipsES: [
      'Cada curso incluye varias secciones con contenido detallado',
      'Los ejemplos prácticos te ayudan a entender mejor cada tema',
      'Los ejercicios de práctica refuerzan tu aprendizaje',
    ],
    tipsEN: [
      'Each course includes several sections with detailed content',
      'Practical examples help you better understand each topic',
      'Practice exercises reinforce your learning',
    ],
  },
  {
    icon: <Headphones className="h-12 w-12" />,
    titleES: '🔊 Audio y Lectura en Voz Alta',
    titleEN: '🔊 Audio & Read Aloud',
    descriptionES:
      'Cada sección del curso tiene su propio botón de audio. Puedes escuchar la lectura del contenido, los ejemplos, los ejercicios y el resumen de forma independiente.',
    descriptionEN:
      'Each course section has its own audio button. You can listen to the content, examples, exercises, and summary independently.',
    tipsES: [
      'Presiona el botón de audio en cada sección para escuchar el contenido',
      'Las descripciones de las imágenes también se leen en voz alta',
      'Los ejemplos, ejercicios y resumen tienen audio independiente',
    ],
    tipsEN: [
      'Press the audio button on each section to hear the content',
      'Image descriptions are also read aloud',
      'Examples, exercises, and summary have independent audio',
    ],
  },
  {
    icon: <ImageIcon className="h-12 w-12" />,
    titleES: '🖼️ Imágenes Educativas con IA',
    titleEN: '🖼️ AI Educational Images',
    descriptionES:
      'La plataforma genera ilustraciones educativas para cada sección del curso usando inteligencia artificial. Las imágenes incluyen descripciones alternativas para accesibilidad.',
    descriptionEN:
      'The platform generates educational illustrations for each course section using artificial intelligence. Images include alternative descriptions for accessibility.',
    tipsES: [
      'Las imágenes se generan automáticamente mientras lees el curso',
      'Un contador muestra el progreso de generación de imágenes',
      'Cada imagen tiene una descripción alternativa accesible',
    ],
    tipsEN: [
      'Images are generated automatically while you read the course',
      'A counter shows the image generation progress',
      'Each image has an accessible alternative description',
    ],
  },
  {
    icon: <BookOpen className="h-12 w-12" />,
    titleES: '📖 Biblioteca Personal',
    titleEN: '📖 Personal Library',
    descriptionES:
      'Guarda tus cursos favoritos en tu biblioteca personal. Puedes continuar donde lo dejaste y ver tu progreso en cada curso.',
    descriptionEN:
      'Save your favorite courses to your personal library. You can continue where you left off and see your progress on each course.',
    tipsES: [
      'Presiona "Guardar en Biblioteca" al final de cada curso',
      'Tus cursos en progreso aparecen en la sección "En Progreso"',
      'Los cursos completados se marcan con una palomita',
    ],
    tipsEN: [
      'Press "Save to Library" at the end of each course',
      'Your in-progress courses appear in the "In Progress" section',
      'Completed courses are marked with a checkmark',
    ],
  },
  {
    icon: <Palette className="h-12 w-12" />,
    titleES: '🎨 Personalización Visual',
    titleEN: '🎨 Visual Customization',
    descriptionES:
      'Ajusta el tamaño de fuente, contraste, tema y más desde Configuración. Puedes cambiar entre tema claro, oscuro o alto contraste en cualquier momento.',
    descriptionEN:
      'Adjust font size, contrast, theme, and more from Settings. You can switch between light, dark, or high contrast themes at any time.',
    tipsES: [
      'Cambia el tema con el botón de sol o luna en la barra superior',
      'Activa la guía de lectura con el botón de ojo para seguir el texto',
      'Ve a Configuración para ajustar todos los parámetros visuales',
    ],
    tipsEN: [
      'Switch themes with the sun or moon button in the top bar',
      'Enable the reading guide with the eye button to follow text',
      'Go to Settings to adjust all visual parameters',
    ],
  },
];

/** Build the narration text for a given step */
function buildNarrationText(step: TutorialStep, stepIndex: number, totalSteps: number, isES: boolean): string {
  const title = (isES ? step.titleES : step.titleEN).replace(/[🔍📚🔊🖼️📖🎨]/g, '').trim();
  const description = isES ? step.descriptionES : step.descriptionEN;
  const tips = (isES ? step.tipsES : step.tipsEN).join('. ');
  const isLast = stepIndex === totalSteps - 1;

  let closing: string;
  if (isLast) {
    closing = isES
      ? 'Cuando estés listo, da clic al botón ¡Empezar! para comenzar a explorar la plataforma.'
      : 'When you\'re ready, click the Let\'s go button to start exploring the platform.';
  } else {
    closing = isES
      ? 'Recuerda darle clic al botón de Siguiente para continuar con la guía.'
      : 'Remember to click the Next button to continue with the guide.';
  }

  return `${title}. ${description}. ${tips}. ${closing}`;
}

interface PlatformTutorialProps {
  open: boolean;
  onClose: () => void;
}

export default function PlatformTutorial({ open, onClose }: PlatformTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const isES = lang === 'es';

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => { synthRef.current?.cancel(); };
  }, []);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;

  /** Speak narration for the current step */
  const speakStep = useCallback((stepIdx: number) => {
    const synth = synthRef.current;
    if (!synth || isMutedRef.current) return;

    synth.cancel();

    const stepData = tutorialSteps[stepIdx];
    const narration = buildNarrationText(stepData, stepIdx, tutorialSteps.length, isES);

    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = isES ? 'es-ES' : 'en-US';
    utterance.rate = 0.95;

    synth.speak(utterance);
  }, [isES]);

  /** Auto-narrate when step changes or dialog opens */
  useEffect(() => {
    if (open) {
      // Small delay to let animation finish
      const timer = setTimeout(() => speakStep(currentStep), 400);
      return () => clearTimeout(timer);
    } else {
      synthRef.current?.cancel();
    }
  }, [currentStep, open, speakStep]);

  const dialogContentRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    dialogContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    synthRef.current?.cancel();
    scrollToTop();
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    synthRef.current?.cancel();
    scrollToTop();
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    synthRef.current?.cancel();
    localStorage.setItem('tutorial_seen', 'true');
    setCurrentStep(0);
    onClose();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) {
      synthRef.current?.cancel();
    } else {
      // Re-speak current step when unmuting
      setTimeout(() => speakStep(currentStep), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleFinish()}>
      <DialogContent
        ref={dialogContentRef}
        className="sm:max-w-lg max-h-[90vh] overflow-x-hidden tutorial-dialog-scrollbar"
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2" style={{ fontSize: '18px', lineHeight: '1.4' }}>
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              {isES ? 'Guía de la Plataforma' : 'Platform Guide'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 flex-shrink-0"
              aria-label={isMuted ? (isES ? 'Activar narración' : 'Enable narration') : (isES ? 'Silenciar narración' : 'Mute narration')}
              style={{ fontSize: '14px' }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {tutorialSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                synthRef.current?.cancel();
                scrollToTop();
                setCurrentStep(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === currentStep
                  ? 'w-8 bg-primary'
                  : i < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted-foreground/30'
              }`}
              aria-label={`${isES ? 'Paso' : 'Step'} ${i + 1}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="text-primary">{step.icon}</div>
              <h3 className="font-bold" style={{ fontSize: '20px', lineHeight: '1.3' }}>
                {isES ? step.titleES : step.titleEN}
              </h3>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-center" style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {isES ? step.descriptionES : step.descriptionEN}
            </p>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold flex items-center gap-1.5" style={{ fontSize: '14px' }}>
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                {isES ? 'Cómo usarlo:' : 'How to use it:'}
              </p>
              <ul className="space-y-1.5">
                {(isES ? step.tipsES : step.tipsEN).map((tip, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-2" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirst}
            size="sm"
            style={{ fontSize: '14px' }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isES ? 'Anterior' : 'Previous'}
          </Button>

          <span className="text-muted-foreground" style={{ fontSize: '12px' }}>
            {currentStep + 1} / {tutorialSteps.length}
          </span>

          <Button onClick={handleNext} size="sm" style={{ fontSize: '14px' }}>
            {isLast
              ? isES
                ? '¡Empezar!'
                : "Let's go!"
              : isES
              ? 'Siguiente'
              : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        {/* Skip button */}
        {!isLast && (
          <div className="text-center">
            <Button variant="link" size="sm" onClick={handleFinish} className="text-muted-foreground" style={{ fontSize: '13px' }}>
              {isES ? 'Omitir tutorial' : 'Skip tutorial'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
