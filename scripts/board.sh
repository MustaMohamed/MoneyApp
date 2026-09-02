#!/usr/bin/env bash
# The one writer to Project #2 "MoneyApp". Field and option ids live here only.
set -euo pipefail

OWNER=MustaMohamed
REPO=MustaMohamed/MoneyApp
PROJECT=2
PROJECT_ID=PVT_kwHOAPEDM84BiHOr
STATUS_FIELD=PVTSSF_lAHOAPEDM84BiHOrzhhAbFg

option_id() {
  case "$1" in
    "Todo") echo f75ad846 ;;
    "Defined") echo c5389d5e ;;
    "Ready For Development") echo beea98be ;;
    "Planned") echo 13576c63 ;;
    "In Progress") echo 47fc9ee4 ;;
    "In Review") echo ce80cd5a ;;
    "Awaiting Human") echo fa6bc2d1 ;;
    "Blocked") echo 9bc3e0fb ;;
    "Done") echo 98236657 ;;
    *) echo "board.sh: unknown status '$1'" >&2; exit 2 ;;
  esac
}

item_id() {
  gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
    --jq ".items[] | select(.content.number == $1) | .id"
}

# Children at Defined whose Depends on are all closed -> Ready For Development; a parent whose children are all closed -> closed, Done, then the same one level up.
promote() {
  parent=$1
  total=0
  open=0
  while IFS=$'\t' read -r num state; do
    [ -n "$num" ] || continue
    total=$((total + 1))
    [ "$state" = "open" ] || continue
    open=$((open + 1))
    [ "$(bash "$0" get "$num")" = "Defined" ] || continue
    deps=$(gh api "repos/$REPO/issues/$num" --jq .body | head -1 | grep -o 'Depends on .*' | sed 's/ · Verify.*//' || true)
    if [ -z "$deps" ]; then
      echo "#$num: no Depends on line, skipped" >&2
      continue
    fi
    blocked=0
    for dep in $(printf '%s\n' "$deps" | grep -oE '#[0-9]+' | tr -d '#' || true); do
      [ "$(gh api "repos/$REPO/issues/$dep" --jq .state)" = "closed" ] || blocked=1
    done
    if [ "$blocked" -eq 0 ]; then
      bash "$0" status "$num" "Ready For Development"
    fi
  done < <(gh api "repos/$REPO/issues/$parent/sub_issues" --paginate --jq '.[] | "\(.number)\t\(.state)"')
  if [ "$total" -gt 0 ] && [ "$open" -eq 0 ] && [ "$(gh api "repos/$REPO/issues/$parent" --jq .state)" = "open" ]; then
    gh issue close "$parent" --repo "$REPO" --comment "All sub-issues closed." >/dev/null
    bash "$0" status "$parent" Done
    gp=$(gh api "repos/$REPO/issues/$parent/parent" --jq .number 2>/dev/null || true)
    if [ -n "$gp" ]; then
      promote "$gp"
    fi
  fi
}

usage() {
  cat >&2 <<'EOF'
usage: bash scripts/board.sh <command> ...
  add <issue>                  put the issue on the board (idempotent), print the item id
  status <issue> <Status>      set the Status field; Status is the option name, quoted if it has spaces
  get <issue>                  print the issue's current Status name
  link <parent> <child>        make <child> a sub-issue of <parent>
  promote <parent>             Defined children with every Depends on closed -> Ready For Development; all children closed -> parent closed and Done
  next-ma                      print the next MA-nnn (highest in any issue title, plus one)
EOF
  exit 2
}

cmd=${1:-}
[ -n "$cmd" ] || usage
shift

case "$cmd" in
  add)
    [ $# -eq 1 ] || usage
    id=$(item_id "$1")
    if [ -n "$id" ]; then
      echo "$id"
    else
      gh project item-add "$PROJECT" --owner "$OWNER" \
        --url "https://github.com/$REPO/issues/$1" --format json --jq .id
    fi
    ;;
  status)
    [ $# -eq 2 ] || usage
    opt=$(option_id "$2")
    id=$(bash "$0" add "$1")
    gh project item-edit --project-id "$PROJECT_ID" --id "$id" \
      --field-id "$STATUS_FIELD" --single-select-option-id "$opt" >/dev/null
    echo "#$1 -> $2"
    ;;
  get)
    [ $# -eq 1 ] || usage
    gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
      --jq ".items[] | select(.content.number == $1) | .status"
    ;;
  link)
    [ $# -eq 2 ] || usage
    child_id=$(gh api "repos/$REPO/issues/$2" --jq .id)
    gh api -X POST "repos/$REPO/issues/$1/sub_issues" -F sub_issue_id="$child_id" >/dev/null
    echo "#$2 is a sub-issue of #$1"
    ;;
  promote)
    [ $# -eq 1 ] || usage
    promote "$1"
    ;;
  next-ma)
    [ $# -eq 0 ] || usage
    n=$(gh issue list --repo "$REPO" --state all --limit 1000 --search "MA-" --json title \
      --jq '[.[].title | capture("MA-(?<n>[0-9]{3})") | .n | tonumber] | max')
    printf 'MA-%03d\n' "$((n + 1))"
    ;;
  *)
    usage
    ;;
esac
