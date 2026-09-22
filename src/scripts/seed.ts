import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const seed = async (): Promise<void> => {
  console.log('Starting local MongoDB instance...');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log(`Connected to ${uri}`);

  await mongoose.connect(uri);

  console.log('Inserting seed files...');

  const filesCollection = mongoose.connection.db!.collection('files');
  const postDraftsCollection = mongoose.connection.db!.collection('postdrafts');
  const aiLogsCollection = mongoose.connection.db!.collection('ailogs');
  const contentProposalsCollection = mongoose.connection.db!.collection('contentproposals');
  const now = new Date();

  const seedFiles = [
    {
      name: 'product-launch-campaign.png',
      type: 'image',
      mimeType: 'image/png',
      size: 204800,
      url: 'https://s3.example.com/files/product-launch-campaign.png',
      s3Key: 'uploads/product-launch-campaign.png',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/product-launch-campaign.png',
      tags: ['product', 'launch', 'marketing', 'campaign'],
      description: 'Product launch campaign banner image for Q3',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'team-culture-video.mp4',
      type: 'video',
      mimeType: 'video/mp4',
      size: 52428800,
      url: 'https://s3.example.com/files/team-culture-video.mp4',
      s3Key: 'uploads/team-culture-video.mp4',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/team-culture-video.mp4',
      tags: ['team', 'culture', 'behind-the-scenes'],
      description: 'Behind the scenes team culture video',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'q4-finance-report.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: 1048576,
      url: 'https://s3.example.com/files/q4-finance-report.pdf',
      s3Key: 'uploads/q4-finance-report.pdf',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/q4-finance-report.pdf',
      tags: ['finance', 'quarterly', 'report'],
      description: 'Q4 financial performance report',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'brand-logo-header.svg',
      type: 'image',
      mimeType: 'image/svg+xml',
      size: 45056,
      url: 'https://s3.example.com/files/brand-logo-header.svg',
      s3Key: 'uploads/brand-logo-header.svg',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/brand-logo-header.svg',
      tags: ['brand', 'logo', 'header'],
      description: 'Brand logo for website header',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'customer-testimonial-intro.mp3',
      type: 'audio',
      mimeType: 'audio/mpeg',
      size: 8388608,
      url: 'https://s3.example.com/files/customer-testimonial-intro.mp3',
      s3Key: 'uploads/customer-testimonial-intro.mp3',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/customer-testimonial-intro.mp3',
      tags: ['customer', 'testimonial', 'audio'],
      description: 'Customer testimonial audio recording',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'feature-demo-screenshot.png',
      type: 'image',
      mimeType: 'image/png',
      size: 512000,
      url: 'https://s3.example.com/files/feature-demo-screenshot.png',
      s3Key: 'uploads/feature-demo-screenshot.png',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/feature-demo-screenshot.png',
      tags: ['feature', 'demo', 'product'],
      description: 'Feature demonstration screenshot',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'rejected-inappropriate-content.jpg',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 150000,
      url: 'https://s3.example.com/files/rejected-inappropriate-content.jpg',
      s3Key: 'uploads/rejected-inappropriate-content.jpg',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/rejected-inappropriate-content.jpg',
      tags: ['flagged'],
      description: '',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'rejected',
      moderationReason: 'Content violates community guidelines',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'rejected-copyright-video.mp4',
      type: 'video',
      mimeType: 'video/mp4',
      size: 31457280,
      url: 'https://s3.example.com/files/rejected-copyright-video.mp4',
      s3Key: 'uploads/rejected-copyright-video.mp4',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/rejected-copyright-video.mp4',
      tags: ['music', 'video'],
      description: '',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'rejected',
      moderationReason: 'Copyright infringement detected',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'pending-upload-image.png',
      type: 'image',
      mimeType: 'image/png',
      size: 300000,
      url: 'https://s3.example.com/files/pending-upload-image.png',
      s3Key: 'uploads/pending-upload-image.png',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/pending-upload-image.png',
      tags: ['pending', 'upload'],
      description: '',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'upload_initiated',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'scanning-document.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: 2048000,
      url: 'https://s3.example.com/files/scanning-document.pdf',
      s3Key: 'uploads/scanning-document.pdf',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/scanning-document.pdf',
      tags: ['scanning', 'pending'],
      description: '',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'scan_in_progress',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'pending-review-content.mp4',
      type: 'video',
      mimeType: 'video/mp4',
      size: 41943040,
      url: 'https://s3.example.com/files/pending-review-content.mp4',
      s3Key: 'uploads/pending-review-content.mp4',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/pending-review-content.mp4',
      tags: ['user-generated', 'review'],
      description: 'User-generated content pending admin review',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'pending_review',
      moderationReason: 'Flagged for admin review — safety score 72',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'social-media-banner.jpg',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 750000,
      url: 'https://s3.example.com/files/social-media-banner.jpg',
      s3Key: 'uploads/social-media-banner.jpg',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/social-media-banner.jpg',
      tags: ['social', 'banner', 'marketing'],
      description: 'Social media campaign banner',
      ownerId: 'demo-user',
      visibility: 'public',
      status: 'approved',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'rejected-offensive-audio.mp3',
      type: 'audio',
      mimeType: 'audio/mpeg',
      size: 4194304,
      url: 'https://s3.example.com/files/rejected-offensive-audio.mp3',
      s3Key: 'uploads/rejected-offensive-audio.mp3',
      s3Bucket: 't-world-media',
      s3Url: 'https://t-world-media.s3.amazonaws.com/uploads/rejected-offensive-audio.mp3',
      tags: ['audio'],
      description: '',
      ownerId: 'demo-user',
      visibility: 'private',
      status: 'rejected',
      moderationReason: 'Contains offensive language',
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const fileResult = await filesCollection.insertMany(seedFiles);

  console.log(`Successfully seeded ${Object.keys(fileResult.insertedIds).length} files:`);
  console.log(`  Approved:         ${seedFiles.filter((f) => f.status === 'approved').length}`);
  console.log(`  Rejected:         ${seedFiles.filter((f) => f.status === 'rejected').length}`);
  console.log(`  Upload Initiated: ${seedFiles.filter((f) => f.status === 'upload_initiated').length}`);
  console.log(`  Scan In Progress: ${seedFiles.filter((f) => f.status === 'scan_in_progress').length}`);
  console.log(`  Pending Review:   ${seedFiles.filter((f) => f.status === 'pending_review').length}`);

  // Seed PostDrafts
  console.log('');
  console.log('Inserting seed post drafts...');

  const seedDrafts = [
    {
      userId: 'demo-user',
      inputText: 'Write a post about our new AI-powered education platform launching next month',
      tone: 'professional',
      format: 'short',
      generatedContent: {
        content: 'We are excited to announce the upcoming launch of our AI-powered education platform, designed to transform how students learn and educators teach.',
        variations: [
          { label: 'Short', content: 'Big news! Our AI education platform launches next month. Stay tuned.' },
          { label: 'Professional', content: 'We are pleased to announce the upcoming launch of our AI-powered education platform.' },
          { label: 'Engaging', content: 'The future of education is almost here. Our AI platform launches next month!' },
        ],
        improvements: [
          'Add specific launch date to create urgency',
          'Include a teaser about key features',
          'Mention target audience (students/educators)',
        ],
        relatedIdeas: [
          'Post about student success stories using the platform',
          'Behind-the-scenes post on platform development',
          'Educator testimonial about AI in education',
        ],
        fallbackUsed: false,
      },
      selectedVariation: null,
      acceptedOutput: null,
      attachedFileIds: [],
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'demo-user',
      inputText: 'Announce our Q4 results showing 40% growth in student enrollment',
      tone: 'professional',
      format: 'short',
      generatedContent: {
        content: 'We are proud to share our Q4 results: 40% growth in student enrollment year-over-year, driven by our expanded course catalog and AI-powered learning tools.',
        variations: [
          { label: 'Short', content: 'Q4 was huge: 40% enrollment growth. Thank you to our students and team!' },
          { label: 'Professional', content: 'Q4 Performance Update: 40% year-over-year growth in student enrollment.' },
        ],
        improvements: [
          'Add specific numbers for impact',
          'Mention key drivers of growth',
        ],
        relatedIdeas: [
          'Post about course catalog expansion',
          'Student testimonial about learning experience',
        ],
        fallbackUsed: false,
      },
      selectedVariation: 'Q4 was huge: 40% enrollment growth. Thank you to our students and team!',
      acceptedOutput: 'We are proud to share our Q4 results: 40% growth in student enrollment year-over-year, driven by our expanded course catalog and AI-powered learning tools.',
      attachedFileIds: [],
      status: 'accepted',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const draftResult = await postDraftsCollection.insertMany(seedDrafts);
  const draftIds = Object.values(draftResult.insertedIds);

  console.log(`Successfully seeded ${draftIds.length} post drafts:`);
  console.log(`  Draft:    ${seedDrafts.filter((d) => d.status === 'draft').length}`);
  console.log(`  Accepted: ${seedDrafts.filter((d) => d.status === 'accepted').length}`);

  // Seed AiLogs
  console.log('');
  console.log('Inserting seed AI logs...');

  const seedLogs = [
    {
      userId: 'demo-user',
      requestType: 'generate',
      inputSummary: 'Write a post about our new AI-powered education platform launching next month',
      modelUsed: 'openai/gpt-oss-120b:free',
      latencyMs: 1842,
      success: true,
      fallbackUsed: false,
      tokenEstimate: 320,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'demo-user',
      requestType: 'hashtags',
      inputSummary: 'Generate hashtags for education platform launch post',
      modelUsed: 'openai/gpt-oss-120b:free',
      latencyMs: 956,
      success: true,
      fallbackUsed: false,
      tokenEstimate: 120,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'demo-user',
      requestType: 'recommend',
      inputSummary: 'Recommend media for post about education platform launch',
      modelUsed: 'openai/gpt-oss-120b:free',
      latencyMs: 0,
      success: true,
      fallbackUsed: false,
      tokenEstimate: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'demo-user',
      requestType: 'improve',
      inputSummary: 'Suggest improvements for education platform launch post',
      modelUsed: 'openai/gpt-oss-120b:free',
      latencyMs: 1234,
      success: true,
      fallbackUsed: false,
      tokenEstimate: 210,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: 'demo-user',
      requestType: 'generate',
      inputSummary: 'Write a post about Q4 financial results',
      modelUsed: 'openai/gpt-oss-120b:free',
      latencyMs: 15000,
      success: false,
      fallbackUsed: true,
      errorMessage: 'AI_TIMEOUT — Primary model timed out, fallback returned deterministic template',
      tokenEstimate: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const logResult = await aiLogsCollection.insertMany(seedLogs);

  console.log(`Successfully seeded ${Object.keys(logResult.insertedIds).length} AI logs:`);
  console.log(`  Success: ${seedLogs.filter((l) => l.success).length}`);
  console.log(`  Failure: ${seedLogs.filter((l) => !l.success).length}`);
  console.log(`  Fallback used: ${seedLogs.filter((l) => l.fallbackUsed).length}`);

  // Seed Content Proposals (autonomous agent output)
  console.log('');
  console.log('Inserting seed content proposals...');

  const insertedFileIds = Object.values(fileResult.insertedIds);
  const seedProposals = [
    {
      fileId: insertedFileIds[0],
      userId: 'demo-user',
      angle: 'Product launch hype — countdown energy',
      caption: 'Something big is landing. Meet the Q3 product launch campaign.',
      writeUp: [
        'Every launch starts with a promise, and ours is simple: make every creator\'s workflow effortless.',
        '',
        'This season we\'re shipping a refreshed campaign built around speed, clarity and impact — designed for creators who want results without the noise.',
        '',
        'Swipe through the full campaign, then tell us what you want to see next.',
      ].join('\n'),
      hashtags: ['#ProductLaunch', '#NewCampaign', '#CreatorTools', '#Marketing', '#Q3'],
      previewText: 'A hype-driven launch post introducing the Q3 campaign banner.',
      instructions: null,
      status: 'pending',
      feedback: null,
      reviewedAt: null,
      modelUsed: 'openai/gpt-oss-120b:free',
      generationSource: 'ai',
      createdAt: now,
      updatedAt: now,
    },
    {
      fileId: insertedFileIds[1],
      userId: 'demo-user',
      angle: 'Behind-the-scenes culture story',
      caption: 'The people behind the product, in 30 seconds.',
      writeUp: [
        'We talk a lot about product. Today we\'re talking about the team.',
        '',
        'This behind-the-scenes clip shows how our culture shows up in the work — collaboration over ego, curiosity over assumptions.',
        '',
        'Peek inside, and tell us what your team\'s week looks like.',
      ].join('\n'),
      hashtags: ['#BehindTheScenes', '#Culture', '#TeamLife', '#Workplace', '#BTS'],
      previewText: 'A culture-focused video post showing the team behind the product.',
      instructions: null,
      status: 'approved',
      feedback: null,
      reviewedAt: now,
      modelUsed: 'openai/gpt-oss-120b:free',
      generationSource: 'ai',
      createdAt: now,
      updatedAt: now,
    },
    {
      fileId: insertedFileIds[5],
      userId: 'demo-user',
      angle: 'Feature deep-dive with product education',
      caption: 'One screenshot. One workflow. Zero friction.',
      writeUp: [
        'New here? This is the feature people keep asking about.',
        '',
        'The demo screenshot below shows exactly how the workflow fits together — from upload to publish in minutes.',
        '',
        'Save this post for your next build, and follow for the full walkthrough.',
      ].join('\n'),
      hashtags: ['#FeatureDemo', '#Productivity', '#Workflow', '#SaaS', '#HowTo'],
      previewText: 'An educational post breaking down the featured demo screenshot.',
      instructions: null,
      status: 'rejected',
      feedback: 'Angle is too generic — make it about the specific feature, not the workflow.',
      reviewedAt: now,
      modelUsed: 'openai/gpt-oss-120b:free',
      generationSource: 'ai',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const proposalResult = await contentProposalsCollection.insertMany(seedProposals);

  console.log(`Successfully seeded ${Object.keys(proposalResult.insertedIds).length} content proposals:`);
  console.log(`  Pending:  ${seedProposals.filter((p) => p.status === 'pending').length}`);
  console.log(`  Approved: ${seedProposals.filter((p) => p.status === 'approved').length}`);
  console.log(`  Rejected: ${seedProposals.filter((p) => p.status === 'rejected').length}`);
  console.log('');
  console.log('Seed complete.');

  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
