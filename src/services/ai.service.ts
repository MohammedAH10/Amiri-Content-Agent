import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { callWithFallback, parseAiJson } from './modelRouter.service';
import { fallbackGeneratePost, fallbackSuggestHashtags } from './deterministicTemplates';
import { logAiRequest } from './auditLog.service';

export type Tone = 'professional' | 'casual' | 'excited';
export type PostFormat = 'short' | 'long' | 'bullet';

export type Variation = { label: string; content: string };

export type GeneratePostResult = {
  content: string;
  variations: Variation[];
  improvements: string[];
  relatedIdeas: string[];
  fallbackUsed: boolean;
};

export type SuggestHashtagsResult = {
  hashtags: string[];
};

export type SuggestImprovementsResult = {
  improvements: string[];
};

export type RelatedIdeasResult = {
  relatedIdeas: string[];
};

export type ContentPackage = {
  angle: string;
  caption: string;
  writeUp: string;
  hashtags: string[];
  previewText: string;
};

// ── Prompt Builders ──────────────────────────────────────────

const FORMAT_INSTRUCTIONS: Record<PostFormat, string> = {
  short: 'Keep the post concise — 2-3 short paragraphs max. Punchy, scannable.',
  long: 'Write a detailed, in-depth post. 4-6 paragraphs with rich context and nuance.',
  bullet: 'Use bullet points or numbered lists. Clear, skimmable formatting.',
};

export const buildGeneratePostPrompt = (
  topic: string,
  tone: Tone,
  format: PostFormat,
): string => {
  return [
    `You are a social media content specialist. Generate a post about the given topic.`,
    ``,
    `Topic: "${topic}"`,
    `Tone: ${tone}`,
    `Format: ${format}`,
    `Format instruction: ${FORMAT_INSTRUCTIONS[format]}`,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "content": "The main post content",`,
    `  "variations": [`,
    `    { "label": "Short", "content": "..." },`,
    `    { "label": "Professional", "content": "..." },`,
    `    { "label": "Engaging", "content": "..." }`,
    `  ],`,
    `  "improvements": ["Suggestion to make the post stronger"],`,
    `  "relatedIdeas": ["Another angle or topic to explore"]`,
    `}`,
    ``,
    `Rules:`,
    `- "content" must be a compelling post matching the requested tone and format.`,
    `- "variations" must contain exactly 3 alternatives with different approaches (labels: "Short", "Professional", "Engaging").`,
    `- "improvements" must contain 2-3 actionable suggestions to strengthen the post.`,
    `- "relatedIdeas" must contain 2-3 related angles or follow-up topics.`,
    `- Every field must be present. Do not include any text outside the JSON object.`,
  ].join('\n');
};

export const buildRegeneratePrompt = (
  previousContent: string,
  topic: string,
  tone: Tone,
  format: PostFormat,
  additionalInstructions?: string,
): string => {
  const instructions = additionalInstructions
    ? `\n\nAdditional user instructions: "${additionalInstructions}"`
    : '';

  return [
    `You are a social media content specialist. Regenerate the following post with improvements based on the instructions.`,
    ``,
    `Topic: "${topic}"`,
    `Tone: ${tone}`,
    `Format: ${format}`,
    `Format instruction: ${FORMAT_INSTRUCTIONS[format]}`,
    ``,
    `Previous version:`,
    `"""`,
    previousContent,
    `"""`,
    instructions,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "content": "The improved main post content",`,
    `  "variations": [`,
    `    { "label": "Short", "content": "..." },`,
    `    { "label": "Professional", "content": "..." },`,
    `    { "label": "Engaging", "content": "..." }`,
    `  ],`,
    `  "improvements": ["Suggestion to make the post stronger"],`,
    `  "relatedIdeas": ["Another angle or topic to explore"]`,
    `}`,
    ``,
    `Rules:`,
    `- "content" must retain the core message but incorporate the requested improvements.`,
    `- "variations" must contain exactly 3 alternatives with different approaches (labels: "Short", "Professional", "Engaging").`,
    `- "improvements" must contain 2-3 actionable suggestions to strengthen the post.`,
    `- "relatedIdeas" must contain 2-3 related angles or follow-up topics.`,
    `- Every field must be present. Do not include any text outside the JSON object.`,
  ].join('\n');
};

