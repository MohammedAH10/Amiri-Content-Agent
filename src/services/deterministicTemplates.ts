import { ContentPackage, GeneratePostResult, PostFormat, SuggestHashtagsResult, Tone } from './ai.service';

const FALLBACK_HASHTAGS = ['#ContentDraft', '#AIUnavailable', '#DraftMode'];

export const fallbackGeneratePost = (
  topic: string,
  tone: Tone | string,
  format: PostFormat | string,
): GeneratePostResult => {
  const content = [
    `[Draft — AI generation unavailable]`,
    ``,
    `${topic}`,
    ``,
    `Tone: ${tone} | Format: ${format}`,
    `---`,
    `This is a placeholder draft. AI generation is temporarily unavailable.`,
    `You can edit this content directly or try again later.`,
  ].join('\n');

  return {
    content,
    variations: [
      { label: 'Short', content: `[Short version] ${topic} [Tone: ${tone}]` },
      { label: 'Professional', content: `[Professional version] ${topic} [Tone: ${tone}]` },
      { label: 'Engaging', content: `[Engaging version] ${topic} [Tone: ${tone}]` },
    ],
    improvements: [
      'AI generation unavailable — no suggestions available.',
      'Try again later to get actionable improvement ideas.',
    ],
    relatedIdeas: [
      `${topic} — explore related perspectives`,
      `${topic} — consider audience-specific angles`,
    ],
    fallbackUsed: true,
  };
};

export const fallbackSuggestHashtags = (postContent: string): SuggestHashtagsResult => {
  const words = postContent
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g) || [];

  const uniqueWords = [...new Set(words)];
  const significantWords = uniqueWords.filter(
    (w) => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has', 'was', 'had', 'our', 'its', 'from', 'with', 'that', 'this', 'have', 'been', 'will', 'were', 'what', 'when', 'where', 'which', 'their', 'them', 'than', 'then', 'also', 'just', 'very', 'well', 'even', 'still', 'already', 'about', 'into', 'over', 'after', 'before', 'between', 'other', 'more', 'such', 'only', 'own', 'same', 'both', 'each', 'few', 'most', 'some', 'any', 'new', 'good', 'first', 'last', 'long', 'great', 'little', 'much', 'many', 'now', 'here', 'there', 'back', 'high', 'down', 'up', 'off', 'out', 'on', 'in', 'at', 'to', 'by', 'as', 'of', 'it', 'is', 'be', 'do', 'so'].includes(w),
  );

  const hashtags = significantWords.length >= 3
    ? significantWords.slice(0, 6).map((w) => `#${w.charAt(0).toUpperCase() + w.slice(1)}`)
    : FALLBACK_HASHTAGS;

  return { hashtags };
};

export const fallbackContentPackage = (
  mediaName: string,
  description = '',
  tags: string[] = [],
): ContentPackage => {
  const topic = description || mediaName;
  const tagText = tags.length > 0 ? tags.join(', ') : 'content';

  const hashtags = tags.length > 0
    ? tags.slice(0, 6).map((t) => `#${t.replace(/\s+/g, '')}`)
    : ['#ContentDrop', '#MediaSeries', '#AgentDraft'];

  return {
    angle: `${topic} — spotlight angle (agent draft)`,
    caption: `[Agent draft — AI offline] ${topic}`,
    writeUp: [
      `[Draft — AI generation unavailable]`,
      ``,
      topic,
      ``,
      `Tags: ${tagText}`,
      `---`,
      `This package was produced by the deterministic fallback template.`,
      `The autonomous agent will draft a richer write-up once the AI provider is reachable.`,
    ].join('\n'),
    hashtags,
    previewText: `AI draft preview for "${mediaName}"`,
  };
};
