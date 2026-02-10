#!/usr/bin/env bash
# ============================================================================
# Changelog Generator for Kontext Monorepo
# ============================================================================
# Usage: ./scripts/generate-changelog.sh [version]
#
# Reads git log since the last tag (or all history if no tags exist),
# categorizes commits by conventional commit prefix, and prepends
# new entries to both CHANGELOG.md (public) and CHANGELOG-INTERNAL.md.
#
# Commit prefixes:
#   feat:     -> ### Added        (public)
#   fix:      -> ### Fixed        (public)
#   perf:     -> ### Changed      (public)
#   docs:     -> ### Changed      (public)
#   refactor: -> ### Internal     (internal only)
#   chore:    -> ### Internal     (internal only)
#   ci:       -> ### Internal     (internal only)
#   test:     -> ### Internal     (internal only)
#   style:    -> ### Internal     (internal only)
#
# Tag [internal] in commit message forces internal-only classification.
# ============================================================================

set -euo pipefail

VERSION="${1:-}"
DATE=$(date +%Y-%m-%d)

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.3.0"
  exit 1
fi

# Find the last tag, or use the root commit if no tags exist
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  RANGE="HEAD"
else
  RANGE="${LAST_TAG}..HEAD"
fi

# Collect commits
ADDED=""
FIXED=""
CHANGED=""
INTERNAL=""

while IFS= read -r line; do
  # Skip empty lines
  [ -z "$line" ] && continue

  # Check for [internal] tag
  is_internal=false
  if echo "$line" | grep -qi '\[internal\]'; then
    is_internal=true
  fi

  # Strip conventional commit prefix for display
  display=$(echo "$line" | sed 's/^[a-z]*: //' | sed 's/^[a-z]*(.*)!*: //' | sed 's/ *\[internal\] *//')

  if $is_internal; then
    INTERNAL="${INTERNAL}\n- ${display}"
  elif echo "$line" | grep -qE '^feat(\(.*\))?!?:'; then
    ADDED="${ADDED}\n- ${display}"
  elif echo "$line" | grep -qE '^fix(\(.*\))?!?:'; then
    FIXED="${FIXED}\n- ${display}"
  elif echo "$line" | grep -qE '^(perf|docs)(\(.*\))?!?:'; then
    CHANGED="${CHANGED}\n- ${display}"
  elif echo "$line" | grep -qE '^(refactor|chore|ci|test|style)(\(.*\))?!?:'; then
    INTERNAL="${INTERNAL}\n- ${display}"
  else
    # Non-conventional commits go to Added (public) by default
    ADDED="${ADDED}\n- ${display}"
  fi
done <<< "$(git log --pretty=format:'%s' $RANGE)"

# Build public changelog entry
PUBLIC_ENTRY="## [${VERSION}] - ${DATE}\n"
if [ -n "$ADDED" ]; then
  PUBLIC_ENTRY="${PUBLIC_ENTRY}\n### Added${ADDED}\n"
fi
if [ -n "$FIXED" ]; then
  PUBLIC_ENTRY="${PUBLIC_ENTRY}\n### Fixed${FIXED}\n"
fi
if [ -n "$CHANGED" ]; then
  PUBLIC_ENTRY="${PUBLIC_ENTRY}\n### Changed${CHANGED}\n"
fi

# Build internal changelog entry (includes everything)
INTERNAL_ENTRY="## [${VERSION}] - ${DATE}\n"
if [ -n "$ADDED" ]; then
  INTERNAL_ENTRY="${INTERNAL_ENTRY}\n### Added${ADDED}\n"
fi
if [ -n "$FIXED" ]; then
  INTERNAL_ENTRY="${INTERNAL_ENTRY}\n### Fixed${FIXED}\n"
fi
if [ -n "$CHANGED" ]; then
  INTERNAL_ENTRY="${INTERNAL_ENTRY}\n### Changed${CHANGED}\n"
fi
if [ -n "$INTERNAL" ]; then
  INTERNAL_ENTRY="${INTERNAL_ENTRY}\n### Internal${INTERNAL}\n"
fi

# Prepend to CHANGELOG.md
if [ -f "CHANGELOG.md" ]; then
  # Insert after the header line
  HEADER=$(head -3 CHANGELOG.md)
  BODY=$(tail -n +4 CHANGELOG.md)
  printf "%s\n\n%b\n%s" "$HEADER" "$PUBLIC_ENTRY" "$BODY" > CHANGELOG.md
else
  printf "# Changelog\n\nAll notable public changes to the Kontext SDK and platform.\n\n%b\n" "$PUBLIC_ENTRY" > CHANGELOG.md
fi

# Prepend to CHANGELOG-INTERNAL.md
if [ -f "CHANGELOG-INTERNAL.md" ]; then
  HEADER=$(head -3 CHANGELOG-INTERNAL.md)
  BODY=$(tail -n +4 CHANGELOG-INTERNAL.md)
  printf "%s\n\n%b\n%s" "$HEADER" "$INTERNAL_ENTRY" "$BODY" > CHANGELOG-INTERNAL.md
else
  printf "# Internal Changelog\n\nFull changelog including internal changes.\n\n%b\n" "$INTERNAL_ENTRY" > CHANGELOG-INTERNAL.md
fi

echo "Changelogs updated for v${VERSION} (${DATE})"
echo "  Public entries: $(echo -e "$PUBLIC_ENTRY" | grep -c '^\- ' || echo 0)"
echo "  Internal entries: $(echo -e "$INTERNAL_ENTRY" | grep -c '^\- ' || echo 0)"
