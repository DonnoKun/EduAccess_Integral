import { useEffect, useState } from 'react';
import { BookOpenCheck, Check, Eye, ImageIcon, PenLine, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

const STEPS = {
  es: ['Buscando y verificando fuentes', 'Ajustando al nivel y formato elegidos', 'Redactando las secciones', 'Creando ejercicios y soluciones', 'Adaptando para baja visión (contraste, audio y descripciones)', 'Preparando ilustraciones'],
  en: ['Finding and checking sources', 'Adjusting to the chosen level and format', 'Writing the sections', 'Creating exercises and solutions', 'Adapting for low vision (contrast, audio and descriptions)', 'Preparing illustrations'],
};
const ICONS = [Search, SlidersHorizontal, PenLine, BookOpenCheck, Eye, ImageIcon];

/** Visible stage list while a lesson is generated; advances on a timer and stays on the last stage until done. */
export default function GenerationSteps({ lang }: { lang: string }) {
  const en = lang === 'en';
  const steps = STEPS[en ? 'en' : 'es'];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive(a => Math.min(a + 1, steps.length - 1)), 7000);
    return () => window.clearInterval(id);
  }, [steps.length]);
  const pct = Math.round(((active + 0.5) / steps.length) * 100);
  const ActiveIcon = ICONS[active];

  return <section role="status" aria-live="polite" className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-lg sm:p-8">
    <div aria-hidden="true" className="gen-glow pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
    <div aria-hidden="true" className="gen-glow pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl [animation-delay:-3s]" />

    <div className="relative flex flex-wrap items-center gap-5">
      <div aria-hidden="true" className="relative grid h-20 w-20 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <span className="gen-spin absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/60" />
        <span className="gen-pulse absolute inset-3 rounded-full bg-primary/10" />
        <ActiveIcon key={active} className="gen-pop relative h-8 w-8 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />{en ? 'Creating your lesson' : 'Creando tu lección'}
        </p>
        <p key={active} className="gen-pop mt-1 break-words text-xl font-bold sm:text-2xl">{steps[active]}</p>
        <p className="mt-1 text-sm text-muted-foreground">{en ? `Step ${active + 1} of ${steps.length}` : `Paso ${active + 1} de ${steps.length}`}</p>
      </div>
    </div>

    <div className="relative mt-6 h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={en ? 'Progress' : 'Progreso'}>
      <div className="relative h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}>
        <span aria-hidden="true" className="gen-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-transparent" />
      </div>
    </div>

    <ol className="relative mt-6 grid gap-2 sm:grid-cols-2">
      {steps.map((label, i) => {
        const Icon = ICONS[i];
        const done = i < active, now = i === active;
        return <li key={label} aria-current={now ? 'step' : undefined}
          className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-500 ${now ? 'border-primary bg-primary/10 shadow-md' : done ? 'border-primary/30 bg-card' : 'border-border bg-muted/40 text-muted-foreground'}`}>
          <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-primary text-primary-foreground' : now ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
            {done ? <Check className="h-4 w-4" /> : <Icon className={`h-4 w-4 ${now ? 'gen-pulse' : ''}`} />}
          </span>
          <span className="min-w-0 break-words pt-1">{label}</span>
        </li>;
      })}
    </ol>
  </section>;
}
