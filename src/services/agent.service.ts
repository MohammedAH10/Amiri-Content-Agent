import { ContentPackage } from './ai.service';
import { callWithFallback, parseAiJson } from './modelRouter.service';
import { fallbackContentPackage } from './deterministicTemplates';
import { logAiRequest } from './auditLog.service';
import logger from '../utils/logger';

export type AgentGenerateResult = ContentPackage & {
  fallbackUsed: boolean;
};

export type AgentGenerateMeta = {
  modelUsed: string;
  generationSource: 'ai' | 'fallback';
};

export type AgentRunOutput = AgentGenerateResult & AgentGenerateMeta;

export type MediaContext = {
  name: string;
  description?: string;
  tags?: string[];
  type?: string;
};

// ── Prompt Builder ──────────────────────────────────────────

export const buildAgentPackagePrompt = (
  media: MediaContext,
  instructions?: string,
): string => {
  const instructionBlock = instructions
    ? `\nCreator instructions (follow strictly): "${instructions}"\n`
    : '';

  return [
    `You are an autonomous social content agent. A creator just dropped a media asset with only a name, a description and tags. Your job is to independently decide the best narrative angle and produce a complete, publishable content package — no further input from the creator is needed.`,
    ``,
    `Media asset:`,
    `- Name: "${media.name}"`,
    `- Type: "${media.type || 'unknown'}"`,
    `- Description: "${media.description || '(none provided)'}"`,
    `- Tags: [${(media.tags || []).join(', ')}]`,
    instructionBlock,
    ``,
    `Recommendations:`,
    `- Choose ONE strong, specific angle for this media (story, education, lifestyle, humour, etc.).`,
    `- "caption" should be a short, punchy social caption (1-2 sentences) that hooks a reader scrolling fast.`,
    `- "writeUp" is the full post body copy (2-4 short paragraphs), expanding the angle with personality.`,
    `- "hashtags" must contain 5-8 relevant hashtags that mix broad + niche tags.`,
    `- "previewText" is a single sentence a human reviewer will see before deciding to approve or reject this package.`,
    ``,
    `Respond ONLY with valid JSON in this exact structure, no markdown fences, no explanation:`,
    `{`,
    `  "angle": "The narrative angle chosen by the agent",`,
    `  "caption": "Short punchy caption",`,
    `  "writeUp": "Full post write-up body copy",`,
    `  "hashtags": ["#Tag1", "#Tag2"],`,
    `  "previewText": "One-sentence summary for the reviewer"`,
    `}`,
    ``,
    `Rules:`,
    `- Every field must be present and non-empty.`,
    `- Write naturally; do not mention that you are an AI or an agent.`,
    `- Match the tone implied by the tags and description.`,
    `- Do not include any text outside the JSON object.`,
  ].join('\n');
};

// ── Validation ───────────────────────────────────────────────

export const isValidContentPackage = (data: unknown): data is ContentPackage => {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  if (typeof d.angle !== 'string' || !d.angle.trim()) return false;
  if (typeof d.caption !== 'string' || !d.caption.trim()) return false;
  if (typeof d.writeUp !== 'string' || !d.writeUp.trim()) return false;
  if (typeof d.previewText !== 'string' || !d.previewText.trim()) return false;

  if (!Array.isArray(d.hashtags) || d.hashtags.length === 0) return false;
  if (!d.hashtags.every((h) => typeof h === 'string' && h.trim().startsWith('#'))) return false;

  return true;
};

// ── Public Service Method ────────────────────────────────────

export const generateContentPackage = async (
  media: MediaContext,
  instructions?: string,
  userId?: string,
): Promise<AgentRunOutput> => {
  const startTime = Date.now();
  const systemPrompt = buildAgentPackagePrompt(media, instructions);
  const inputSummary = `Agent package: media="${media.name}", tags=[${(media.tags || []).join(', ')}]`;

  const modelResult = await callWithFallback(systemPrompt);

  if (modelResult) {
    try {
      const parsed = parseAiJson<ContentPackage>(modelResult.content);

      if (!isValidContentPackage(parsed)) {
        logger.error('Agent AI response missing expected fields, falling back to template', { parsed });
        await logAgentFailure(userId, inputSummary, modelResult.modelUsed, Date.now() - startTime, 'AI response missing expected fields');
        return buildFallbackRun(media);
      }

      await logAiRequest({
        userId,
        requestType: 'agent',
        inputSummary,
        modelUsed: modelResult.modelUsed,
        latencyMs: modelResult.latencyMs,
        success: true,
        fallbackUsed: modelResult.fallbackUsed,
      });

      return {
        ...parsed,
        fallbackUsed: modelResult.fallbackUsed,
        modelUsed: modelResult.modelUsed,
        generationSource: 'ai',
      };
    } catch {
      logger.warn('Failed to parse agent AI response, using deterministic template');
      await logAgentFailure(userId, inputSummary, modelResult.modelUsed, Date.now() - startTime, 'Failed to parse AI JSON response');
      return buildFallbackRun(media);
    }
  }

  logger.warn('AI providers unavailable, returning deterministic fallback template');
  await logAgentFailure(userId, inputSummary, 'none', Date.now() - startTime, 'All AI providers unavailable');
  return buildFallbackRun(media);
};

const logAgentFailure = async (
  userId: string | undefined,
  inputSummary: string,
  modelUsed: string,
  latencyMs: number,
  errorMessage: string,
): Promise<void> => {
  await logAiRequest({
    userId,
    requestType: 'agent',
    inputSummary,
    modelUsed,
    latencyMs,
    success: false,
    fallbackUsed: true,
    errorMessage,
  });
};

const buildFallbackRun = (media: MediaContext): AgentRunOutput => {
  const fallback = fallbackContentPackage(media.name, media.description, media.tags || []);
  return {
    ...fallback,
    fallbackUsed: true,
    modelUsed: 'template',
    generationSource: 'fallback',
  };
};