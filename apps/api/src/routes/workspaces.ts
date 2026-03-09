import { Hono } from 'hono';
import { defaultWorkspaceProfile, generateId } from '@kontext/core';
import type { Archetype } from '@kontext/core';

export const workspaceRoutes = new Hono();

// In-memory store (will be replaced by Firestore)
const workspaces = new Map<string, ReturnType<typeof defaultWorkspaceProfile>>();

workspaceRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name: string; archetypes: Archetype[] }>();
  const workspaceId = generateId('ws');
  const profile = defaultWorkspaceProfile(workspaceId, body.name, body.archetypes);
  workspaces.set(workspaceId, profile);
  return c.json(profile, 201);
});

workspaceRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const profile = workspaces.get(id);
  if (!profile) return c.json({ error: 'Workspace not found' }, 404);
  return c.json(profile);
});

workspaceRoutes.put('/:id/profile', async (c) => {
  const id = c.req.param('id');
  const existing = workspaces.get(id);
  if (!existing) return c.json({ error: 'Workspace not found' }, 404);
  const updates = await c.req.json();
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  workspaces.set(id, updated);
  return c.json(updated);
});
