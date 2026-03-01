import { isFeatureEnabled } from "@/lib/feature-flags";

interface FeatureFlagProps {
  /** Kebab-case flag name (e.g. "new-pricing-page") */
  flag: string;
  /** Plan to check against (default: "free") */
  plan?: "free" | "pro" | "enterprise";
  /** Content to render when the flag is enabled */
  children: React.ReactNode;
  /** Optional fallback content when the flag is disabled */
  fallback?: React.ReactNode;
}

/**
 * React Server Component that conditionally renders children
 * based on a feature flag.
 *
 * @example
 * ```tsx
 * <FeatureFlag flag="new-dashboard" plan="pro">
 *   <NewDashboard />
 * </FeatureFlag>
 * ```
 */
export async function FeatureFlag({
  flag,
  plan = "free",
  children,
  fallback = null,
}: FeatureFlagProps) {
  const enabled = await isFeatureEnabled(flag, plan);

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
