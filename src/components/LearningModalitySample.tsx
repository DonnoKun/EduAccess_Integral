import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import videoAsset from '@/assets/learning-water-cycle.asset.json';
import type { PreferredModality } from '@/types';

export function LearningModalitySample({ modality, playing, onPlay, onStop }: {
  modality: PreferredModality; playing: boolean; onPlay: () => void; onStop: () => void;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  return (
    <section className="learning-sample space-y-4 border-t border-border pt-5" aria-label={es ? 'Muestra de lección' : 'Lesson sample'}>
      <h3 className="font-semibold">{es ? 'El ciclo del agua' : 'The water cycle'}</h3>
      {modality !== 'audio' && (
        <figure className="space-y-2">
          <video key={modality} className="learning-sample-video" src={videoAsset.url} controls playsInline preload="metadata" aria-label={es ? 'Animación del ciclo del agua' : 'Water cycle animation'} />
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