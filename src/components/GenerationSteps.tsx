import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const STEPS = {
  es: ['Buscando y verificando fuentes', 'Ajustando al nivel y formato elegidos', 'Redactando las secciones', 'Creando ejercicios y soluciones', 'Adaptando para baja visión (contraste, audio y descripciones)', 'Preparando ilustraciones'],
  en: ['Finding and checking sources', 'Adjusting to the chosen level and format', 'Writing the sections', 'Creating exercises and solutions', 'Adapting for low vision (contrast, audio and descriptions)', 'Preparing illustrations'],
};

/** Visible stage list while a lesson is generated; advances on a timer and stays on the last stage until done. */
export default function GenerationSteps({ lang }: { lang: string }) {
  const steps = STEPS[lang === 'en' ? 'en' : 'es'];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive(a => Math.min(a + 1, steps.length - 1)), 7000);
    return () => window.clearInterval(id);
  }, [steps.length]);
  return <div role="status" aria-live="polite" className="space-y-3 rounded-lg border bg-card p-4">
    <p className="font-semibold">{lang === 'en' ? 'Creating your lesson…' : 'Creando tu lección…'}</p>
    <ol className="space-y-2">
      {steps.map((label, i) => <li key={label} className={`flex items-start gap-3 break-words ${i > active ? 'text-muted-foreground' : ''}`} aria-current={i === active ? 'step' : undefined}>
        {i < active ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : i === active ? <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin" aria-hidden="true" /> : <Circle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />}
        <span className="min-w-0">{label}</span>
      </li>)}
    </ol>
  </div>;
}
