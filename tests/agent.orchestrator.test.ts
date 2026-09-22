import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContentPackage: vi.fn(),
}));

vi.mock('../src/services/agent.service', () => ({
  generateContentPackage: mocks.generateContentPackage,
}));

import ContentProposal from '../src/models/ContentProposal';
import File from '../src/models/File';
import {
  approveProposal,
  autoRunAgentForFile,
  rejectProposal,
  runAgentForFile,
} from '../src/services/contentAgent.service';

describe('contentAgent.service — orchestration', () => {
  let mongoServer: MongoMemoryServer;

  const AI_OUTPUT = {
    angle: 'Spotlight angle',
    caption: 'Short caption',
    writeUp: 'Full write-up body',
    hashtags: ['#Tag1', '#Tag2'],
    previewText: 'Preview summary',
    fallbackUsed: false,
    modelUsed: 'openai/gpt-oss-120b:free',
    generationSource: 'ai' as const,
  };

  const createFile = async (status = 'approved') => {
    return File.create({
      name: 'product-photo.jpg',
      type: 'image',
      size: 1024,
      url: '/api/files/test/data',
      tags: ['product', 'launch'],
      description: 'New product render',
      status,
    });
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(() => {
    mocks.generateContentPackage.mockReset();
    mocks.generateContentPackage.mockResolvedValue(AI_OUTPUT);
  });

  afterEach(async () => {
    await File.deleteMany({});
    await ContentProposal.deleteMany({});
    delete process.env.AUTO_AGENT_ENABLED;
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('runAgentForFile', () => {
    it('creates a pending proposal for a file', async () => {
      const file = await createFile();

      const proposal = await runAgentForFile(file._id.toString(), { userId: 'user-1' });

      expect(proposal.fileId.toString()).toBe(file._id.toString());
      expect(proposal.status).toBe('pending');
      expect(proposal.caption).toBe('Short caption');
      expect(proposal.hashtags).toEqual(['#Tag1', '#Tag2']);
      expect(proposal.generationSource).toBe('ai');
      expect(proposal.userId).toBe('user-1');
      expect(mocks.generateContentPackage).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'product-photo.jpg', tags: ['product', 'launch'] }),
        undefined,
        'user-1',
      );
    });

    it('throws NOT_FOUND for a missing file', async () => {
      await expect(runAgentForFile(new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('regenerates in place and resets status to pending', async () => {
      const file = await createFile();
      const first = await runAgentForFile(file._id.toString());

      await approveProposal(first._id.toString());
      expect((await ContentProposal.findById(first._id))!.status).toBe('approved');

      mocks.generateContentPackage.mockResolvedValue({
        ...AI_OUTPUT,
        caption: 'Fresh caption',
        generationSource: 'ai',
      });

      const regenerated = await runAgentForFile(file._id.toString());

      expect(regenerated._id.toString()).toBe(first._id.toString());
      expect(regenerated.caption).toBe('Fresh caption');
      expect(regenerated.status).toBe('pending');
      expect(regenerated.reviewedAt).toBeNull();

      const count = await ContentProposal.countDocuments({ fileId: file._id });
      expect(count).toBe(1);
    });
  });

  describe('approveProposal', () => {
    it('approves a pending proposal and stamps reviewedAt', async () => {
      const file = await createFile();
      const proposal = await runAgentForFile(file._id.toString());

      const approved = await approveProposal(proposal._id.toString());

      expect(approved.status).toBe('approved');
      expect(approved.reviewedAt).toBeInstanceOf(Date);
      expect(approved.feedback).toBeNull();
    });

    it('allows re-approving an already approved proposal', async () => {
      const file = await createFile();
      const proposal = await runAgentForFile(file._id.toString());
      await approveProposal(proposal._id.toString());

      const again = await approveProposal(proposal._id.toString());
      expect(again.status).toBe('approved');
    });
  });

  describe('rejectProposal', () => {
    it('rejects a pending proposal with feedback', async () => {
      const file = await createFile();
      const proposal = await runAgentForFile(file._id.toString());

      const rejected = await rejectProposal(proposal._id.toString(), 'Too formal');

      expect(rejected.status).toBe('rejected');
      expect(rejected.feedback).toBe('Too formal');
      expect(rejected.reviewedAt).toBeInstanceOf(Date);
    });
  });

  describe('autoRunAgentForFile', () => {
    it('skips when AUTO_AGENT_ENABLED is not set', async () => {
      const file = await createFile();
      const result = await autoRunAgentForFile(file._id.toString());

      expect(result.ran).toBe(false);
      expect(mocks.generateContentPackage).not.toHaveBeenCalled();
    });

    it('skips in the test environment even when enabled', async () => {
      process.env.AUTO_AGENT_ENABLED = 'true';
      const file = await createFile();
      const result = await autoRunAgentForFile(file._id.toString());

      expect(result.ran).toBe(false);
    });

    it('runs for an approved file when enabled outside test env', async () => {
      process.env.AUTO_AGENT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      const file = await createFile();

      const result = await autoRunAgentForFile(file._id.toString());

      expect(result.ran).toBe(true);
      expect(result).toHaveProperty('proposal');
    });

    it('does not run twice while a pending proposal exists', async () => {
      process.env.AUTO_AGENT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      const file = await createFile();
      await autoRunAgentForFile(file._id.toString());

      const second = await autoRunAgentForFile(file._id.toString());

      expect(second.ran).toBe(false);
      expect(second).toMatchObject({ reason: 'ALREADY_PENDING' });
      expect(mocks.generateContentPackage).toHaveBeenCalledTimes(1);
    });

    it('does not run for non-approved files', async () => {
      process.env.AUTO_AGENT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      const file = await createFile('rejected');

      const result = await autoRunAgentForFile(file._id.toString());

      expect(result.ran).toBe(false);
      expect(result).toMatchObject({ reason: 'NOT_APPROVED' });
    });
  });
});