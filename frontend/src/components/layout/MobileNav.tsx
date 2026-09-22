'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/formatters';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/agent', label: 'Agent' },
  { href: '/generate-post', label: 'Create' },
  { href: '/suggest-hashtags', label: 'Hashtags' },
  { href: '/recommend-media', label: 'Media' },
  { href: '/files', label: 'Library' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-deep-obsidian/95 backdrop-blur-[20px] border-t border-glass-border lg:hidden z-50">
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-1 py-2 px-2 scrollbar-none snap-x snap-mandatory"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-center snap-start shrink-0',
                  isActive
                    ? 'text-neon-cyan bg-neon-cyan/10'
                    : 'text-text-muted hover:text-on-surface hover:bg-white/5'
                )}
              >
                <span className="font-label-sm text-sm tracking-wide whitespace-nowrap font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
