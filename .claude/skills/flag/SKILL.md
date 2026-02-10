# /flag — Kontext Feature Flag Management (Firestore)

Manage feature flags stored in Firestore (`feature-flags` collection). Flags are plan-aware (Free/Pro/Enterprise) and environment-scoped (development/staging/production).

## Prerequisites

- GCP project: `kontext-verify-sdk`
- Firestore database: `(default)` in `us-central1`
- Auth: Use `gcloud auth print-access-token` for the bearer token
- Collection: `feature-flags`, document ID = kebab-case flag name

## Flag Schema

Each document in `feature-flags` has this structure:

```json
{
  "description": "What this flag controls",
  "scope": "sdk | server | website | all",
  "targeting": {
    "development": { "free": true, "pro": true, "enterprise": true },
    "staging":     { "free": false, "pro": true, "enterprise": true },
    "production":  { "free": false, "pro": false, "enterprise": true }
  },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "createdBy": "vinay@getlegaci.com"
}
```

## Commands

### `/flag list`

Read all documents from the `feature-flags` collection using:

```bash
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firestore.googleapis.com/v1/projects/kontext-verify-sdk/databases/(default)/documents/feature-flags"
```

Parse the Firestore response and display a table with columns:
| Flag | Description | Scope | Dev (F/P/E) | Staging (F/P/E) | Prod (F/P/E) | Updated |

Use checkmarks/crosses to show the plan matrix for each environment.

### `/flag create <name> <description> [--scope=all]`

Create a new flag document. Default targeting: dev=all-true, staging/prod=all-false.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/kontext-verify-sdk/databases/(default)/documents/feature-flags?documentId=<name>" \
  -d '{
    "fields": {
      "description": {"stringValue": "<description>"},
      "scope": {"stringValue": "<scope>"},
      "targeting": {
        "mapValue": {
          "fields": {
            "development": {"mapValue": {"fields": {
              "free": {"booleanValue": true},
              "pro": {"booleanValue": true},
              "enterprise": {"booleanValue": true}
            }}},
            "staging": {"mapValue": {"fields": {
              "free": {"booleanValue": false},
              "pro": {"booleanValue": false},
              "enterprise": {"booleanValue": false}
            }}},
            "production": {"mapValue": {"fields": {
              "free": {"booleanValue": false},
              "pro": {"booleanValue": false},
              "enterprise": {"booleanValue": false}
            }}}
          }
        }
      },
      "createdAt": {"stringValue": "<ISO-8601 now>"},
      "updatedAt": {"stringValue": "<ISO-8601 now>"},
      "createdBy": {"stringValue": "vinay@getlegaci.com"}
    }
  }'
```

After creating, display the new flag state.

### `/flag enable <name> [--env=development,staging] [--plan=pro,enterprise]`

Update the targeting for the specified environment(s) and plan(s) to `true`.

- Default `--env`: `development,staging`
- Default `--plan`: `pro,enterprise`

Use a PATCH request to update only the targeting fields:

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/kontext-verify-sdk/databases/(default)/documents/feature-flags/<name>?updateMask.fieldPaths=targeting&updateMask.fieldPaths=updatedAt" \
  -d '{ "fields": { "targeting": { ... }, "updatedAt": {"stringValue": "<now>"} } }'
```

First read the current document, merge the changes, then PATCH back.

### `/flag disable <name>`

Set all targeting to `false` across all environments and plans. Update `updatedAt`.

### `/flag promote <name>`

Enable the flag for ALL environments and ALL plans. This is a significant action — confirm with the user before proceeding.

After confirmation, PATCH the targeting to set every boolean to `true`.

### `/flag status`

Read all flags and display a summary dashboard:
- Total flags
- Flags enabled in development only (not staging/production)
- Flags enabled in staging (not production)
- Flags fully promoted to production
- Flags fully disabled
- Breakdown by scope (sdk/server/website/all)

## Instructions

1. Always read the current document before making changes to avoid overwriting.
2. Always update `updatedAt` when modifying a flag.
3. Keep flag names in kebab-case.
4. After any write operation, re-read and display the updated flag state.
5. Use `gcloud auth print-access-token` for authentication — never hardcode tokens.
6. Handle Firestore REST API errors gracefully and report them to the user.
