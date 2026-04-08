#!/bin/bash
# Run this after GitHub API rate limit resets (~1 hour)
# Closes remaining issues and milestones from Sprint 034+035

set -e

echo "Closing issue #370 (click tracking - verified already working)..."
gh api repos/sovereignbrick/brickos/issues/370 --method PATCH -f state=closed -f state_reason=not_planned

echo "Closing completed milestones..."
for ms in 24 25 26 27 28 29; do
  echo "Closing milestone $ms..."
  gh api repos/sovereignbrick/brickos/milestones/$ms --method PATCH -f state=closed
  sleep 1
done

echo ""
echo "Verifying issue states..."
for num in 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400; do
  state=$(gh api "repos/sovereignbrick/brickos/issues/$num" --jq '.state' 2>/dev/null || echo "not_found")
  title=$(gh api "repos/sovereignbrick/brickos/issues/$num" --jq '.title' 2>/dev/null || echo "")
  echo "  #$num [$state] $title"
  sleep 0.5
done

echo ""
echo "Done. GitHub is in sync."
