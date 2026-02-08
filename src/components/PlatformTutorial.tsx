/**
 * EduAccess - Platform Tutorial
 * Interactive step-by-step guide for new users showing all platform features
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Settings,
  Sparkles,
  Eye,
  Volume2,
  FileText,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
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
      'Presiona el botón 🔊 en cada sección para escuchar el contenido',
      'Las descripciones de las imágenes también se leen en voz alta',
      'Los ejemplos, ejercicios y resumen tienen audio independiente',
    ],
    tipsEN: [
      'Press the 🔊 button on each section to hear the content',
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
      'Los cursos completados se marcan con ✅',
    ],
    tipsEN: [
      'Press "Save to Library" at the end of each course',
      'Your in-progress courses appear in the "In Progress" section',
      'Completed courses are marked with ✅',
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
      'Cambia el tema con el botón ☀️/🌙 en la barra superior',
      'Activa la guía de lectura con el botón 👁️ para seguir el texto',
      'Ve a Configuración para ajustar todos los parámetros visuales',
    ],
    tipsEN: [
      'Switch themes with the ☀️/🌙 button in the top bar',
      'Enable the reading guide with the 👁️ button to follow text',
      'Go to Settings to adjust all visual parameters',
    ],
  },
];

interface PlatformTutorialProps {
  open: boolean;
  onClose: () => void;
}

export default function PlatformTutorial({ open, onClose }: PlatformTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const isES = lang === 'es';

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    localStorage.setItem('tutorial_seen', 'true');
    setCurrentStep(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleFinish()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {isES ? 'Guía de la Plataforma' : 'Platform Guide'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {tutorialSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
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
              <h3 className="text-xl font-bold">
                {isES ? step.titleES : step.titleEN}
              </h3>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-center leading-relaxed">
              {isES ? step.descriptionES : step.descriptionEN}
            </p>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {isES ? 'Cómo usarlo:' : 'How to use it:'}
              </p>
              <ul className="space-y-1.5">
                {(isES ? step.tipsES : step.tipsEN).map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                    {tip}
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
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isES ? 'Anterior' : 'Previous'}
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {tutorialSteps.length}
          </span>

          <Button onClick={handleNext} size="sm">
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
            <Button variant="link" size="sm" onClick={handleFinish} className="text-muted-foreground">
              {isES ? 'Omitir tutorial' : 'Skip tutorial'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
