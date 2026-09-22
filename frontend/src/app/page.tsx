'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

const features: { href: string; title: string; desc: string; icon: string; color: string; bg: string; border: string }[] = [
  { href: '/agent', title: 'Agent Studio', desc: 'Drop media and let the agent draft the post write-up, caption and hashtags — then approve or reject', icon: 'auto_awesome', color: '#34D399', bg: 'rgba(52,211,153,0.2)', border: 'rgba(52,211,153,0.3)' },
  { href: '/generate-post', title: 'Create Content', desc: 'Generate post copy, hashtags, media recommendations, and preview', icon: 'add_circle', color: '#8B5CF6', bg: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.3)' },
  { href: '/suggest-hashtags', title: 'Suggest Hashtags', desc: 'Get hashtag suggestions from your post content', icon: 'tag', color: '#22D3EE', bg: 'rgba(34,211,238,0.2)', border: 'rgba(34,211,238,0.3)' },
  { href: '/recommend-media', title: 'Recommend Media', desc: 'Find approved media files matching your post', icon: 'image', color: '#F472B6', bg: 'rgba(244,114,182,0.2)', border: 'rgba(244,114,182,0.3)' },
  { href: '/files', title: 'Files Library', desc: 'Browse and manage your media file records', icon: 'folder', color: '#9CA3AF', bg: 'rgba(156,163,175,0.2)', border: 'rgba(156,163,175,0.3)' },
];

export default function Dashboard() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => setHealthy(r.ok))
      .catch(() => setHealthy(false));
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-stack-lg">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            {healthy !== null && (
              <div className="px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 backdrop-blur-md flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[10px] font-bold text-green-400 tracking-widest uppercase">
                  API {healthy ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
          <h2 className="font-sora text-headline-xl text-on-surface">Welcome to Amiri Content Agent</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            AI-powered content creation and media management for the next generation of social influence.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end glass-card p-4 rounded-xl px-6">
          <span className="text-neon-cyan font-bold text-headline-lg tracking-tight">{clock}</span>
          <span className="text-label-sm text-text-muted uppercase tracking-widest">Active Session</span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          {features.map((f) => (
            <Link key={f.href} href={f.href}>
              <div className="glass-card p-stack-md rounded-2xl group cursor-pointer relative overflow-hidden h-64 flex flex-col justify-end transition-all hover:scale-[1.02]">
                <div
                  className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-all group-hover:text-white font-bold text-headline-lg"
                  style={{ backgroundColor: f.bg, color: f.color, border: `1px solid ${f.border}` }}
                >
                  {f.title[0]}
                </div>
                <div>
                  <h3 className="font-sora text-headline-lg text-on-surface mb-2">{f.title}</h3>
                  <p className="text-on-surface-variant text-sm">{f.desc}</p>
                </div>
              </div>
            </Link>
          ))}
          <div className="md:col-span-2 glass-card p-stack-sm rounded-2xl border-neon-cyan/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-surface-container-high">
                <span className="text-neon-cyan font-bold text-sm">API</span>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-tighter">Endpoint Status</p>
                <code className="text-sm text-neon-cyan font-mono">https://lyra-content-agent.vercel.app</code>
              </div>
            </div>
            <div className="px-3 py-1 rounded-md border border-neon-violet/30 bg-neon-violet/5 text-[10px] font-black text-neon-violet uppercase tracking-widest">
              No Auth Required
            </div>
          </div>
        </div>

        <div className="md:col-span-4 space-y-gutter">
          <Card className="relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-neon-violet/5 rounded-full blur-2xl" />
            <h3 className="font-sora text-headline-lg text-on-surface mb-stack-md">Quick Start Guide</h3>
            <div className="space-y-6">
              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-glass-surface border border-glass-border flex items-center justify-center text-neon-cyan font-bold group-hover:border-neon-cyan transition-all shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-on-surface">Upload files</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Add your brand assets to the media vault for AI analysis.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-glass-surface border border-glass-border flex items-center justify-center text-neon-cyan font-bold group-hover:border-neon-cyan transition-all shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-on-surface">Generate post</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Use the Create engine to craft high-conversion narratives.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-glass-surface border border-glass-border flex items-center justify-center text-neon-cyan font-bold group-hover:border-neon-cyan transition-all shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-on-surface">Review &amp; publish</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Approve AI suggestions and deploy to your social channels.</p>
                </div>
              </div>
            </div>
            <Link
              href="/generate-post"
              className="w-full mt-stack-md py-3 rounded-xl border border-neon-cyan text-neon-cyan font-bold hover:bg-neon-cyan hover:text-background transition-all block text-center"
            >
              Begin Journey
            </Link>
          </Card>

          <Card className="h-48 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="animate-ping absolute w-24 h-24 bg-neon-violet/20 rounded-full" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-3xl text-neon-violet mb-2 font-bold">AI</span>
              <p className="text-label-sm uppercase tracking-widest text-text-muted">Engine Calibrating...</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
