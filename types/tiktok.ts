// The studio's TikTok connection (Login Kit + TikTok API, scopes
// user.info.basic and video.list). Stored at integrations/tiktok; server only.
export type TikTokConnection = {
  openId: string;
  scopes: string[];
  accessToken: string;
  /** Epoch ms. Access tokens last 24 hours. */
  accessExpiresAt: number;
  refreshToken: string;
  /** Epoch ms. Refresh tokens last 365 days; after that the owner reconnects. */
  refreshExpiresAt: number;
  displayName: string | null;
  connectedAt: string;
  updatedAt: string;
};

// One public video, as shown on /community. TikTok's cover URLs expire after
// 6 hours, so these are never stored, only cached briefly.
export type TikTokVideo = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  shareUrl: string;
  embedUrl: string;
  /** Epoch seconds. */
  createdAt: number | null;
  width: number | null;
  height: number | null;
};
