import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { generateSocialPosts, type SocialPost } from '@/engine/socialFeed';
import { Heart, Repeat2, MessageCircle, BadgeCheck } from 'lucide-react';

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function PostCard({ post, index }: { post: SocialPost; index: number }) {
  const sentimentBorder =
    post.accountType === 'influencer'
      ? post.sentiment === 'bullish'
        ? 'border-l-2 border-l-[hsl(var(--terminal-green))]'
        : post.sentiment === 'bearish'
          ? 'border-l-2 border-l-[hsl(var(--terminal-red))]'
          : 'border-l-2 border-l-[hsl(var(--terminal-dim))]'
      : '';

  const accountBg =
    post.accountType === 'corporate'
      ? 'bg-[hsl(var(--terminal-blue)/0.05)]'
      : '';

  return (
    <div
      className={`px-3 py-2.5 border-b border-border/40 last:border-0 animate-news-slide-in hover:bg-secondary/20 transition-colors duration-150 ${sentimentBorder} ${accountBg}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header: Avatar + Name + Handle + Verified + Day */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
          {post.avatarEmoji}
        </div>

        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
              {post.displayName}
            </span>
            {post.verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--terminal-cyan))]" />
            )}
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              @{post.handle}
            </span>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              D{post.dayIndex}
            </span>
          </div>

          {/* Post body */}
          <p className="text-[11px] leading-relaxed text-foreground/90 mt-0.5 whitespace-pre-line">
            {post.text}
          </p>

          {/* Engagement bar */}
          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-[hsl(var(--terminal-cyan))] transition-colors cursor-default">
              <MessageCircle className="h-3 w-3" />
              {formatCount(post.engagement.replies)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-[hsl(var(--terminal-green))] transition-colors cursor-default">
              <Repeat2 className="h-3 w-3" />
              {formatCount(post.engagement.reposts)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-[hsl(var(--terminal-red))] transition-colors cursor-default">
              <Heart className="h-3 w-3" />
              {formatCount(post.engagement.likes)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SocialFeed() {
  const { dayResults, state, locale } = useGame();

  const posts = useMemo(
    () => generateSocialPosts(dayResults, state, 20),
    [dayResults, state],
  );

  if (posts.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-muted-foreground font-mono">
          {locale === 'pt-BR'
            ? 'Avance dias para ver o feed social do mercado.'
            : 'Advance days to see the market social feed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[320px] overflow-y-auto scrollbar-terminal">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} index={i} />
      ))}
    </div>
  );
}
