/**
 * EduAccess - Audio Player Component
 * Full TTS player with play/pause, seekable progress, live speed change,
 * text highlighting, and clean text processing
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface AudioPlayerProps {
  text: string;
  lang: string;
  disabled?: boolean;
  onChunkChange?: (chunkIndex: number, totalChunks: number) => void;
}

// Clean text for TTS: remove markdown symbols, asterisks, etc.
function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*{1,3}/g, '') // Remove *, **, ***
    .replace(/#{1,6}\s*/g, '') // Remove # headings
    .replace(/[_~`]/g, '') // Remove _, ~, `
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/\n{2,}/g, '. ') // Multiple newlines → pause
    .replace(/\n/g, ' ') // Single newlines → space
    .replace(/\s{2,}/g, ' ') // Multiple spaces → single
    .replace(/\.{2,}/g, '.') // Multiple dots → single
    .trim();
}

export default function AudioPlayer({ text, lang, disabled, onChunkChange }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chunksRef = useRef<string[]>([]);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(false);
  const currentChunkRef = useRef(0);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  // Keep speedRef in sync
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Build chunks from cleaned text
  const buildChunks = useCallback(() => {
    const cleaned = cleanTextForTTS(text);
    const maxChunkSize = 180;
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
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
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentChunkIndex(0);
    currentChunkRef.current = 0;
  }, []);

  const speakFromChunk = useCallback(
    (startIndex: number) => {
      const synth = synthRef.current;
      if (!synth) return;

      const chunks = chunksRef.current;
      let chunkIndex = startIndex;

      const speakNext = () => {
        if (!isPlayingRef.current) return;
        if (chunkIndex >= chunks.length) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsPaused(false);
          setProgress(100);
          setCurrentChunkIndex(chunks.length - 1);
          onChunkChange?.(chunks.length - 1, chunks.length);
          toast.success(lang === 'es' ? 'Lectura completada' : 'Reading complete');
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
        utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = speedRef.current;

        utterance.onstart = () => {
          currentChunkRef.current = chunkIndex;
          setCurrentChunkIndex(chunkIndex);
          const pct = Math.round((chunkIndex / chunks.length) * 100);
          setProgress(pct);
          onChunkChange?.(chunkIndex, chunks.length);
        };

        utterance.onend = () => {
          chunkIndex++;
          const pct = Math.round((chunkIndex / chunks.length) * 100);
          setProgress(pct);
          speakNext();
        };

        utterance.onerror = (e) => {
          // Ignore 'interrupted' errors (from cancel during speed change)
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsPaused(false);
        };

        synth.speak(utterance);
      };

      speakNext();
    },
    [lang, onChunkChange]
  );

  const play = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    // Fresh start
    synth.cancel();
    const chunks = buildChunks();
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);
    isPlayingRef.current = true;
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
    const synth = synthRef.current;
    if (synth) synth.cancel();
    isPlayingRef.current = false;

    setTimeout(() => {
      const chunks = buildChunks();
      chunksRef.current = chunks;
      setTotalChunks(chunks.length);
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(0);
      setCurrentChunkIndex(0);
      currentChunkRef.current = 0;
      speakFromChunk(0);
    }, 100);
  }, [buildChunks, speakFromChunk]);

  // Live speed change: restart from current chunk with new speed
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      speedRef.current = newSpeed;

      if (isPlaying || isPaused) {
        const synth = synthRef.current;
        if (!synth) return;
        synth.cancel();
        const resumeFrom = currentChunkRef.current;
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsPaused(false);
        setTimeout(() => {
          speakFromChunk(resumeFrom);
        }, 50);
      }
    },
    [isPlaying, isPaused, speakFromChunk]
  );

  // Seek to a specific chunk via progress bar
  const handleSeek = useCallback(
    (value: number[]) => {
      const pct = value[0];
      const chunks = chunksRef.current;
      if (chunks.length === 0) {
        // Initialize chunks if not yet built
        const builtChunks = buildChunks();
        chunksRef.current = builtChunks;
        setTotalChunks(builtChunks.length);
      }
      const total = chunksRef.current.length;
      const targetChunk = Math.min(Math.floor((pct / 100) * total), total - 1);

      setProgress(pct);
      setCurrentChunkIndex(targetChunk);
      currentChunkRef.current = targetChunk;

      const synth = synthRef.current;
      if (synth && (isPlaying || isPaused)) {
        synth.cancel();
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsPaused(false);
        setTimeout(() => {
          speakFromChunk(targetChunk);
        }, 50);
      }
    },
    [isPlaying, isPaused, buildChunks, speakFromChunk]
  );

  // Skip forward/backward by chunks
  const skipChunks = useCallback(
    (delta: number) => {
      const chunks = chunksRef.current;
      if (chunks.length === 0) return;
      const target = Math.max(0, Math.min(currentChunkRef.current + delta, chunks.length - 1));

      const synth = synthRef.current;
      if (synth) synth.cancel();

      currentChunkRef.current = target;
      setCurrentChunkIndex(target);
      const pct = Math.round((target / chunks.length) * 100);
      setProgress(pct);

      if (isPlaying || isPaused) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsPaused(false);
        setTimeout(() => {
          speakFromChunk(target);
        }, 50);
      }
    },
    [isPlaying, isPaused, speakFromChunk]
  );

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const isActive = isPlaying || isPaused || progress > 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play/Pause */}
        <Button
          variant={isPlaying ? 'default' : isPaused ? 'secondary' : 'outline'}
          size="sm"
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          className="gap-2"
          aria-label={isPlaying ? (lang === 'es' ? 'Pausar' : 'Pause') : isPaused ? (lang === 'es' ? 'Continuar' : 'Resume') : (lang === 'es' ? 'Escuchar' : 'Listen')}
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
              <Play className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Escuchar' : 'Listen'}
            </>
          )}
        </Button>

        {/* Skip back */}
        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipChunks(-3)}
            className="h-8 w-8"
            aria-label={lang === 'es' ? 'Retroceder' : 'Skip back'}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Skip forward */}
        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipChunks(3)}
            className="h-8 w-8"
            aria-label={lang === 'es' ? 'Adelantar' : 'Skip forward'}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Restart */}
        {isActive && (
          <Button variant="ghost" size="sm" onClick={restart} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'es' ? 'Reiniciar' : 'Restart'}
          </Button>
        )}

        {/* Speed control - always visible */}
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
                aria-label={`${lang === 'es' ? 'Velocidad' : 'Speed'} ${s}x`}
                aria-pressed={speed === s}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seekable Progress bar - always visible when active */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Slider
            value={[progress]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleSeek}
            aria-label={lang === 'es' ? 'Progreso de lectura' : 'Reading progress'}
            className="cursor-pointer"
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono min-w-[36px] text-right">
          {progress}%
        </span>
      </div>

      {/* Current position info */}
      {isActive && totalChunks > 0 && (
        <p className="text-xs text-muted-foreground">
          {lang === 'es' ? 'Sección' : 'Section'} {currentChunkIndex + 1} / {totalChunks}
        </p>
      )}
    </div>
  );
}
