#!/usr/bin/env bash
# Copy magazine posts from an Obsidian vault into this repo's content folder.
# Only files whose frontmatter sets a magazine type are copied.
# Attachments are copied only when a copied post embeds them with ![[file]].
#
# Usage:
#   ./scripts/sync-from-vault.sh /path/to/your/vault
set -euo pipefail

VAULT="${1:-}"
if [[ -z "$VAULT" || ! -d "$VAULT" ]]; then
  echo "Usage: ./scripts/sync-from-vault.sh /path/to/your/obsidian/vault" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/content"
VAULT="$(cd "$VAULT" && pwd)"

if [[ "$VAULT" == "$DEST" ]]; then
  echo "That folder is already content/. Nothing to copy." >&2
  exit 1
fi

mkdir -p "$DEST/attachments"
copied=0

while IFS= read -r -d '' file; do
  # Frontmatter type, allowing spaces around the colon.
  if grep -qE '^type:[[:space:]]*(essay|short-take|review)[[:space:]]*$' "$file"; then
    rel="${file#"$VAULT"/}"
    mkdir -p "$DEST/$(dirname "$rel")"
    cp "$file" "$DEST/$rel"
    echo "post  $rel"
    copied=$((copied + 1))
  fi
done < <(find "$VAULT" -type f -name '*.md' -not -path '*/.obsidian/*' -not -path '*/templates/*' -print0)

# Embeds look like ![[image.png]] or ![[folder/image.png|alt]].
while IFS= read -r -d '' file; do
  while IFS= read -r embed; do
    inner="${embed#*!\[\[}"
    inner="${inner%\]\]}"
    inner="${inner%%|*}"
    inner="${inner%%#*}"
    base="$(basename "$inner")"
    [[ -z "$base" ]] && continue
    match="$(find "$VAULT" -type f -name "$base" -not -path '*/.obsidian/*' -print -quit || true)"
    if [[ -n "$match" ]]; then
      cp "$match" "$DEST/attachments/$base"
      echo "file  attachments/$base"
    else
      echo "missing attachment: $base (referenced from ${file#"$VAULT"/})" >&2
    fi
  done < <(grep -oE '!\[\[[^]]+\]\]' "$file" || true)
done < <(find "$DEST" -type f -name '*.md' -not -path '*/templates/*' -print0)

echo
echo "Copied $copied post(s) into content/."
echo "Drafts stay off the site. Preview with: npm run dev"
echo "This script does not delete files you removed from the vault. Remove those from content/ yourself, then commit and push."
