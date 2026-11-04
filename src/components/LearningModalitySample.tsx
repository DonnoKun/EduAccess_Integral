import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useState } from 'react';
import type { PreferredModality } from '@/types';

/**
 * Built-in water-cycle animation: drawn in code so it shows on every host, browser and
 * device without downloading a video file, and costs no AI credits.
 */
function WaterCycleAnimation({ es, running }: { es: boolean; running: boolean }) {
  const steps = es ? ['Evaporación', 'Condensación', 'Precipitación'] : ['Evaporation', 'Condensation', 'Precipitation'];
  return (
    <svg className="learning-sample-video water-cycle-anim" data-running={running} viewBox="0 0 640 360" role="img"
      aria-label={es ? 'Animación: el sol evapora el mar, se forman nubes y llueve sobre la montaña' : 'Animation: the sun evaporates the sea, clouds form and rain falls on the mountain'}>
      <rect width="640" height="360" fill="hsl(var(--muted))" />
      <circle className="wc-sun" cx="90" cy="80" r="42" fill="hsl(45 93% 55%)" />
      <path d="M360 290 L490 120 L620 290Z" fill="hsl(var(--foreground))" opacity="0.35" />
      <path d="M0 285 Q80 270 160 285 T320 285 T480 285 T640 285 V360 H0Z" fill="hsl(var(--primary))" opacity="0.8" />
      <g className="wc-vapor" fill="none" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" opacity="0.7">
        <path d="M150 260 q10 -15 0 -30 q-10 -15 0 -30" /><path d="M210 260 q10 -15 0 -30 q-10 -15 0 -30" /><path d="M270 260 q10 -15 0 -30 q-10 -15 0 -30" />
      </g>
      <g className="wc-cloud" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="3">
        <ellipse cx="300" cy="80" rx="70" ry="30" /><ellipse cx="350" cy="68" rx="50" ry="26" />
      </g>
      <g className="wc-rain" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round">
        <line x1="440" y1="120" x2="432" y2="145" /><line x1="475" y1="115" x2="467" y2="140" /><line x1="510" y1="120" x2="502" y2="145" /><line x1="545" y1="115" x2="537" y2="140" />
      </g>
      {steps.map((label, i) => (
        <text key={label} className={`wc-label wc-label-${i}`} x="320" y="345" textAnchor="middle" fontSize="30" fontWeight="700" fill="hsl(var(--foreground))">{label}</text>
      ))}
    </svg>
  );
}

export function LearningModalitySample({ modality, playing, onPlay, onStop }: {
  modality: PreferredModality; playing: boolean; onPlay: () => void; onStop: () => void;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const [running, setRunning] = useState(true);
  const altText = es ? 'Sol, evaporación del mar, nubes y lluvia sobre una montaña' : 'Sun, evaporation from the sea, clouds and rain over a mountain';
  return (
    <section className="learning-sample space-y-4 border-t border-border pt-5" aria-label={es ? 'Muestra de lección' : 'Lesson sample'}>
      <h3 className="font-semibold">{es ? 'El ciclo del agua' : 'The water cycle'}</h3>
      {modality !== 'audio' && (
        <figure className="space-y-2">
          <WaterCycleAnimation es={es} running={running} />
          <Button variant="outline" size="sm" onClick={() => setRunning(r => !r)} aria-pressed={!running}>
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {running ? (es ? 'Pausar animación' : 'Pause animation') : (es ? 'Reproducir animación' : 'Play animation')}
          </Button>
          <figcaption className="text-muted-foreground">{es ? 'Evaporación → Condensación → Precipitación' : 'Evaporation → Condensation → Precipitation'}</figcaption>
        </figure>
      )}
      <p className={playing ? 'border-l-4 border-primary bg-primary/10 p-3' : ''}>
        {es ? 'El sol calienta el agua, que se evapora y forma nubes. Cuando se enfría, cae como lluvia y vuelve a los ríos y al mar.' : 'The sun warms the water, which evaporates and forms clouds. As it cools, it falls as rain and returns to rivers and the sea.'}
      </p>
      {modality !== 'visual' && (
        <Button variant="outline" className="h-auto whitespace-normal" onClick={playing ? onStop : onPlay} aria-pressed={playing}>
          {playing ? <Pause /> : <Play />}
          {playing ? (es ? 'Detener lectura' : 'Stop reading') : (es ? 'Escuchar muestra' : 'Listen to sample')}
        </Button>
      )}
    </section>
  );
}
