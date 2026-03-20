// ============================================================================
// Kontext Server — RBAC: Roles, Permissions, Middleware, Data Scoping
// ============================================================================

import type { Context, Next } from 'hono';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = 'admin' | 'staff-dev' | 'staff-risk';

export type Permission =
  | 'write:transactions'
  | 'write:logs'
  | 'write:tasks'
  | 'approve:tasks'
  | 'read:scoped-data'
  | 'export:json'
  | 'export:csv'
  | 'report:sar-ctr'
  | 'assign:events'
  | 'write:policies'
  | 'read:policies'
  | 'manage:team'
  | 'manage:api-keys'
  | 'read:billing';

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'write:transactions',
    'write:logs',
    'write:tasks',
    'approve:tasks',
    'read:scoped-data',
    'export:json',
    'export:csv',
    'report:sar-ctr',
    'assign:events',
    'write:policies',
    'read:policies',
    'manage:team',
    'manage:api-keys',
    'read:billing',
  ],
  'staff-dev': [
    'write:transactions',
    'write:logs',
    'write:tasks',
    'read:scoped-data',
    'export:json',
    'export:csv',
    'manage:api-keys', // own keys only — enforced in route handler
  ],
  'staff-risk': [
    'approve:tasks',
    'read:scoped-data',
    'export:json',
    'export:csv',
    'report:sar-ctr',
    'read:policies',
  ],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

/** Buyer-friendly display names for RBAC roles */
export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  admin: 'Administrator',
  'staff-dev': 'Platform Engineering',
  'staff-risk': 'Compliance & Risk',
};

// ---------------------------------------------------------------------------
// Hono middleware factories
// ---------------------------------------------------------------------------

/**
 * Require a specific permission. Returns 403 if the authenticated role lacks it.
 * Expects authMiddleware to have already attached ctx role via c.set().
 */
export function requirePermission(perm: Permission) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const role = c.get('role' as never) as Role | undefined;
    if (!role || !hasPermission(role, perm)) {
      return c.json(
        { error: `Permission required: ${perm}`, role: role ?? 'unauthenticated' },
        403,
      );
    }
    return next();
  };
}

/**
 * Require one of the specified roles. Returns 403 otherwise.
 */
export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const role = c.get('role' as never) as Role | undefined;
    if (!role || !roles.includes(role)) {
      return c.json(
        { error: `Role required: ${roles.join(' or ')}`, role: role ?? 'unauthenticated' },
        403,
      );
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Data scoping — centralized SQL WHERE fragment
// ---------------------------------------------------------------------------

/**
 * Returns an additional SQL WHERE fragment and params for row-level data scoping.
 *
 * admin:      no extra clause (sees everything in their org)
 * staff-dev:  AND (initiated_by = $N OR assigned_to = $N)
 * staff-risk: AND assigned_to = $N
 *
 * @param role       authenticated role
 * @param userId     authenticated user_id
 * @param paramOffset next $N index to use (e.g. if query already has $1..$3, pass 4)
 */
export function scopeClause(
  role: Role,
  userId: string,
  paramOffset: number,
): { sql: string; params: string[] } {
  if (role === 'admin') {
    return { sql: '', params: [] };
  }
  if (role === 'staff-dev') {
    return {
      sql: `AND (initiated_by = $${paramOffset} OR assigned_to = $${paramOffset})`,
      params: [userId],
    };
  }
  // staff-risk
  return {
    sql: `AND assigned_to = $${paramOffset}`,
    params: [userId],
  };
}
