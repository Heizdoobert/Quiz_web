// Ids from the client are checked before they reach a query or a PostgREST filter string.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

// Shared prompt/option/explanation validation, reused by both the global
// single-question submission flow and list-contest questions
// so both go through the same quality bar.
export function validateQuestionInput(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}):
  | { valid: true; prompt: string; options: string[]; explanation: string }
  | { valid: false; error: string } {
  const trimmedPrompt = params.prompt?.trim() || '';
  if (trimmedPrompt.length < 15) {
    return { valid: false, error: 'Question prompt must be at least 15 characters long.' };
  }
  if (!Array.isArray(params.options) || params.options.length !== 4) {
    return { valid: false, error: 'Exactly 4 options are required.' };
  }
  if (params.options.some((opt) => !opt?.trim())) {
    return { valid: false, error: 'All 4 options must be filled.' };
  }

  const trimmedOptions = params.options.map((o) => o.trim());
  const lowerOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
  if (lowerOptions.size !== 4) {
    return { valid: false, error: 'All 4 options must be distinct from one another.' };
  }

  if (params.correctIndex < 0 || params.correctIndex > 3) {
    return { valid: false, error: 'Correct option must be between 0 and 3.' };
  }

  const trimmedExplanation = params.explanation?.trim() || '';
  if (trimmedExplanation.length < 20) {
    return {
      valid: false,
      error: 'An educational explanation of at least 20 characters is required to ensure quiz quality.',
    };
  }

  return { valid: true, prompt: trimmedPrompt, options: trimmedOptions, explanation: trimmedExplanation };
}

// Normalizes a prompt for duplicate/spam detection: case-insensitive,
// whitespace-collapsed comparison so re-typing the same question with
// different spacing/casing still counts as a duplicate.
export function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}
