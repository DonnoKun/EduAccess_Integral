import { useStore } from '@/store/useStore';
/**
 * EduAccess - Platform Tutorial
 * Interactive step-by-step guide for new users showing all platform features
 * with automatic TTS narration for each step
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
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
import { useAuthStore } from '@/store/useAuthStore';
import { configureSpeech, warmSpeechVoices } from '@/lib/speech';
import { Users as TUsers, BookOpen as TBook, BarChart3 as TChart, Sparkles as TSpark } from 'lucide-react';
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
      'Escribe un tema, elige tu nivel y el tipo de contenido, y pulsa Buscar. La plataforma busca fuentes reales y crea una sola lección adaptada a tu visión, que se abre sola.',
    descriptionEN:
      'Type a topic, choose your level and content type, and press Search. The platform finds real sources and creates a single lesson adapted to your vision, which opens automatically.',
    tipsES: [
      'Escribe un tema como "Sistema Solar" o "Revolución Francesa"',
      'El nivel y el tipo de contenido son obligatorios antes de buscar',
      'También puedes dictar el tema con el micrófono',
    ],
    tipsEN: [
      'Type a topic like "Solar System" or "French Revolution"',
      'Level and content type are required before searching',
      'You can also dictate the topic with the microphone',
    ],
  },
  {
    icon: <GraduationCap className="h-12 w-12" />,
    titleES: '📚 Cursos Generados por IA',
    titleEN: '📚 AI-Generated Courses',
    descriptionES:
      'Mientras se crea la lección verás cada paso del proceso. La lección trae secciones, ejemplos, ejercicios y un resumen con el texto justificado y en el tamaño que elegiste.',
    descriptionEN:
      'While the lesson is created you see each step. It includes sections, examples, exercises and a summary, with justified text at the size you chose.',
    tipsES: [
      'El nivel cambia el vocabulario, la longitud de las frases y la dificultad',
      'Los ejemplos prácticos te ayudan a entender mejor cada tema',
      'Los ejercicios de práctica refuerzan tu aprendizaje',
    ],
    tipsEN: [
      'The level changes vocabulary, sentence length and difficulty',
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
      'Los textos de las imágenes aparecen en tu idioma',
      'Las descripciones no se muestran, pero se leen en voz alta',
      'Cada imagen tiene una descripción alternativa accesible',
    ],
    tipsEN: [
      'Image labels appear in your language',
      'Descriptions are hidden but read aloud',
      'Each image has an accessible alternative description',
    ],
  },
  {
    icon: <BookOpen className="h-12 w-12" />,
    titleES: '📖 Biblioteca Personal',
    titleEN: '📖 Personal Library',
    descriptionES:
      'Cada lección que abres queda en Recientes y puedes guardarla con el marcador. Al volver a abrirla se carga al instante, con tus respuestas, sin crearla de nuevo.',
    descriptionEN:
      'Every lesson you open stays in Recent and you can save it with the bookmark. Reopening it loads instantly, with your answers, without creating it again.',
    tipsES: [
      'Pulsa el marcador arriba de la lección para guardarla',
      'Tus cursos en progreso aparecen en la sección "En Progreso"',
      'Los cursos completados se marcan con una palomita',
    ],
    tipsEN: [
      'Press the bookmark at the top of the lesson to save it',
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
      'Cambia el tema o el tamaño de letra desde la barra de la lección; se guarda en tu cuenta',
      'Activa la guía de lectura con el botón de ojo para seguir el texto',
      'Ve a Configuración para ajustar todos los parámetros visuales',
    ],
    tipsEN: [
      'Change theme or text size from the lesson bar; it is saved to your account',
      'Enable the reading guide with the eye button to follow text',
      'Go to Settings to adjust all visual parameters',
    ],
  },
];

/** Build the narration text for a given step */

const T = (title: [string,string], desc: [string,string], tES: string[], tEN: string[], icon: React.ReactNode): TutorialStep =>
  ({ icon, titleES: title[0], titleEN: title[1], descriptionES: desc[0], descriptionEN: desc[1], tipsES: tES, tipsEN: tEN });

