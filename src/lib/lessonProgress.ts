export function lessonPercentage(saved: number, correct: number, total: number, completed = false) {
  if (completed) return 100;
  return Math.max(saved, total > 0 ? Math.round((correct / total) * 100) : 0);
}