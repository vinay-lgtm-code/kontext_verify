// ============================================================================
// Kontext Server — GCS Export Storage
// ============================================================================
// Upload completed export files to Google Cloud Storage and generate signed URLs.
// Reuses the GCS auth pattern from screening/gcs-storage.ts (metadata server token).

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const DEFAULT_BUCKET = 'kontext-audit-exports';

let accessToken: string | null = null;
let tokenExpiresAt = 0;

// ---------------------------------------------------------------------------
// Auth (same pattern as screening/gcs-storage.ts)
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  // Local development fallback
  const envToken = process.env['GOOGLE_ACCESS_TOKEN'];
  if (envToken) {
    accessToken = envToken;
    tokenExpiresAt = Date.now() + 3_600_000;
    return envToken;
  }

  // GCP metadata server (Cloud Run / GCE / GKE)
  try {
    const res = await fetch(METADATA_TOKEN_URL, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return accessToken;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload an export file to GCS.
 *
 * @param orgId     Organization ID (used as folder prefix)
 * @param exportId  Export ID (used as filename base)
 * @param format    File format extension (json, csv, pdf)
 * @param buffer    File contents
 * @returns         GCS path (gs://bucket/org/export.format)
 */
export async function uploadExport(
  orgId: string,
  exportId: string,
  format: string,
  buffer: Buffer,
): Promise<string> {
  const bucket = process.env['KONTEXT_EXPORT_BUCKET'] ?? DEFAULT_BUCKET;
  const objectName = `${orgId}/${exportId}.${format}`;
  const gcsPath = `gs://${bucket}/${objectName}`;

  const token = await getAccessToken();
  if (!token) {
    throw new Error('GCS upload failed: no access token available');
  }

  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : format === 'csv'
        ? 'text/csv'
        : 'application/json';

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: buffer as unknown as BodyInit,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GCS upload failed: ${res.status} ${text}`);
  }

  return gcsPath;
}

// ---------------------------------------------------------------------------
// Signed URL
// ---------------------------------------------------------------------------

/**
 * Generate a signed URL for downloading an export file.
 * Uses the GCS JSON API signBlob endpoint via service account impersonation.
 * Falls back to a direct authenticated URL if signing is not available.
 *
 * @param gcsPath  Full GCS path (gs://bucket/object)
 * @returns        Signed URL with 1hr TTL, or authenticated URL as fallback
 */
export async function getSignedUrl(gcsPath: string): Promise<string> {
  // Parse gs://bucket/object
  const match = gcsPath.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS path: ${gcsPath}`);
  }

  const bucket = match[1] as string;
  const object = match[2] as string;

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Cannot generate signed URL: no access token available');
  }

  // Use the GCS JSON API v1 to create a temporary download URL.
  // For Cloud Run with default service account, we generate a self-signed URL
  // using the signBlob method on the IAM API.
  const serviceAccountEmail =
    process.env['KONTEXT_SERVICE_ACCOUNT'] ??
    `kontext-api@${process.env['GCP_PROJECT_ID'] ?? 'kontext-verify-sdk'}.iam.gserviceaccount.com`;

  const expiration = Math.floor(Date.now() / 1000) + 3600; // 1hr TTL

  // Construct the string to sign (V4 signing)
  const host = `${bucket}.storage.googleapis.com`;
  const canonicalUri = `/${encodeURIComponent(object).replace(/%2F/g, '/')}`;
  const now = new Date();
  const datestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 8);
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${serviceAccountEmail}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
    'X-Goog-Credential': credential,
    'X-Goog-Date': `${datestamp}T000000Z`,
    'X-Goog-Expires': '3600',
    'X-Goog-SignedHeaders': 'host',
  });

  const canonicalRequest = [
    'GET',
    canonicalUri,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    `${datestamp}T000000Z`,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  // Sign using IAM signBlob API
  try {
    const signRes = await fetch(
      `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:signBlob`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: Buffer.from(stringToSign).toString('base64'),
        }),
      },
    );

    if (signRes.ok) {
      const signData = (await signRes.json()) as { signedBlob: string };
      const signature = Buffer.from(signData.signedBlob, 'base64').toString('hex');
      queryParams.set('X-Goog-Signature', signature);
      return `https://${host}${canonicalUri}?${queryParams.toString()}`;
    }
  } catch {
    // Signing failed — fall through to authenticated URL
  }

  // Fallback: return a direct URL (requires the caller to have auth headers)
  void expiration; // suppress unused
  return `https://storage.googleapis.com/${bucket}/${encodeURIComponent(object).replace(/%2F/g, '/')}`;
}

// ---------------------------------------------------------------------------
// SHA-256 helper
// ---------------------------------------------------------------------------

async function sha256Hex(data: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data).digest('hex');
}
