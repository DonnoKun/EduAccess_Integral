/**
 * EduAccess - Audio Player Component
 * Full TTS player with play/pause, progress bar, speed control
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface AudioPlayerProps {
  text: string;
  lang: string;
  disabled?: boolean;
}

export default function AudioPlayer({ text, lang, disabled }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chunksRef = useRef<string[]>([]);
  const totalChunksRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      stop();
    };
  }, []);

  // Build chunks from text
  const buildChunks = useCallback(() => {
    const maxChunkSize = 180;
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';

    sentences.forEach((sentence) => {
      if ((current + sentence).length > maxChunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = sentence + ' ';
      } else {
        current += sentence + ' ';
      }
    });
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }, [text]);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentChunkIndex(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const speakFromChunk = useCallback(
    (startIndex: number) => {
      const synth = synthRef.current;
      if (!synth) return;

      const chunks = chunksRef.current;
      let chunkIndex = startIndex;

      const speakNext = () => {
        if (chunkIndex >= chunks.length) {
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(100);
          toast.success(lang === 'es' ? 'Lectura completada' : 'Reading complete');
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
        utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = speed;

        utterance.onstart = () => {
          setCurrentChunkIndex(chunkIndex);
          const pct = Math.round(((chunkIndex) / chunks.length) * 100);
          setProgress(pct);
        };

        utterance.onend = () => {
          chunkIndex++;
          const pct = Math.round((chunkIndex / chunks.length) * 100);
          setProgress(pct);
          speakNext();
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };

        synth.speak(utterance);
      };

      speakNext();
    },
    [lang, speed]
  );

  const play = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Fresh start
    synth.cancel();
    const chunks = buildChunks();
    chunksRef.current = chunks;
    totalChunksRef.current = chunks.length;
    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);

    speakFromChunk(0);
  }, [isPaused, buildChunks, speakFromChunk]);

  const pause = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    stop();
    setTimeout(() => {
      const chunks = buildChunks();
      chunksRef.current = chunks;
      totalChunksRef.current = chunks.length;
      setIsPlaying(true);
      speakFromChunk(0);
    }, 100);
  }, [stop, buildChunks, speakFromChunk]);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      // If currently playing, restart with new speed
      if (isPlaying || isPaused) {
        const synth = synthRef.current;
        if (!synth) return;
        synth.cancel();
        setIsPaused(false);
        setIsPlaying(true);
        // Resume from current chunk with new speed
        setTimeout(() => {
          speakFromChunk(currentChunkIndex);
        }, 50);
      }
    },
    [isPlaying, isPaused, currentChunkIndex, speakFromChunk]
  );

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Play/Pause */}
        <Button
          variant={isPlaying ? 'default' : 'outline'}
          size="sm"
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          className="gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Pausar' : 'Pause'}
            </>
          ) : isPaused ? (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Continuar' : 'Resume'}
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Escuchar' : 'Listen'}
            </>
          )}
        </Button>

        {/* Restart */}
        {(isPlaying || isPaused || progress > 0) && (
          <Button variant="ghost" size="sm" onClick={restart} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'es' ? 'Reiniciar' : 'Restart'}
          </Button>
        )}

        {/* Speed control */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted-foreground">
            {lang === 'es' ? 'Velocidad' : 'Speed'}:
          </span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  speed === s
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {(isPlaying || isPaused || progress > 0) && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono min-w-[36px] text-right">
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
}
