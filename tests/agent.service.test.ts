import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callWithFallback: vi.fn(),
  logAiRequest: vi.fn(),
}));

vi.mock('../src/services/modelRouter.service', () => ({
  callWithFallback: mocks.callWithFallback,
  parseAiJson: (raw: string) => JSON.parse(raw),
}));

vi.mock('../src/services/auditLog.service', () => ({
  logAiRequest: mocks.logAiRequest,
}));

import {
  AgentRunOutput,
  buildAgentPackagePrompt,
  generateContentPackage,
  isValidContentPackage,
} from '../src/services/agent.service';

const VALID_PACKAGE = {
  angle: 'Behind-the-scenes product spotlight',
  caption: 'Meet the tool that changed our workflow.',
  writeUp: 'We shipped something new. Here is why it matters.',
  hashtags: ['#Launch', '#Productivity', '#NewTools'],
  previewText: 'A spotlight post introducing the product to the feed.',
};

describe('agent.service — content package generation', () => {
  beforeEach(() => {
    mocks.callWithFallback.mockReset();
    mocks.logAiRequest.mockReset();
  });

  describe('buildAgentPackagePrompt', () => {
    it('includes media name, description and tags', () => {
      const prompt = buildAgentPackagePrompt({
        name: 'product-photo.jpg',
        description: 'New product render',
        tags: ['product', 'launch'],
        type: 'image',
      });

      expect(prompt).toContain('product-photo.jpg');
      expect(prompt).toContain('New product render');
      expect(prompt).toContain('product');
      expect(prompt).toContain('launch');
      expect(prompt).toContain('"hashtags"');
    });

    it('appends creator instructions when provided', () => {
      const prompt = buildAgentPackagePrompt({ name: 'a.jpg' }, 'Make it playful');
      expect(prompt).toContain('Make it playful');
    });
  });

  describe('isValidContentPackage', () => {
    it('accepts a well-formed package', () => {
      expect(isValidContentPackage(VALID_PACKAGE)).toBe(true);
    });

    it('rejects missing caption', () => {
      expect(isValidContentPackage({ ...VALID_PACKAGE, caption: '' })).toBe(false);
    });

    it('rejects empty or non-hashtag hashtags', () => {
      expect(isValidContentPackage({ ...VALID_PACKAGE, hashtags: [] })).toBe(false);
      expect(isValidContentPackage({ ...VALID_PACKAGE, hashtags: ['nohash'] })).toBe(false);
    });

    it('rejects non-objects', () => {
      expect(isValidContentPackage(null)).toBe(false);
      expect(isValidContentPackage('str')).toBe(false);
    });
  });

  describe('generateContentPackage', () => {
    it('returns the parsed package when the model responds with valid JSON', async () => {
      mocks.callWithFallback.mockResolvedValue({
        content: JSON.stringify(VALID_PACKAGE),
        modelUsed: 'openai/gpt-oss-120b:free',
        latencyMs: 123,
        fallbackUsed: false,
      });

      const result = await generateContentPackage({
        name: 'product-photo.jpg',
        tags: ['product'],
      }, undefined, 'user-1');

      expect(result.caption).toBe('Meet the tool that changed our workflow.');
      expect(result.hashtags).toContain('#Launch');
      expect(result.generationSource).toBe('ai');
      expect(result.fallbackUsed).toBe(false);
      expect(mocks.logAiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ requestType: 'agent', success: true, userId: 'user-1' }),
      );
    });

    it('falls back to deterministic template on invalid AI JSON shape', async () => {
      mocks.callWithFallback.mockResolvedValue({
        content: JSON.stringify({ angle: 'x' }),
        modelUsed: 'model-x',
        latencyMs: 50,
        fallbackUsed: false,
      });

      const result: AgentRunOutput = await generateContentPackage({
        name: 'team-photo.jpg',
        description: 'Team retreat',
        tags: ['team'],
      });

      expect(result.generationSource).toBe('fallback');
      expect(result.fallbackUsed).toBe(true);
      expect(result.caption).toContain('Agent draft');
      expect(mocks.logAiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, fallbackUsed: true }),
      );
    });

    it('falls back to deterministic template when all models are unavailable', async () => {
      mocks.callWithFallback.mockResolvedValue(null);

      const result = await generateContentPackage({ name: 'x.png', tags: ['tag'] });

      expect(result.generationSource).toBe('fallback');
      expect(result.modelUsed).toBe('template');
      expect(result.hashtags.length).toBeGreaterThan(0);
    });

    it('logs a failed agent request on unparseable response', async () => {
      mocks.callWithFallback.mockResolvedValue({
        content: 'not-json{{{',
        modelUsed: 'model-x',
        latencyMs: 20,
        fallbackUsed: false,
      });

      const result = await generateContentPackage({ name: 'a.jpg' });

      expect(result.generationSource).toBe('fallback');
      expect(mocks.logAiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ requestType: 'agent', success: false }),
      );
    });
  });
});