#!/usr/bin/env bash
# ============================================================================
# BrickOS GitHub Release Backfill
# ============================================================================
# One-off companion to .github/workflows/release.yml: walks existing git tags,
# and for each tag that has release notes but no GitHub Release yet, creates
# the Release via the gh CLI.
#
# Supports two tag conventions:
#   1. {app}/vX.Y.Z         -> docs/releases/{app}/vX.Y.Z/RELEASE_vX.Y.Z.md
#   2. vX.Y.Z (legacy SHI)  -> docs/releases/sovereign-health/vX.Y.Z/RELEASE_vX.Y.Z.md
#
# Usage:
#   bash ops/backfill-github-releases.sh           # dry run
#   bash ops/backfill-github-releases.sh --apply   # create releases
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

echo "============================================================"
echo "BrickOS GitHub Release Backfill"
echo "============================================================"
if $APPLY; then
    echo "Mode: APPLY (will create GitHub Releases)"
else
    echo "Mode: DRY RUN (no changes; re-run with --apply to create)"
fi
echo ""

smart_title() {
    # Brand overrides for slugs the algorithmic casing gets wrong
    case "$1" in
        brickos)          echo "BrickOS"; return ;;
        brickos-platform) echo "BrickOS Platform"; return ;;
    esac
    echo "$1" | awk '{
        n = split($0, words, "-")
        out = ""
        for (i = 1; i <= n; i++) {
            w = words[i]
            if (length(w) <= 3) out = out (i>1?" ":"") toupper(w)
            else out = out (i>1?" ":"") toupper(substr(w,1,1)) tolower(substr(w,2))
        }
        print out
    }'
}

resolve_tag() {
    local tag="$1"
    local app version notes title
    if [[ "$tag" == */v* ]]; then
        app="${tag%%/*}"
        version="${tag#*/}"
        notes="docs/releases/${app}/${version}/RELEASE_${version}.md"
    elif [[ "$tag" =~ ^v[0-9] ]]; then
        # Legacy SHI unprefixed tag -- folder renamed from shi/ to sovereign-health/
        app="sovereign-health"
        version="$tag"
        notes="docs/releases/sovereign-health/${version}/RELEASE_${version}.md"
    else
        return 1
    fi
    title="$(smart_title "$app") ${version}"
    echo "${app}|${version}|${notes}|${title}"
}

created=0
skipped_existing=0
skipped_no_notes=0
skipped_backup=0

while IFS= read -r tag; do
    case "$tag" in
        backup/*|pre-extraction|pre-user-extraction)
            printf "  %-40s SKIP (backup/internal tag)\n" "$tag"
            skipped_backup=$((skipped_backup+1))
            continue
            ;;
    esac

    if ! resolved=$(resolve_tag "$tag"); then
        printf "  %-40s SKIP (tag does not match convention)\n" "$tag"
        continue
    fi

    IFS='|' read -r app version notes title <<< "$resolved"

    if gh release view "$tag" >/dev/null 2>&1; then
        printf "  %-40s OK (release already exists)\n" "$tag"
        skipped_existing=$((skipped_existing+1))
        continue
    fi

    if [[ ! -f "$notes" ]]; then
        printf "  %-40s MISS (no notes at %s)\n" "$tag" "$notes"
        skipped_no_notes=$((skipped_no_notes+1))
        continue
    fi

    pre_flag=""
    [[ "$version" == *-* ]] && pre_flag="--prerelease"

    printf "  %-40s NEW  -> '%s'%s\n" "$tag" "$title" "${pre_flag:+  (prerelease)}"

    if $APPLY; then
        # --latest=false: backfilled releases represent historical versions;
        # creating them today must not steal the "Latest" badge from the
        # genuinely most-recent release.
        # shellcheck disable=SC2086
        gh release create "$tag" \
            --title "$title" \
            --notes-file "$notes" \
            --verify-tag \
            --latest=false \
            $pre_flag
        created=$((created+1))
    fi
done < <(git tag --list | sort -V)

echo ""
echo "------------------------------------------------------------"
echo "Summary:"
echo "  Backup/internal tags skipped: $skipped_backup"
echo "  Releases already present:     $skipped_existing"
echo "  Missing notes (skipped):      $skipped_no_notes"
if $APPLY; then
    echo "  Releases created:             $created"
else
    echo "  Would be created (dry run):   (see NEW lines above)"
    echo ""
    echo "Re-run with --apply to create the missing Releases."
fi
echo "============================================================"
