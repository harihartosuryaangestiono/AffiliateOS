import type { AIFeature, AIRequestStatus } from './types.ts';

interface InMemoryLog {
  workspaceId: string;
  feature: AIFeature;
  status: AIRequestStatus;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
}

const memoryLogs: InMemoryLog[] = [];
const lastRequestTimestamps = new Map<string, number>();

/**
 * Checks rate limits (max 30 requests/minute) and duplicate spam (2s cooldown).
 */
export function checkRateLimit(workspaceId: string, feature: AIFeature): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = `${workspaceId}:${feature}`;
  const lastTime = lastRequestTimestamps.get(key) || 0;

  // 1. Duplicate click protection (2 seconds cooldown per feature)
  if (now - lastTime < 2000) {
    return {
      allowed: false,
      reason: 'Please wait a moment before requesting another generation.',
    };
  }

  // 2. Rolling window rate limit (30 requests per minute)
  const oneMinuteAgo = now - 60000;
  const recentCount = memoryLogs.filter(
    l => l.workspaceId === workspaceId && l.timestamp > oneMinuteAgo
  ).length;

  if (recentCount >= 30) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded (30 requests/minute). Please try again shortly.',
    };
  }

  lastRequestTimestamps.set(key, now);
  return { allowed: true };
}

/**
 * Records an AI request execution for tracking and audit.
 */
export function recordAIRequest(entry: {
  workspaceId: string;
  feature: AIFeature;
  status: AIRequestStatus;
  inputTokens?: number;
  outputTokens?: number;
}) {
  memoryLogs.push({
    workspaceId: entry.workspaceId,
    feature: entry.feature,
    status: entry.status,
    inputTokens: entry.inputTokens || 0,
    outputTokens: entry.outputTokens || 0,
    timestamp: Date.now(),
  });

  // Keep memory log bounded to last 1000 requests
  if (memoryLogs.length > 1000) {
    memoryLogs.splice(0, memoryLogs.length - 1000);
  }
}

/**
 * Calculates usage metrics for a workspace.
 */
export function getWorkspaceUsageSummary(workspaceId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const workspaceLogs = memoryLogs.filter(l => l.workspaceId === workspaceId);

  const todayLogs = workspaceLogs.filter(l => l.timestamp >= startOfDay);
  const monthLogs = workspaceLogs.filter(l => l.timestamp >= startOfMonth);

  const totalTokens = monthLogs.reduce((acc, l) => acc + l.inputTokens + l.outputTokens, 0);

  return {
    requestsToday: todayLogs.length,
    requestsThisMonth: monthLogs.length,
    estimatedTokens: totalTokens,
  };
}