export const buildHashtagPrompt = (postContent: string): string => {
  return [
    `You are a social media hashtag specialist. Generate relevant hashtags for the following post content.`,
    ``,
    `Post content: "${postContent}"`,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"]`,
    `}`,
    ``,
    `Rules:`,
    `- Generate 5-10 relevant hashtags.`,
    `- Each hashtag must start with #.`,
    `- Hashtags should be relevant to the content, mixing broad and niche tags.`,
    `- Do not include any text outside the JSON object.`,
  ].join('\n');
};

export const buildMediaRecommendationPrompt = (
  postContent: string,
  fileMetadataList: { name: string; tags: string[] }[],
): string => {
  const filesDescription = fileMetadataList
    .map((f, i) => `${i + 1}. name: "${f.name}", tags: [${f.tags.join(', ')}]`)
    .join('\n');

  return [
    `You are a media recommendation engine. Given the post content and a list of available media files, rank the files by relevance.`,
    ``,
    `Post content: "${postContent}"`,
    ``,
    `Available files:`,
    filesDescription,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "rankings": [{ "index": 1, "score": 0.95, "reason": "why this file matches" }]`,
    `}`,
    ``,
    `Rules:`,
    `- Rank only files relevant to the post content.`,
    `- Score from 0.0 to 1.0 based on relevance.`,
    `- Sort by score descending.`,
    `- Omit files with no relevance.`,
  ].join('\n');
};

export const buildImprovementsPrompt = (postContent: string): string => {
  return [
    `You are a social media content editor. Suggest actionable improvements for the following post content.`,
    ``,
    `Post content: "${postContent}"`,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "improvements": ["Improvement suggestion 1", "Improvement suggestion 2", "Improvement suggestion 3"]`,
    `}`,
    ``,
    `Rules:`,
    `- Provide 3-5 specific, actionable improvement suggestions.`,
    `- Focus on engagement, clarity, tone, and structure.`,
    `- Keep each suggestion concise (1-2 sentences).`,
    `- Do not include any text outside the JSON object.`,
  ].join('\n');
};

