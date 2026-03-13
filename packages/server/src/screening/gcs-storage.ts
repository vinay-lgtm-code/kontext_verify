// ============================================================================
// Kontext Server - GCS Storage for Screening Snapshots
// ============================================================================
//
// Read/write screening index snapshots to Google Cloud Storage.
// Zero dependencies — uses native fetch + GCP metadata auth.
// Reuses the auth pattern from feature-flags.ts.
//

import type { SanctionsEntity } from './types.js';

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const DEFAULT_BUCKET = 'kontext-sanctions-data';
const SNAPSHOT_OBJECT = 'screening-snapshot.ndjson.gz';

export class GCSStorage {
  private readonly bucket: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(bucket?: string) {
    this.bucket = bucket ?? process.env['KONTEXT_SANCTIONS_BUCKET'] ?? DEFAULT_BUCKET;
  }

  /**
   * Upload a screening snapshot (NDJSON of entities, gzipped).
   */
  async uploadSnapshot(entities: SanctionsEntity[]): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('GCS upload failed: no access token available');
    }

    // Build NDJSON
    const ndjson = entities.map(e => JSON.stringify(e)).join('\n');

    // Compress with native CompressionStream (Node 18+)
    const compressed = await compress(ndjson);

    const url = `https://storage.googleapis.com/upload/storage/v1/b/${this.bucket}/o?uploadType=media&name=${SNAPSHOT_OBJECT}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/gzip',
      },
      body: compressed,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GCS upload failed: ${res.status} ${text}`);
    }
  }

  /**
   * Download a screening snapshot from GCS.
   * Returns null if no snapshot exists.
   */
  async downloadSnapshot(): Promise<SanctionsEntity[] | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const url = `https://storage.googleapis.com/storage/v1/b/${this.bucket}/o/${SNAPSHOT_OBJECT}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    // Decompress
    const buffer = await res.arrayBuffer();
    const ndjson = await decompress(new Uint8Array(buffer));

    const entities: SanctionsEntity[] = [];
    for (const line of ndjson.split('\n')) {
      if (!line.trim()) continue;
      try {
        entities.push(JSON.parse(line) as SanctionsEntity);
      } catch {
        // Skip malformed lines
      }
    }

    return entities;
  }

  /**
   * Upload sync metadata (last sync time, version, stats).
   */
  async uploadMeta(meta: Record<string, unknown>): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) return;

    const url = `https://storage.googleapis.com/upload/storage/v1/b/${this.bucket}/o?uploadType=media&name=screening-meta.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meta),
    });

    if (!res.ok) {
      // Non-critical — log but don't throw
      console.error(`GCS meta upload failed: ${res.status}`);
    }
  }

  // --------------------------------------------------------------------------
  // GCP Auth (reused from feature-flags.ts)
  // --------------------------------------------------------------------------

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Local development fallback
    const envToken = process.env['GOOGLE_ACCESS_TOKEN'];
    if (envToken) {
      this.accessToken = envToken;
      this.tokenExpiresAt = Date.now() + 3_600_000;
      return envToken;
    }

    // GCP metadata server (Cloud Run / GCE / GKE)
    try {
      const res = await fetch(METADATA_TOKEN_URL, {
        headers: { 'Metadata-Flavor': 'Google' },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Compression helpers (Node 18+ native)
// ---------------------------------------------------------------------------

async function compress(text: string): Promise<Uint8Array> {
  // Use Node.js zlib for gzip compression
  const { gzipSync } = await import('node:zlib');
  return gzipSync(Buffer.from(text, 'utf-8'));
}

async function decompress(data: Uint8Array): Promise<string> {
  const { gunzipSync } = await import('node:zlib');
  return gunzipSync(Buffer.from(data)).toString('utf-8');
}
