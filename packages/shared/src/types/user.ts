export type PlanTier = 'free' | 'builder' | 'pro' | 'team';

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  planTier: PlanTier;
  creditsRemaining: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  planTier: PlanTier;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
