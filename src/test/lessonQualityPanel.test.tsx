import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LessonQualityPanel from '@/components/LessonQualityPanel';
import type { LessonQuality } from '../../supabase/functions/generate-course-content/quality';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'es' } }) }));
afterEach(cleanup);

const quality: LessonQuality = {
  coverage: 50,
  confidence: 'high',
  covered_topics: ['Fotosíntesis'],
  missing_topics: ['Respiración celular'],
  superficial_topics: [],
  control_topics: ['Fotosíntesis', 'Respiración celular'],
  review_flags: [{ kind: 'short_section', message: 'Sección breve: revisar profundidad.', section_index: 0 }],
  length_ok: false,
  word_count: 1200,
  status: 'reviewed',
};

describe('panel de cobertura para estudiantes', () => {
  it('muestra las señales guardadas sin acciones docentes ni nuevas llamadas de IA', () => {
    const onReview = vi.fn();
    const onEdit = vi.fn();
    const onRegenerate = vi.fn();
    render(<LessonQualityPanel quality={quality} audience="student" onReview={onReview} onEdit={onEdit} onRegenerate={onRegenerate} />);

    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('Fotosíntesis')).toBeTruthy();
    expect(screen.getByText('Respiración celular')).toBeTruthy();
    expect(screen.getByText(/Revisa las fuentes y consulta a tu docente/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Evaluar cobertura' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Regenerar sección' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver / descargar reporte' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar reporte PDF' })).toBeTruthy();
    expect(onReview).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it('mantiene las acciones de revisión para el docente', () => {
    render(<LessonQualityPanel quality={quality} onReview={vi.fn()} onEdit={vi.fn()} onRegenerate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Evaluar cobertura' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Regenerar sección' })).toBeTruthy();
  });
});
