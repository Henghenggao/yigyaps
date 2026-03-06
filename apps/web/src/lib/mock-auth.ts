export const MOCK_USER = {
  id: "mock_user_id",
  githubUsername: "Henghenggao",
  displayName: "Jerome Gao",
  email: "jerome@yigyaps.com",
  avatarUrl: "https://github.com/Henghenggao.png",
  tier: "pro" as const,
  role: "admin" as const,
  isVerifiedCreator: true,
  totalPackages: 12,
  totalEarningsUsd: "450.50",
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  lastLoginAt: Date.now(),
};
