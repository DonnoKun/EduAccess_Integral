import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import videoAsset from '@/assets/water-cycle.mp4.asset.json';
import posterAsset from '@/assets/water-cycle-poster.jpg.asset.json';
import { useState } from 'react';
import type { PreferredModality } from '@/types';

export function LearningModalitySample({ modality, playing, onPlay, onStop }: {
  modality: PreferredModality; playing: boolean; onPlay: () => void; onStop: () => void;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const [failed, setFailed] = useState(false);
  return (
    <section className="learning-sample space-y-4 border-t border-border pt-5" aria-label={es ? 'Muestra de lección' : 'Lesson sample'}>
      <h3 className="font-semibold">{es ? 'El ciclo del agua' : 'The water cycle'}</h3>
      {modality !== 'audio' && (
        <figure className="space-y-2">
          {failed ? <img className="learning-sample-video" src={posterAsset.url} alt={es ? 'Sol, evaporación del mar, nubes y lluvia sobre una montaña' : 'Sun, evaporation from the sea, clouds and rain over a mountain'} /> : <video key={modality} className="learning-sample-video" poster={posterAsset.url} src={videoAsset.url} onError={() => setFailed(true)} controls playsInline preload="auto" aria-label={es ? 'Animación del ciclo del agua' : 'Water cycle animation'} />}
          {failed && <p role="status">{es ? 'No se pudo reproducir el video.' : 'The video could not be played.'}</p>}
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