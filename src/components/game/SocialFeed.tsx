import { useMemo, useState, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { generateSocialPosts, type SocialPost } from '@/engine/socialFeed';
import { Heart, Repeat2, MessageCircle, BadgeCheck } from 'lucide-react';

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

interface PostInteractions {
  liked: boolean;
  reposted: boolean;
}

function PostCard({
  post,
  index,
  interactions,
  onLike,
  onRepost,
  locale,
}: {
  post: SocialPost;
  index: number;
  interactions: PostInteractions;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
  locale: string;
}) {
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

  const likeCount = post.engagement.likes + (interactions.liked ? 1 : 0);
  const repostCount = post.engagement.reposts + (interactions.reposted ? 1 : 0);

  return (
    <div
      className={`px-3 py-2.5 border-b border-border/40 last:border-0 animate-news-slide-in hover:bg-secondary/20 transition-colors duration-150 ${sentimentBorder} ${accountBg}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
          {post.avatarEmoji}
        </div>

        <div className="min-w-0 flex-1">
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

          <p className="text-[11px] leading-relaxed text-foreground/90 mt-0.5 whitespace-pre-line">
            {post.text}
          </p>

          {/* Engagement bar — interactive */}
          <div className="flex items-center gap-4 mt-1.5" role="group" aria-label={locale === 'pt-BR' ? 'Engajamento' : 'Engagement'}>
            <span
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-[hsl(var(--terminal-cyan))] transition-colors cursor-default"
            >
              <MessageCircle className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{locale === 'pt-BR' ? `${post.engagement.replies} respostas` : `${post.engagement.replies} replies`}</span>
              <span aria-hidden="true">{formatCount(post.engagement.replies)}</span>
            </span>
            <button
              onClick={() => onRepost(post.id)}
              className={`flex items-center gap-1 text-[10px] transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
                interactions.reposted
                  ? 'text-[hsl(var(--terminal-green))]'
                  : 'text-muted-foreground/60 hover:text-[hsl(var(--terminal-green))]'
              }`}
              aria-label={locale === 'pt-BR' ? `Repostar, ${repostCount} reposts` : `Repost, ${repostCount} reposts`}
            >
              <Repeat2 className="h-3 w-3" aria-hidden="true" />
              <span aria-hidden="true">{formatCount(repostCount)}</span>
            </button>
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1 text-[10px] transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
                interactions.liked
                  ? 'text-[hsl(var(--terminal-red))]'
                  : 'text-muted-foreground/60 hover:text-[hsl(var(--terminal-red))]'
              }`}
              aria-label={locale === 'pt-BR' ? `Curtir, ${likeCount} curtidas` : `Like, ${likeCount} likes`}
            >
              <Heart className={`h-3 w-3 ${interactions.liked ? 'fill-current' : ''}`} aria-hidden="true" />
              <span aria-hidden="true">{formatCount(likeCount)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_INTERACTION: PostInteractions = { liked: false, reposted: false };

export default function SocialFeed() {
  const { dayResults, state, locale, t } = useGame();
  const [interactions, setInteractions] = useState<Record<string, PostInteractions>>({});

  const posts = useMemo(
    () => generateSocialPosts(dayResults, state, 20, locale, t),
    [dayResults, state, locale, t],
  );

  const handleLike = useCallback((id: string) => {
    setInteractions(prev => {
      const current = prev[id] ?? DEFAULT_INTERACTION;
      return { ...prev, [id]: { ...current, liked: !current.liked } };
    });
  }, []);

  const handleRepost = useCallback((id: string) => {
    setInteractions(prev => {
      const current = prev[id] ?? DEFAULT_INTERACTION;
      return { ...prev, [id]: { ...current, reposted: !current.reposted } };
    });
  }, []);

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
        <PostCard
          key={post.id}
          post={post}
          index={i}
          interactions={interactions[post.id] ?? DEFAULT_INTERACTION}
          onLike={handleLike}
          onRepost={handleRepost}
          locale={locale}
        />
      ))}
    </div>
  );
}