export const buildRelatedIdeasPrompt = (postContent: string): string => {
  return [
    `You are a social media content strategist. Suggest related post ideas based on the following content.`,
    ``,
    `Post content: "${postContent}"`,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "relatedIdeas": ["Related idea 1", "Related idea 2", "Related idea 3"]`,
    `}`,
    ``,
    `Rules:`,
    `- Provide 3-5 related post ideas that naturally extend from the given content.`,
    `- Each idea should be a complete mini-brief (1-2 sentences).`,
    `- Cover different angles: educational, inspirational, practical.`,
    `- Do not include any text outside the JSON object.`,
  ].join('\n');
};

// ── Validation ───────────────────────────────────────────────

const VALID_VARIATION_LABELS = ['Short', 'Professional', 'Engaging'];

const isValidVariations = (variations: unknown): variations is Variation[] => {
  if (!Array.isArray(variations) || variations.length === 0) return false;
  return variations.every(
    (v) =>
      v &&
      typeof v === 'object' &&
      typeof (v as Variation).label === 'string' &&
      typeof (v as Variation).content === 'string' &&
      VALID_VARIATION_LABELS.includes((v as Variation).label),
  );
};

const isValidGeneratePostResult = (data: unknown): data is GeneratePostResult => {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  if (typeof d.content !== 'string' || !d.content.trim()) return false;
  if (!isValidVariations(d.variations)) return false;

  if (!Array.isArray(d.improvements)) return false;
  if (!Array.isArray(d.relatedIdeas)) return false;

  return true;
};

// ── Public Service Methods ───────────────────────────────────

export const generatePost = async (
  topic: string,
  tone: Tone = 'professional',
  format: PostFormat = 'short',
  userId?: string,
): Promise<GeneratePostResult> => {
  const startTime = Date.now();
  const systemPrompt = buildGeneratePostPrompt(topic, tone, format);
  const inputSummary = `Generate post: topic="${topic}", tone=${tone}, format=${format}`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<GeneratePostResult>(modelResult.content);

      if (!isValidGeneratePostResult(parsed)) {
        logger.error('AI response missing expected fields, falling back to template', { parsed });
        const fallback = fallbackGeneratePost(topic, tone, format);
        await logAiRequest({
          userId, requestType: 'generate', inputSummary,
          modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
          success: false, fallbackUsed: true,
          errorMessage: 'AI response missing expected fields',
        });
        return fallback;
      }

      await logAiRequest({
        userId, requestType: 'generate', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: modelResult.latencyMs,
        success: true, fallbackUsed: modelResult.fallbackUsed,
      });

      return {
        content: parsed.content,
        variations: parsed.variations,
        improvements: parsed.improvements,
        relatedIdeas: parsed.relatedIdeas,
        fallbackUsed: modelResult.fallbackUsed,
      };
    } catch {
      logger.warn('Failed to parse AI response, using deterministic template');
      const fallback = fallbackGeneratePost(topic, tone, format);
      await logAiRequest({
        userId, requestType: 'generate', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
        success: false, fallbackUsed: true,
        errorMessage: 'Failed to parse AI JSON response',
      });
      return fallback;
    }
  }

  logger.warn('AI providers unavailable, returning deterministic fallback template');
  const fallback = fallbackGeneratePost(topic, tone, format);
  await logAiRequest({
    userId, requestType: 'generate', inputSummary,
    modelUsed: 'none', latencyMs: Date.now() - startTime,
    success: false, fallbackUsed: true,
    errorMessage: 'All AI providers unavailable',
  });
  return fallback;
};

export const regeneratePost = async (
  previousContent: string,
  topic: string,
  tone: Tone = 'professional',
  format: PostFormat = 'short',
  additionalInstructions?: string,
  userId?: string,
): Promise<GeneratePostResult> => {
  const startTime = Date.now();
  const systemPrompt = buildRegeneratePrompt(
    previousContent,
    topic,
    tone,
    format,
    additionalInstructions,
  );
  const inputSummary = `Regenerate: topic="${topic}", tone=${tone}, format=${format}`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<GeneratePostResult>(modelResult.content);

      if (!isValidGeneratePostResult(parsed)) {
        logger.error('AI response missing expected fields, falling back to template', { parsed });
        const fallback = fallbackGeneratePost(topic, tone, format);
        await logAiRequest({
          userId, requestType: 'regenerate', inputSummary,
          modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
          success: false, fallbackUsed: true,
          errorMessage: 'AI response missing expected fields',
        });
        return fallback;
      }

      await logAiRequest({
        userId, requestType: 'regenerate', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: modelResult.latencyMs,
        success: true, fallbackUsed: modelResult.fallbackUsed,
      });

      return {
        content: parsed.content,
        variations: parsed.variations,
        improvements: parsed.improvements,
        relatedIdeas: parsed.relatedIdeas,
        fallbackUsed: modelResult.fallbackUsed,
      };
    } catch {
      logger.warn('Failed to parse AI response, using deterministic template');
      const fallback = fallbackGeneratePost(topic, tone, format);
      await logAiRequest({
        userId, requestType: 'regenerate', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
        success: false, fallbackUsed: true,
        errorMessage: 'Failed to parse AI JSON response',
      });
      return fallback;
    }
  }

  logger.warn('AI providers unavailable, returning deterministic fallback template');
  const fallback = fallbackGeneratePost(topic, tone, format);
  await logAiRequest({
    userId, requestType: 'regenerate', inputSummary,
    modelUsed: 'none', latencyMs: Date.now() - startTime,
    success: false, fallbackUsed: true,
    errorMessage: 'All AI providers unavailable',
  });
  return fallback;
};

export const suggestHashtags = async (
  postContent: string,
  userId?: string,
): Promise<SuggestHashtagsResult> => {
  const startTime = Date.now();
  const systemPrompt = buildHashtagPrompt(postContent);
  const inputSummary = `Hashtags: "${postContent.slice(0, 80)}..."`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<SuggestHashtagsResult>(modelResult.content);

      if (!Array.isArray(parsed.hashtags)) {
        logger.error('AI response missing hashtags array, falling back to keyword extraction', { parsed });
        const fallback = fallbackSuggestHashtags(postContent);
        await logAiRequest({
          userId, requestType: 'hashtags', inputSummary,
          modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
          success: false, fallbackUsed: true,
          errorMessage: 'AI response missing hashtags array',
        });
        return fallback;
      }

      await logAiRequest({
        userId, requestType: 'hashtags', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: modelResult.latencyMs,
        success: true, fallbackUsed: modelResult.fallbackUsed,
      });

      return { hashtags: parsed.hashtags };
    } catch {
      logger.warn('Failed to parse AI response, using keyword-based hashtags');
      const fallback = fallbackSuggestHashtags(postContent);
      await logAiRequest({
        userId, requestType: 'hashtags', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
        success: false, fallbackUsed: true,
        errorMessage: 'Failed to parse AI JSON response',
      });
      return fallback;
    }
  }

  logger.warn('AI providers unavailable, returning keyword-based hashtags');
  const fallback = fallbackSuggestHashtags(postContent);
  await logAiRequest({
    userId, requestType: 'hashtags', inputSummary,
    modelUsed: 'none', latencyMs: Date.now() - startTime,
    success: false, fallbackUsed: true,
    errorMessage: 'All AI providers unavailable',
  });
  return fallback;
};

export const suggestImprovements = async (
  postContent: string,
  userId?: string,
): Promise<SuggestImprovementsResult> => {
  const startTime = Date.now();
  const systemPrompt = buildImprovementsPrompt(postContent);
  const inputSummary = `Improvements: "${postContent.slice(0, 80)}..."`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<SuggestImprovementsResult>(modelResult.content);

      if (!Array.isArray(parsed.improvements) || parsed.improvements.length === 0) {
        logger.error('AI response missing improvements array, falling back', { parsed });
        await logAiRequest({
          userId, requestType: 'improve', inputSummary,
          modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
          success: false, fallbackUsed: true,
          errorMessage: 'AI response missing improvements array',
        });
        return { improvements: ['AI generation unavailable — no suggestions available.'] };
      }

      await logAiRequest({
        userId, requestType: 'improve', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: modelResult.latencyMs,
        success: true, fallbackUsed: modelResult.fallbackUsed,
      });

      return { improvements: parsed.improvements };
    } catch {
      logger.warn('Failed to parse AI response, returning fallback');
      await logAiRequest({
        userId, requestType: 'improve', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
        success: false, fallbackUsed: true,
        errorMessage: 'Failed to parse AI JSON response',
      });
      return { improvements: ['AI generation unavailable — no suggestions available.'] };
    }
  }

  logger.warn('AI providers unavailable, returning fallback');
  await logAiRequest({
    userId, requestType: 'improve', inputSummary,
    modelUsed: 'none', latencyMs: Date.now() - startTime,
    success: false, fallbackUsed: true,
    errorMessage: 'All AI providers unavailable',
  });
  return { improvements: ['AI generation unavailable — no suggestions available.'] };
};

export const relatedPostIdeas = async (
  postContent: string,
  userId?: string,
): Promise<RelatedIdeasResult> => {
  const startTime = Date.now();
  const systemPrompt = buildRelatedIdeasPrompt(postContent);
  const inputSummary = `Related ideas: "${postContent.slice(0, 80)}..."`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<RelatedIdeasResult>(modelResult.content);

      if (!Array.isArray(parsed.relatedIdeas) || parsed.relatedIdeas.length === 0) {
        logger.error('AI response missing relatedIdeas array, falling back', { parsed });
        await logAiRequest({
          userId, requestType: 'related', inputSummary,
          modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
          success: false, fallbackUsed: true,
          errorMessage: 'AI response missing relatedIdeas array',
        });
        return { relatedIdeas: ['AI generation unavailable — no ideas available.'] };
      }

      await logAiRequest({
        userId, requestType: 'related', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: modelResult.latencyMs,
        success: true, fallbackUsed: modelResult.fallbackUsed,
      });

      return { relatedIdeas: parsed.relatedIdeas };
    } catch {
      logger.warn('Failed to parse AI response, returning fallback');
      await logAiRequest({
        userId, requestType: 'related', inputSummary,
        modelUsed: modelResult.modelUsed, latencyMs: Date.now() - startTime,
        success: false, fallbackUsed: true,
        errorMessage: 'Failed to parse AI JSON response',
      });
      return { relatedIdeas: ['AI generation unavailable — no ideas available.'] };
    }
  }

  logger.warn('AI providers unavailable, returning fallback');
  await logAiRequest({
    userId, requestType: 'related', inputSummary,
    modelUsed: 'none', latencyMs: Date.now() - startTime,
    success: false, fallbackUsed: true,
    errorMessage: 'All AI providers unavailable',
  });
  return { relatedIdeas: ['AI generation unavailable — no ideas available.'] };
};
