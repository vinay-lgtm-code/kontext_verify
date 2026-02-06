#!/bin/bash

# Ensure GEMINI_API_KEY is set as an environment variable before running this script.
# Example: export GEMINI_API_KEY="your-api-key-here"
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY environment variable is not set." >&2
  echo "Set it with: export GEMINI_API_KEY=\"your-api-key-here\"" >&2
  exit 1
fi
/Users/vinn/.claude/skills/nano-banana/scripts/generate.sh \
  "Minimalist dark tech illustration showing a shield icon with a checkmark surrounded by code snippets and hash chain blocks connected by glowing blue lines. Dark background 0a0a0a, green 22c55e and blue 3b82f6 accents. Text KONTEXT at bottom. 16:9 4K quality." \
  --flash \
  --aspect 16:9 \
  --output /Users/vinn/Documents/kontext-verify-new/apps/video/out/thumbnail.png
