/**
 * EduAccess - Reading Guide Component
 * Horizontal line that follows the user's cursor to aid reading
 * Global component that persists across all pages
 */

import { useEffect, useState } from 'react';

interface ReadingGuideProps {
  enabled: boolean;
}

export default function ReadingGuide({ enabled }: ReadingGuideProps) {
  const [position, setPosition] = useState({ y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div 
      className="reading-guide"
      style={{ top: `${position.y}px` }}
      aria-hidden="true"
    />
  );
}
