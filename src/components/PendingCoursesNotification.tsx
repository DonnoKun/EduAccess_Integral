/**
 * PendingCoursesNotification - Shows notifications for incomplete courses
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

interface PendingCourse {
  id: string;
  title: string;
  progress: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  contentData: any;
}

export default function PendingCoursesNotification() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const { currentUser } = useAuthStore();
  const { selectContent } = useStore();
  const [pendingCourses, setPendingCourses] = useState<PendingCourse[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadPending = async () => {
      if (!currentUser?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .neq('status', 'completed')
          .gt('progress_percentage', 0)
          .lt('progress_percentage', 100)
          .order('updated_at', { ascending: false })
          .limit(3);

        if (error || !data) return;

        const courses: PendingCourse[] = data.map((item: any) => ({
          id: item.id,
          title: (item.content_data as any)?.title || lang === 'es' ? 'Curso sin título' : 'Untitled course',
          progress: item.progress_percentage || 0,
          exercisesCompleted: item.exercises_completed || 0,
          exercisesTotal: item.exercises_total || 0,
          contentData: item.content_data,
        }));

        setPendingCourses(courses);
      } catch (err) {
        console.error('Error loading pending courses:', err);
      }
    };

    loadPending();
  }, [currentUser?.id, lang]);

  const handleContinueCourse = (course: PendingCourse) => {
    if (course.contentData) {
      selectContent(course.contentData);
      navigate(`/content/${course.contentData.id || course.id}`);
    }
  };

  if (dismissed || pendingCourses.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <h3 className="font-semibold text-sm">
                  {lang === 'es'
                    ? `Tienes ${pendingCourses.length} curso${pendingCourses.length > 1 ? 's' : ''} pendiente${pendingCourses.length > 1 ? 's' : ''}`
                    : `You have ${pendingCourses.length} pending course${pendingCourses.length > 1 ? 's' : ''}`}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDismissed(true)}
                aria-label={lang === 'es' ? 'Cerrar' : 'Dismiss'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {pendingCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                  onClick={() => handleContinueCourse(course)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleContinueCourse(course); }}
                >
                  <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{course.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={course.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {course.progress}%
                      </span>
                    </div>
                    {course.exercisesTotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'es'
                          ? `${course.exercisesCompleted}/${course.exercisesTotal} ejercicios`
                          : `${course.exercisesCompleted}/${course.exercisesTotal} exercises`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
