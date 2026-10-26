export const FREE_ALLOWANCES = {
  chat: { limit: 3, period: 'daily', provider: 'nebius', label: 'Copilot chats' },
  ats: { limit: 3, period: 'daily', provider: 'nebius', label: 'ATS AI reviews' },
  upload: { limit: 1, period: 'total', provider: 'nebius', label: 'Resume uploads' },
  company: { limit: 5, period: 'total', provider: 'tavily', label: 'Company discoveries' },
} as const;
export type AllowanceKind = keyof typeof FREE_ALLOWANCES;
export function remainingAllowance(kind: AllowanceKind, used: number) {
  return Math.max(0, FREE_ALLOWANCES[kind].limit - used);
}