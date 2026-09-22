import { model, models, Schema, Types } from 'mongoose';

import { ContentProposalDocument } from '../types';
import {
  CONTENT_PROPOSAL_SOURCES,
  CONTENT_PROPOSAL_STATUSES,
} from '../utils/constants';

const contentProposalSchema = new Schema<ContentProposalDocument>(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      trim: true,
      default: '',
    },
    angle: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    writeUp: {
      type: String,
      required: true,
      trim: true,
    },
    hashtags: {
      type: [String],
      default: [],
    },
    previewText: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: CONTENT_PROPOSAL_STATUSES,
      default: 'pending',
      required: true,
    },
    feedback: {
      type: String,
      trim: true,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    modelUsed: {
      type: String,
      trim: true,
      default: 'unknown',
    },
    generationSource: {
      type: String,
      enum: CONTENT_PROPOSAL_SOURCES,
      default: 'ai',
    },
  },
  {
    timestamps: true,
  },
);

contentProposalSchema.index({ fileId: 1 });

const ContentProposal =
  models.ContentProposal ||
  model<ContentProposalDocument>('ContentProposal', contentProposalSchema);

export default ContentProposal;