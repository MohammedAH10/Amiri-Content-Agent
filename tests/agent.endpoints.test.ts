import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runAgentForFile: vi.fn(),
  listProposals: vi.fn(),
  getProposalById: vi.fn(),
  approveProposal: vi.fn(),
  rejectProposal: vi.fn(),
  regenerateProposal: vi.fn(),
}));

vi.mock('../src/services/contentAgent.service', () => ({
  runAgentForFile: mocks.runAgentForFile,
  listProposals: mocks.listProposals,
  getProposalById: mocks.getProposalById,
  approveProposal: mocks.approveProposal,
  rejectProposal: mocks.rejectProposal,
  regenerateProposal: mocks.regenerateProposal,
}));

import app from '../src/app';

const OBJECT_ID = new mongoose.Types.ObjectId().toString();
const FILE_ID = new mongoose.Types.ObjectId().toString();

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => OBJECT_ID },
    fileId: { toString: () => FILE_ID },
    userId: 'user-1',
    angle: 'Spotlight angle',
    caption: 'Short caption',
    writeUp: 'Full write-up body',
    hashtags: ['#Tag1', '#Tag2'],
    previewText: 'Preview summary',
    instructions: null,
    status: 'pending',
    feedback: null,
    reviewedAt: null,
    modelUsed: 'openai/gpt-oss-120b:free',
    generationSource: 'ai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    toObject: () => ({ fileId: { _id: { toString: () => FILE_ID } } }),
    ...overrides,
  };
}

describe('Agent API', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    Object.values(mocks).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /agent/generate/:fileId', () => {
    it('generates a proposal for a file', async () => {
      mocks.runAgentForFile.mockResolvedValue(makeProposal());

      const response = await request(app)
        .post(`/agent/generate/${FILE_ID}`)
        .send({ userId: 'user-1', instructions: 'Make it playful' })
        .expect(201);

      expect(mocks.runAgentForFile).toHaveBeenCalledWith(FILE_ID, {
        userId: 'user-1',
        instructions: 'Make it playful',
      });
      expect(response.body.success).toBe(true);
      expect(response.body.data.caption).toBe('Short caption');
      expect(response.body.data.fileId).toBe(FILE_ID);
      expect(response.body.data.status).toBe('pending');
    });

    it('returns 400 for an invalid file id', async () => {
      const response = await request(app)
        .post('/agent/generate/not-a-valid-id')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /agent/proposals', () => {
    it('lists proposals', async () => {
      mocks.listProposals.mockResolvedValue([makeProposal(), makeProposal({ status: 'approved' })]);

      const response = await request(app).get('/agent/proposals').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data[0].caption).toBe('Short caption');
    });

    it('passes status and userId filters through', async () => {
      mocks.listProposals.mockResolvedValue([]);

      await request(app).get('/agent/proposals?status=approved&userId=user-1').expect(200);

      expect(mocks.listProposals).toHaveBeenCalledWith({
        status: 'approved',
        userId: 'user-1',
      });
    });

    it('rejects an unknown status filter', async () => {
      const response = await request(app)
        .get('/agent/proposals?status=bogus')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /agent/proposals/:id', () => {
    it('returns a single proposal', async () => {
      mocks.getProposalById.mockResolvedValue(makeProposal({ status: 'approved' }));

      const response = await request(app).get(`/agent/proposals/${OBJECT_ID}`).expect(200);

      expect(response.body.data.id).toBe(OBJECT_ID);
      expect(response.body.data.status).toBe('approved');
    });

    it('returns 400 for an invalid proposal id', async () => {
      const response = await request(app).get('/agent/proposals/bad-id').expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /agent/proposals/:id/approve', () => {
    it('approves a proposal', async () => {
      mocks.approveProposal.mockResolvedValue(makeProposal({ status: 'approved' }));

      const response = await request(app)
        .post(`/agent/proposals/${OBJECT_ID}/approve`)
        .expect(200);

      expect(response.body.data.status).toBe('approved');
    });
  });

  describe('POST /agent/proposals/:id/reject', () => {
    it('rejects a proposal with feedback', async () => {
      mocks.rejectProposal.mockResolvedValue(makeProposal({ status: 'rejected', feedback: 'Too formal' }));

      const response = await request(app)
        .post(`/agent/proposals/${OBJECT_ID}/reject`)
        .send({ feedback: 'Too formal' })
        .expect(200);

      expect(mocks.rejectProposal).toHaveBeenCalledWith(OBJECT_ID, 'Too formal');
      expect(response.body.data.status).toBe('rejected');
    });

    it('rejects without feedback', async () => {
      mocks.rejectProposal.mockResolvedValue(makeProposal({ status: 'rejected' }));

      await request(app).post(`/agent/proposals/${OBJECT_ID}/reject`).send({}).expect(200);

      expect(mocks.rejectProposal).toHaveBeenCalledWith(OBJECT_ID, undefined);
    });
  });

  describe('POST /agent/proposals/:id/regenerate', () => {
    it('regenerates a proposal with optional instructions', async () => {
      mocks.regenerateProposal.mockResolvedValue(makeProposal({ status: 'pending' }));

      const response = await request(app)
        .post(`/agent/proposals/${OBJECT_ID}/regenerate`)
        .send({ instructions: 'More casual' })
        .expect(200);

      expect(mocks.regenerateProposal).toHaveBeenCalledWith(OBJECT_ID, 'More casual');
      expect(response.body.data.status).toBe('pending');
    });
  });
});