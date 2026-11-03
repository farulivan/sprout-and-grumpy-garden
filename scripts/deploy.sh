#!/bin/sh
# Cloudflare's deploy command for the game: Settings -> Build -> Deploy command is `sh scripts/deploy.sh`.
#
# Cloudflare builds every merge to main, but only a release goes online: the merge of release-please's pull request,
# whose commit is titled "chore(main): release X.Y.Z (#N)" (see "Versions" in the README). Anything else is uploaded as
# a version that isn't deployed, to try at main-sprout.farulivan.workers.dev before it is released.
set -eu

title=$(git log -1 --format=%s)
case "$title" in
  "chore(main): release "[0-9]*)
    echo "A release ($title): putting it online."
    exec ./node_modules/.bin/wrangler deploy
    ;;
  *)
    echo "Not a release ($title): uploading it to try, without putting it online."
    exec ./node_modules/.bin/wrangler versions upload --preview-alias main
    ;;
esac