const teacherSteps: TutorialStep[] = [
  T(['👩‍🏫 Bienvenido, docente', '👩‍🏫 Welcome, teacher'],
    ['EduAccess te permite crear grupos, generar lecciones accesibles con IA y seguir el progreso de tus alumnos.', 'EduAccess lets you create groups, generate accessible AI lessons and follow your students\' progress.'],
    ['Todo empieza en "Mis grupos" (menú superior o inferior)', 'Tus alumnos verán las lecciones con audio, contraste y letra adaptada'],
    ['Everything starts in "My groups" (top or bottom menu)', 'Students see lessons with audio, contrast and adapted text'], <TSpark className="h-12 w-12" />),
  T(['➕ Crea un grupo', '➕ Create a group'],
    ['En "Mis grupos" pulsa "Crear grupo" y escribe nombre, descripción y nivel. Se genera un código de invitación.', 'In "My groups" press "Create group" and enter name, description and level. An invitation code is generated.'],
    ['Copia el código con el botón junto a él', 'Puedes editar o eliminar el grupo desde su tarjeta'],
    ['Copy the code with the button next to it', 'You can edit or delete the group from its card'], <GraduationCap className="h-12 w-12" />),
  T(['👥 Agrega alumnos', '👥 Add students'],
    ['Comparte el código para que tus alumnos se unan, o abre el grupo, ve a la pestaña "Alumnos" y agrégalos por correo.', 'Share the code so students join, or open the group, go to the "Students" tab and add them by email.'],
    ['El alumno debe tener una cuenta registrada', 'Puedes quitar a un alumno desde la misma pestaña'],
    ['The student must have a registered account', 'You can remove a student from the same tab'], <TUsers className="h-12 w-12" />),
  T(['📝 Crea y publica lecciones', '📝 Create and publish lessons'],
    ['Dentro del grupo pulsa "Nueva lección": la IA genera texto, imágenes, ejemplos y ejercicios. Revísala y publícala.', 'Inside the group press "New lesson": AI generates text, images, examples and exercises. Review it and publish it.'],
    ['Mientras se crea verás cada paso; luego puedes editar cada sección o regenerar solo una', 'Los borradores no los ven los alumnos; puedes despublicar cuando quieras'],
    ['You see each step while it is created; then edit any section or regenerate just one', 'Students cannot see drafts; you can unpublish at any time'], <TBook className="h-12 w-12" />),
  T(['♻️ Reutiliza lecciones', '♻️ Reuse lessons'],
    ['Puedes copiar una lección tuya a otro grupo sin gastar créditos: se crea un borrador nuevo e independiente que puedes editar antes de publicar.', 'You can copy one of your lessons to another group without spending credits: a new independent draft is created that you can edit before publishing.'],
    ['Editar la copia no cambia la original', 'Al abrirla en otro idioma se traduce una vez y queda guardada'],
    ['Editing the copy does not change the original', 'Opening it in another language translates it once and keeps it'], <TBook className="h-12 w-12" />),
  T(['📊 Sigue el progreso', '📊 Track progress'],
    ['En la pestaña "Alumnos" ves el avance promedio de cada alumno en las lecciones del grupo.', 'In the "Students" tab you see each student\'s average progress in the group\'s lessons.'],
    ['Ajustes > Datos muestra el resumen de tus grupos', 'Puedes volver a ver esta guía desde el panel'],
    ['Settings > Data shows a summary of your groups', 'You can reopen this guide from the dashboard'], <TChart className="h-12 w-12" />),
];

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
  const role = useAuthStore((s) => s.role);
  const steps = role === 'teacher' ? teacherSteps : tutorialSteps;
  const ttsOn = useStore(s => s.visualProfile?.technicalParameters?.enableTTS !== false);
  const [isMuted, setIsMuted] = useState(!ttsOn);
  useEffect(() => { setIsMuted(!ttsOn); }, [ttsOn]);
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const isES = lang === 'es';

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    warmSpeechVoices();
    return () => { synthRef.current?.cancel(); };
  }, []);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  /** Speak narration for the current step */
  const speakStep = useCallback(async (stepIdx: number) => {
    const synth = synthRef.current;
    if (!synth || isMutedRef.current) return;

    synth.cancel();

    const stepData = steps[stepIdx];
    const narration = buildNarrationText(stepData, stepIdx, steps.length, isES);

    const utterance = new SpeechSynthesisUtterance(narration);
    await configureSpeech(utterance, lang);
    if (isMutedRef.current) return;
    utterance.rate = 0.95;

    synth.speak(utterance);
  }, [isES, steps, lang]);

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

    // Persist tutorial_seen to DB so it survives incognito/new devices
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('visual_preferences')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          const existing = (data?.visual_preferences as Record<string, any>) || {};
          supabase
            .from('profiles')
            .update({ visual_preferences: { ...existing, tutorial_seen: true } } as any)
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) console.warn('Could not persist tutorial_seen:', error);
              else console.log('✅ tutorial_seen persisted to database');
            });
        });
    });
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
        className="sm:max-w-3xl max-h-[90vh] overflow-x-hidden tutorial-dialog-scrollbar"
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
          overflowY: 'auto',
        }}
      >
        <DialogHeader className="pr-16">
          <div className="flex flex-wrap gap-3 items-center justify-between">
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
          {steps.map((_, i) => (
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
        <div className="flex flex-wrap gap-3 items-center justify-between pt-2 tutorial-navigation">
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
            {currentStep + 1} / {steps.length}
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
