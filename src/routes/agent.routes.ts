import { Router } from 'express';
import { z } from 'zod';

import * as agentController from '../controllers/agent.controller';
import { validate } from '../middleware/validate';

const router = Router();

const generateSchema = z
  .object({
    userId: z.string().trim().optional(),
    instructions: z.string().trim().optional(),
  })
  .strip();

const listQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    userId: z.string().optional(),
  })
  .strip();

const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid proposal ID'),
});

const fileIdParamSchema = z.object({
  fileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid file ID'),
});

const rejectSchema = z
  .object({
    feedback: z.string().trim().optional(),
  })
  .strip();

const regenerateSchema = z
  .object({
    instructions: z.string().trim().optional(),
  })
  .strip();

router.post(
  '/generate/:fileId',
  validate({ params: fileIdParamSchema, body: generateSchema }),
  agentController.generateForFile,
);

router.get(
  '/proposals',
  validate({ query: listQuerySchema }),
  agentController.listProposals,
);

router.get(
  '/proposals/:id',
  validate({ params: objectIdParamSchema }),
  agentController.getProposal,
);

router.post(
  '/proposals/:id/approve',
  validate({ params: objectIdParamSchema }),
  agentController.approveProposal,
);

router.post(
  '/proposals/:id/reject',
  validate({ params: objectIdParamSchema, body: rejectSchema }),
  agentController.rejectProposal,
);

router.post(
  '/proposals/:id/regenerate',
  validate({ params: objectIdParamSchema, body: regenerateSchema }),
  agentController.regenerateProposal,
);

export default router;