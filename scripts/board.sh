#!/usr/bin/env bash
# The one writer to Project #2 "MoneyApp", and the only closer of a parent whose children all closed as completed. Field and option ids live here only.
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

# Prints the issue numbers a ticket header depends on, "NONE" for "nothing", "MISSING" without the field, "UNPARSED" when the field has no (#N).
deps_of() {
  local field
  case "$1" in *"Depends on "*) ;; *) echo MISSING; return ;; esac
  field=$(printf '%s\n' "$1" | sed -n 's/.*Depends on \(.*\)$/\1/p' | sed 's/ · .*//')
  if [ "$field" = "nothing" ]; then echo NONE; return; fi
  field=$(printf '%s\n' "$field" | grep -oE '#[0-9]+' | tr -d '#' | tr '\n' ' ' || true)
  if [ -z "${field// /}" ]; then echo UNPARSED; else echo "$field"; fi
}

promote() {
  local parent=$1 items milestone children child_re extras candidates kind num state reason line deps dep dstate blocked status id gp
  local total=0 open=0 completed=0 promoted=0 skipped=0 closed_cache=" " open_cache=" " US=$'\x1f'

  children=$(gh api "repos/$REPO/issues/$parent/sub_issues" --paginate \
    --jq '.[] | [.number, .state, (.state_reason // ""), ((.body // "") | split("\n")[0])] | map(tostring) | join("")') \
    || { echo "board.sh: could not list the sub-issues of #$parent" >&2; exit 1; }
  candidates=$(printf '%s\n' "$children" | sed $'/./s/^/child\x1f/')

  milestone=$(gh api "repos/$REPO/issues/$parent" --jq '.milestone.title // ""')
  if [ -n "$milestone" ] && [ -n "$children" ]; then
    child_re=$(printf '%s\n' "$children" | cut -d "$US" -f1 | paste -s -d '|' -)
    extras=$(gh issue list --repo "$REPO" --milestone "$milestone" --state open --limit 1000 --json number,body \
      --jq '.[] | [.number, "open", "", ((.body // "") | split("\n")[0])] | map(tostring) | join("")' \
      | grep -Ev "^($child_re|$parent)$US" | grep -E "Depends on .*#($child_re)([^0-9]|$)" || true)
    [ -z "$extras" ] || candidates=$(printf '%s\n%s\n' "$candidates" "$(printf '%s\n' "$extras" | sed $'s/^/dep\x1f/')")
  fi

  items=$(gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json)

  while IFS="$US" read -r kind num state reason line; do
    case "$num" in ''|*[!0-9]*) continue ;; esac
    if [ "$kind" = "child" ]; then
      total=$((total + 1))
      if [ "$state" != "open" ]; then
        case "$reason" in ''|completed) completed=$((completed + 1)) ;; esac
        continue
      fi
      open=$((open + 1))
    fi
    status=$(jq -r --argjson n "$num" '.items[] | select(.content.number == $n) | .status' <<<"$items")
    if [ -z "$status" ]; then
      echo "#$num: not on the board, skipped" >&2
      skipped=$((skipped + 1))
      continue
    fi
    case "$status" in Defined|Blocked) ;; *) continue ;; esac
    deps=$(deps_of "$line")
    case "$deps" in
      MISSING) echo "#$num: no Depends on field, skipped" >&2; skipped=$((skipped + 1)); continue ;;
      UNPARSED) echo "#$num: Depends on has no (#N), treated as blocked" >&2; skipped=$((skipped + 1)); continue ;;
      NONE) deps="" ;;
    esac
    blocked=0
    for dep in $deps; do
      case "$closed_cache" in *" $dep "*) continue ;; esac
      case "$open_cache" in *" $dep "*) blocked=1; continue ;; esac
      dstate=$(gh api "repos/$REPO/issues/$dep" --jq .state 2>/dev/null) || dstate=unknown
      if [ "$dstate" = "closed" ]; then closed_cache="$closed_cache$dep "; else open_cache="$open_cache$dep "; blocked=1; fi
    done
    [ "$blocked" -eq 0 ] || continue
    if [ "$status" = "Blocked" ]; then
      echo "#$num: Blocked with every dependency closed; move it by hand" >&2
      continue
    fi
    id=$(jq -r --argjson n "$num" '.items[] | select(.content.number == $n) | .id' <<<"$items")
    gh project item-edit --project-id "$PROJECT_ID" --id "$id" \
      --field-id "$STATUS_FIELD" --single-select-option-id "$(option_id "Ready For Development")" >/dev/null
    echo "#$num -> Ready For Development"
    promoted=$((promoted + 1))
  done <<<"$candidates"

  echo "#$parent: $total children, $open open, promoted $promoted, skipped $skipped"
  [ "$total" -gt 0 ] && [ "$open" -eq 0 ] || return 0
  if [ "$completed" -lt "$total" ]; then
    echo "#$parent: every child is closed but $((total - completed)) not as completed; left open" >&2
    return 0
  fi
  if [ "$(gh api "repos/$REPO/issues/$parent" --jq .state)" = "open" ]; then
    gh issue close "$parent" --repo "$REPO" --comment "All sub-issues completed." >/dev/null
    echo "#$parent closed"
  fi
  [ "$(bash "$0" get "$parent")" = "Done" ] || bash "$0" status "$parent" Done
  gp=$(gh api "repos/$REPO/issues/$parent/parent" --jq .number 2>/dev/null) || gp=""
  case "$gp" in ''|*[!0-9]*) return 0 ;; esac
  promote "$gp"
}

usage() {
  cat >&2 <<'EOF'
usage: bash scripts/board.sh <command> ...
  add <issue>                  put the issue on the board (idempotent), print the item id
  status <issue> <Status>      set the Status field; Status is the option name, quoted if it has spaces
  get <issue>                  print the issue's current Status name
  link <parent> <child>        make <child> a sub-issue of <parent>
  promote <parent>             Defined children, and milestone issues depending on them, with every Depends on closed -> Ready For Development; every child completed -> parent closed, Done, then one level up
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
