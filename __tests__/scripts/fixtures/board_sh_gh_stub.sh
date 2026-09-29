#!/usr/bin/env bash
# Stub gh for board_promote.test.ts: answers each call from a canned file in $GH_STUB_DIR through jq, as gh --jq does.
set -u
d="$GH_STUB_DIR"
jq -cn '$ARGS.positional' --args -- "$@" >>"$d/calls.jsonl"

unhandled() {
  printf '%s\n' "$*" >>"$d/unhandled.log"
  echo "stub gh: unhandled: $*" >&2
  exit 97
}

filter=""
file=""
case "${1:-}" in
  api)
    shift
    endpoint=""
    query=""
    method=GET
    while [ $# -gt 0 ]; do
      case "$1" in
        --jq) filter="$2"; shift 2 ;;
        -X | --method) method="$2"; shift 2 ;;
        -f | -F | --raw-field | --field)
          case "$2" in query=*) query="${2#query=}" ;; esac
          shift 2 ;;
        --paginate | --slurp) shift ;;
        -*) unhandled "api flag $1" ;;
        *) endpoint="$1"; shift ;;
      esac
    done
    if [ "$endpoint" = graphql ]; then
      case "$query" in
        *updateProjectV2ItemFieldValue*) echo '{"data":{"updateProjectV2ItemFieldValue":{"projectV2Item":{"id":"stub"}}}}'; exit 0 ;;
        *'items(first'*) file="$d/board_items.json" ;;
        *) unhandled "graphql query" ;;
      esac
    else
      [ "$method" = GET ] || unhandled "api $method $endpoint"
      rest="${endpoint#repos/MustaMohamed/MoneyApp/}"
      [ "$rest" != "$endpoint" ] || unhandled "api $endpoint"
      file="$d/$(printf '%s' "$rest" | tr '/' '_').json"
    fi
    ;;
  issue)
    [ "${2:-}" = list ] || unhandled "issue ${2:-}"
    shift 2
    while [ $# -gt 0 ]; do
      case "$1" in
        --jq) filter="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    file="$d/issue_list.json"
    ;;
  *) unhandled "$*" ;;
esac

if [ ! -f "$file" ]; then
  printf '%s\n' "${file##*/}" >>"$d/missing.log"
  echo 'gh: Not Found (HTTP 404)' >&2
  exit 1
fi
if [ -n "$filter" ]; then jq -r "$filter" "$file"; else cat "$file"; fi
