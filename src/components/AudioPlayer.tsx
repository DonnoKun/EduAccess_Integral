/**
 * EduAccess - Audio Player Component
 * Full TTS with play/pause, seekable progress, speed controls,
 * text highlighting sync, and clean markdown removal
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { configureSpeech, warmSpeechVoices } from '@/lib/speech';

interface AudioPlayerProps {
  text: string;
  lang: string;
  disabled?: boolean;
  onChunkChange?: (chunkIndex: number, totalChunks: number) => void;
  onChunkTextChange?: (chunkText: string) => void;
  /** When set, reading position is saved and restored across visits */
  storageKey?: string;
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*{1,3}/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[_~`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.{2,}/g, '.')
    .trim();
}

export default function AudioPlayer({ text, lang, disabled, onChunkChange, onChunkTextChange, storageKey }: AudioPlayerProps) {
  const posKey = storageKey ? `eduaccess-tts:${storageKey}` : null;
  const [nowReading, setNowReading] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const ttsEnabled = useStore((s) => s.visualProfile?.technicalParameters?.enableTTS !== false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chunksRef = useRef<string[]>([]);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(false);
  const currentChunkRef = useRef(0);
  const onChunkChangeRef = useRef(onChunkChange);
  const onChunkTextChangeRef = useRef(onChunkTextChange);

  useEffect(() => {
    onChunkChangeRef.current = onChunkChange;
    onChunkTextChangeRef.current = onChunkTextChange;
  }, [onChunkChange, onChunkTextChange]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    warmSpeechVoices();
    return () => { synthRef.current?.cancel(); };
  }, []);

  useEffect(() => { speedRef.current = speed; }, [speed]);

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

  // Restore saved reading position
  useEffect(() => {
    if (!posKey) return;
    const saved = Number(localStorage.getItem(posKey) || '0');
    const chunks = buildChunks();
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);
    if (saved > 0 && saved < chunks.length) {
      currentChunkRef.current = saved;
      setCurrentChunkIndex(saved);
      setProgress(Math.round((saved / chunks.length) * 100));
    }
  }, [posKey, buildChunks]);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentChunkIndex(0);
    currentChunkRef.current = 0;
    onChunkTextChangeRef.current?.('');
    setNowReading('');
  }, []);

  const speakFromChunk = useCallback((startIndex: number) => {
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
        onChunkChangeRef.current?.(chunks.length - 1, chunks.length);
        onChunkTextChangeRef.current?.('');
        setNowReading('');
        if (posKey) localStorage.removeItem(posKey);
        toast.success(lang === 'es' ? 'Lectura completada' : 'Reading complete');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      configureSpeech(utterance, lang);
      utterance.rate = speedRef.current;

      utterance.onstart = () => {
        currentChunkRef.current = chunkIndex;
        setCurrentChunkIndex(chunkIndex);
        const pct = Math.round((chunkIndex / chunks.length) * 100);
        setProgress(pct);
        onChunkChangeRef.current?.(chunkIndex, chunks.length);
        onChunkTextChangeRef.current?.(chunks[chunkIndex]);
        setNowReading(chunks[chunkIndex]);
        if (posKey) localStorage.setItem(posKey, String(chunkIndex));
      };

      utterance.onend = () => {
        chunkIndex++;
        const pct = Math.round((chunkIndex / chunks.length) * 100);
        setProgress(pct);
        speakNext();
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
      };

      synth.speak(utterance);
    };

    speakNext();
  }, [lang, posKey]);

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

    synth.cancel();
    const chunks = buildChunks();
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    const start = currentChunkRef.current > 0 && currentChunkRef.current < chunks.length ? currentChunkRef.current : 0;
    setProgress(Math.round((start / chunks.length) * 100));
    speakFromChunk(start);
  }, [isPaused, buildChunks, speakFromChunk]);

  const pause = useCallback(() => {
    synthRef.current?.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    synthRef.current?.cancel();
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
      if (posKey) localStorage.removeItem(posKey);
      speakFromChunk(0);
    }, 100);
  }, [buildChunks, speakFromChunk, posKey]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
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
      setTimeout(() => speakFromChunk(resumeFrom), 50);
    }
  }, [isPlaying, isPaused, speakFromChunk]);

  const handleSeek = useCallback((value: number[]) => {
    const pct = value[0];
    if (chunksRef.current.length === 0) {
      const builtChunks = buildChunks();
      chunksRef.current = builtChunks;
      setTotalChunks(builtChunks.length);
    }
    const total = chunksRef.current.length;
    const targetChunk = Math.min(Math.floor((pct / 100) * total), total - 1);
    setProgress(pct);
    setCurrentChunkIndex(targetChunk);
    currentChunkRef.current = targetChunk;
    if (posKey) localStorage.setItem(posKey, String(targetChunk));

    const synth = synthRef.current;
    if (synth && (isPlaying || isPaused)) {
      synth.cancel();
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setTimeout(() => speakFromChunk(targetChunk), 50);
    }
  }, [isPlaying, isPaused, buildChunks, speakFromChunk, posKey]);

  const skipChunks = useCallback((delta: number) => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;
    const target = Math.max(0, Math.min(currentChunkRef.current + delta, chunks.length - 1));
    synthRef.current?.cancel();
    currentChunkRef.current = target;
    setCurrentChunkIndex(target);
    setProgress(Math.round((target / chunks.length) * 100));
    if (isPlaying || isPaused) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setTimeout(() => speakFromChunk(target), 50);
    }
  }, [isPlaying, isPaused, speakFromChunk]);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const isActive = isPlaying || isPaused || progress > 0;

  if (!ttsEnabled) return null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={isPlaying ? 'default' : isPaused ? 'secondary' : 'outline'}
          size="sm"
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          className="gap-2"
          aria-label={isPlaying ? 'Pausar' : isPaused ? 'Continuar' : 'Escuchar'}
        >
          {isPlaying ? (
            <><Pause className="h-4 w-4" /> {lang === 'es' ? 'Pausar' : 'Pause'}</>
          ) : isPaused ? (
            <><Play className="h-4 w-4" /> {lang === 'es' ? 'Continuar' : 'Resume'}</>
          ) : (
            <><Play className="h-4 w-4" /> {lang === 'es' ? 'Escuchar' : 'Listen'}</>
          )}
        </Button>

        {isActive && (
          <>
            <Button variant="ghost" size="icon" onClick={() => skipChunks(-3)} className="h-8 w-8" aria-label="Retroceder">
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skipChunks(3)} className="h-8 w-8" aria-label="Adelantar">
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={restart} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              {lang === 'es' ? 'Reiniciar' : 'Restart'}
            </Button>
          </>
        )}

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
                aria-label={`${s}x`}
                aria-pressed={speed === s}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {(isPlaying || isPaused) && nowReading && (
        <div role="status" aria-live="off" className="rounded-md border-l-4 border-primary bg-primary/10 p-3">
          <p className="text-xs font-semibold text-primary">{lang === 'es' ? 'Leyendo ahora' : 'Now reading'}:</p>
          <p className="break-words">{nowReading}</p>
        </div>
      )}
      {!isPlaying && !isPaused && progress > 0 && progress < 100 && (
        <p className="text-xs text-muted-foreground">
          {lang === 'es' ? 'Pulsa Escuchar para continuar donde te quedaste' : 'Press Listen to resume where you left off'}
        </p>
      )}

      {isActive && totalChunks > 0 && (
        <p className="text-xs text-muted-foreground">
          {lang === 'es' ? 'Sección' : 'Section'} {currentChunkIndex + 1} / {totalChunks}
        </p>
      )}
    </div>
  );
}
