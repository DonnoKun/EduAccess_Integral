/** Pure accessibility rules shared with regression tests. */
export const LOW_VISION_AUDIENCE = 'students with low vision (mild and moderate visual disability), supported by enlarged text, high contrast, rich visual descriptions and optional listening';

export function visionContent(metadata: unknown, imageUrl?: string) {
  const content: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] = [
    // Image bytes travel only as an image part; serialized into text they bill as ~1M input tokens.
    { type: 'text', text: JSON.stringify(metadata, (key, value) => (key === 'imageUrl' || (typeof value === 'string' && value.startsWith('data:image/'))) ? undefined : value) },
  ];
  if (imageUrl) content.push({ type: 'image_url', image_url: { url: imageUrl } });
  return content;
}

export const shortAlt = (text: string) => Array.from(text.trim()).slice(0, 125).join('');

export const LEVEL_RULES: Record<string, string> = {
  elementary: 'Elementary school (ages 6-11): sentences under 15 words, numbers under 1000, concrete everyday examples, short sentences, define each new word. No assumed algebra or advanced terminology.',
  middle: 'Middle school (ages 12-15): moderate sentences, introduce formal terms with definitions; explain foundations, basic terminology and simple calculations step by step.',
  high: 'High school (ages 15-18): algebraic notation and formulas allowed; rigorous explanations with appropriate subject vocabulary; explain prerequisites and formulas.',
  college: 'College/university: formal notation, proofs or derivations where relevant, references to theory; advanced vocabulary, analytical depth, formal reasoning and prerequisite-aware explanations.',
};
export const FORMAT_RULES: Record<string, string> = {
  article: 'Explanatory article: 3-4 narrative sections, 2 examples and 3 practice exercises. Images only when useful.',
  textbook: 'Textbook chapter: 4-6 in-depth sections, definitions, worked examples, and 5-8 exercises with solutions.',
  exercise: 'Practice worksheet: at most 2 brief explanatory sections, 1 worked example, and 10-12 progressive exercises. Most of the lesson must be exercises and detailed step-by-step solutions. Leave image_prompt empty unless indispensable.',
  diagram: 'Visual diagram lesson: 3-4 diagram-centered sections with an English image_prompt in each. Explain nodes, arrows, spatial relationships, colors and a rich textual walkthrough. Include 2 diagram interpretation exercises.',
};
export function lessonRules(type: string, level: string) {
  return `${LEVEL_RULES[level] || LEVEL_RULES.high}\n${FORMAT_RULES[type] || FORMAT_RULES.article}\nCreate exactly ONE lesson at this level and format. Never create alternative versions. Audience: ${LOW_VISION_AUDIENCE}. Keep visual explanations alongside text and audio. Format and level rules override generic section counts and university-depth requirements.`;
}

export function isDuplicateEmail(error: { code?: string; message?: string }) {
  return ['email_exists', 'user_already_exists'].includes(error.code || '') || /already.*(registered|exists)|duplicate.*email/i.test(error.message || '');
}