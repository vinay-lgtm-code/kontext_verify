// ============================================================================
// Kontext Website - Feature Flag Helper (Server-side, ISR-compatible)
// ============================================================================

const API_BASE_URL =
  process.env['KONTEXT_API_URL'] ?? 'https://api.getkontext.com';

type Environment = 'development' | 'staging' | 'production';
type Plan = 'free' | 'pro' | 'enterprise';

interface FlagPlanTargeting {
  free: boolean;
  pro: boolean;
  enterprise: boolean;
}

interface FlagTargeting {
  development: FlagPlanTargeting;
  staging: FlagPlanTargeting;
  production: FlagPlanTargeting;
}

interface FlagResponse {
  name: string;
  description: string;
  scope: string;
  targeting: FlagTargeting;
}

interface FlagsListResponse {
  flags: FlagResponse[];
  count: number;
}

/** Map Vercel environment to our environment type */
export function getEnvironment(): Environment {
  const vercelEnv = process.env['NEXT_PUBLIC_VERCEL_ENV'];
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'staging';
  return 'development';
}

/**
 * Fetch all website-scoped flags from the server API.
 * Uses Next.js ISR with a 5-minute revalidation window.
 */
export async function getFlags(): Promise<FlagResponse[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/flags?scope=website`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as FlagsListResponse;
    return data.flags ?? [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific flag is enabled for the website.
 * Fetches from the server API with ISR caching.
 */
export async function isFeatureEnabled(
  flagName: string,
  plan: Plan = 'free',
): Promise<boolean> {
  try {
    const environment = getEnvironment();
    const res = await fetch(
      `${API_BASE_URL}/v1/flags/${encodeURIComponent(flagName)}?environment=${environment}&plan=${plan}`,
      { next: { revalidate: 300 } },
    );

    if (!res.ok) return false;

    const data = (await res.json()) as { enabled: boolean };
    return data.enabled ?? false;
  } catch {
    return false;
  }
}
