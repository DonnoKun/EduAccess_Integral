/**
 * EduAccess - Remediation Progress Page
 * Animated multi-stage progress modal for AI remediation
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  Clock,
  X,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/store/useStore';
import type { RemediationStage, RemediatedContent } from '@/types';

interface RemediationStep {
  id: RemediationStage;
  name: string;
  duration: number;
  service: string;
}

const remediationSteps: RemediationStep[] = [
  { id: 'analyzing', name: 'Analyzing content', duration: 800, service: 'ContentAnalyzer' },
  { id: 'ocr', name: 'Extracting text (OCR)', duration: 2100, service: 'TesseractOCR' },
  { id: 'alt-text', name: 'Generating alt-text', duration: 1500, service: 'ViT-GPT2' },
  { id: 'tts', name: 'Creating audio (TTS)', duration: 1200, service: 'WebSpeechAPI' },
  { id: 'simplification', name: 'Simplifying text', duration: 500, service: 'LLMSimplifier' },
];

export default function RemediatePage() {
  const navigate = useNavigate();
  const { contentId } = useParams<{ contentId: string }>();
  const { 
    currentContent, 
    updateRemediationProgress, 
    setRemediatedContent,
    incrementContentViewed,
    remediationProgress,
  } = useStore();

  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!currentContent) {
      navigate('/search');
      return;
    }

    // Only start if not already running and not paused
    if (isRunning || isPaused || remediationProgress.stage === 'complete') {
      return;
    }

    const runRemediation = async () => {
      setIsRunning(true);
      console.log('🔧 Starting remediation for:', currentContent.title);

      const localCompletedSteps: string[] = [];

      for (let i = 0; i < remediationSteps.length; i++) {
        const step = remediationSteps[i];

        console.log(`✅ Stage ${i + 1}/${remediationSteps.length}: ${step.name}`);

        updateRemediationProgress({
          stage: step.id,
          percentage: ((i + 0.5) / remediationSteps.length) * 100,
          currentService: step.service,
          estimatedTimeRemaining: remediationSteps
            .slice(i)
            .reduce((acc, s) => acc + s.duration, 0) / 1000,
        });

        await new Promise((resolve) => setTimeout(resolve, step.duration));

        localCompletedSteps.push(step.id);
        setCompletedSteps([...localCompletedSteps]);

        updateRemediationProgress({
          stage: step.id,
          percentage: ((i + 1) / remediationSteps.length) * 100,
          servicesCompleted: remediationSteps.slice(0, i + 1).map(s => s.service),
        });
      }

      // Complete remediation
      const totalTime = Date.now() - startTime;
      console.log('✅ Remediation complete in', totalTime, 'ms');

      const remediatedContent: RemediatedContent = {
        originalContentId: contentId || '',
        originalURL: currentContent?.url || '',
        contentType: currentContent?.contentType || '',
        remediatedElements: {
          extractedText: {
            extractedText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            confidence: 95,
            language: 'en',
            processingTimeMs: 2100,
          },
          imageDescriptions: [
            {
              altText: 'Diagram showing the key concepts with labeled components',
              detailedDescription: 'A detailed educational diagram illustrating the main topic with annotations and visual representations.',
              containsText: true,
              confidence: 89,
              processingTimeMs: 1500,
            },
          ],
          audioNarration: {
            audioURL: '/audio/narration.mp3',
            duration: 225,
            format: 'mp3',
            voice: 'en-US-Female',
            speed: 1.0,
            processingTimeMs: 1200,
          },
          simplifiedText: {
            originalText: 'Complex academic terminology...',
            simplifiedText: 'Simpler explanation of the same concepts in easier words.',
            readingLevel: 'middle',
            reductionPercentage: 35,
            processingTimeMs: 500,
          },
        },
        metricsSummary: {
          totalProcessingTimeMs: totalTime,
          servicesUsed: remediationSteps.map((s) => s.service),
          averageConfidence: 89,
          accessibilityScore: 92,
        },
        timestamp: new Date(),
      };

      setRemediatedContent(remediatedContent);
      updateRemediationProgress({ stage: 'complete', percentage: 100 });
      incrementContentViewed();

      console.log('✅ Navigating to content viewer...');
      
      // Navigate to content viewer after short delay
      setTimeout(() => {
        navigate(`/content/${contentId}`);
      }, 1000);
    };

    runRemediation();
  }, [currentContent, isPaused, isRunning, remediationProgress.stage, contentId, navigate, startTime, updateRemediationProgress, setRemediatedContent, incrementContentViewed]);

  const handleCancel = () => {
    navigate('/search');
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (!currentContent) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-card rounded-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: remediationProgress.stage === 'complete' ? 0 : 360 }}
            transition={{ 
              duration: 2, 
              repeat: remediationProgress.stage === 'complete' ? 0 : Infinity, 
              ease: 'linear' 
            }}
            className="inline-block mb-4"
          >
            <Sparkles className="h-12 w-12 text-primary" aria-hidden="true" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">
            {remediationProgress.stage === 'complete' 
              ? 'Remediation Complete!' 
              : 'Remediating Content'}
          </h1>
          <p className="text-muted-foreground">{currentContent.title}</p>
          <p className="text-sm text-muted-foreground">{currentContent.source}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{Math.round(remediationProgress.percentage)}%</span>
          </div>
          <Progress 
            value={remediationProgress.percentage} 
            className="h-3"
          />
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {remediationSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = remediationProgress.stage === step.id && !isCompleted;
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isCompleted 
                    ? 'bg-success/10' 
                    : isCurrent 
                      ? 'bg-primary/10' 
                      : 'bg-muted/50'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                    </motion.div>
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" aria-hidden="true" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isCompleted ? 'text-success' : isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.name}
                  </p>
                  {isCompleted && (
                    <p className="text-xs text-muted-foreground">
                      {(step.duration / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-xs text-primary"
                  >
                    Processing...
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Estimated Time */}
        {remediationProgress.stage !== 'complete' && (
          <p className="text-center text-sm text-muted-foreground mb-6">
            Estimated time remaining: ~{Math.ceil(remediationProgress.estimatedTimeRemaining)} seconds
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {remediationProgress.stage !== 'complete' && (
            <>
              <Button variant="outline" onClick={togglePause}>
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" aria-hidden="true" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" aria-hidden="true" />
                Cancel
              </Button>
            </>
          )}
          {remediationProgress.stage === 'complete' && (
            <Button onClick={() => navigate(`/content/${contentId}`)}>
              <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
              View Content
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
