import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useState } from 'react';
import type { PreferredModality } from '@/types';

// Served from /public so the sample works on every host (preview, published app, Vercel).
const VIDEO_URL = '/media/water-cycle.mp4';
const POSTER_URL = '/media/water-cycle-poster.jpg';

function WaterCycleIllustration({ label }: { label: string }) {
  return (
    <svg className="learning-sample-video" viewBox="0 0 640 360" role="img" aria-label={label}>
      <rect width="640" height="360" fill="hsl(var(--muted))" />
      <circle cx="90" cy="80" r="42" fill="hsl(var(--warning, 45 93% 55%))" />
      <path d="M0 290 Q160 260 320 290 T640 290 V360 H0Z" fill="hsl(var(--primary))" opacity="0.75" />
      <path d="M380 290 L500 140 L620 290Z" fill="hsl(var(--secondary-foreground))" opacity="0.5" />
      <g fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="3">
        <ellipse cx="420" cy="80" rx="70" ry="30" /><ellipse cx="470" cy="70" rx="50" ry="26" />
      </g>
      <g stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round">
        <line x1="410" y1="120" x2="400" y2="150" /><line x1="440" y1="120" x2="430" y2="150" /><line x1="470" y1="120" x2="460" y2="150" />
      </g>
      <g stroke="hsl(var(--foreground))" strokeWidth="4" fill="none" strokeDasharray="10 8">
        <path d="M200 260 C200 180 260 120 340 90" />
      </g>
    </svg>
  );
}

export function LearningModalitySample({ modality, playing, onPlay, onStop }: {
  modality: PreferredModality; playing: boolean; onPlay: () => void; onStop: () => void;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const [failed, setFailed] = useState(false);
  const altText = es ? 'Sol, evaporación del mar, nubes y lluvia sobre una montaña' : 'Sun, evaporation from the sea, clouds and rain over a mountain';
  return (
    <section className="learning-sample space-y-4 border-t border-border pt-5" aria-label={es ? 'Muestra de lección' : 'Lesson sample'}>
      <h3 className="font-semibold">{es ? 'El ciclo del agua' : 'The water cycle'}</h3>
      {modality !== 'audio' && (
        <figure className="space-y-2">
          {failed ? <WaterCycleIllustration label={altText} /> : <video key={modality} className="learning-sample-video" poster={POSTER_URL} src={VIDEO_URL} onError={() => setFailed(true)} controls playsInline muted loop autoPlay preload="auto" aria-label={es ? 'Animación del ciclo del agua' : 'Water cycle animation'} />}
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
