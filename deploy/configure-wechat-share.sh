#!/usr/bin/env bash
set -euo pipefail
# Run on the existing meiye Docker host. Secret input is never echoed.
container=meiye-live
data_dir=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$container")
if [[ "$data_dir" != /home/ubuntu/meiye-live/data ]]; then
  printf '%s\n' 'Unexpected meiye data mount; no configuration was changed.' >&2
  exit 1
fi
read -r -s -p 'Paste this mini program AppSecret (input hidden): ' secret </dev/tty
printf '\n' >/dev/tty
if [[ ! "$secret" =~ ^[a-zA-Z0-9]{32}$ ]]; then
  printf '%s\n' 'Expected a 32-character mini program AppSecret; nothing was saved.' >&2
  exit 1
fi
umask 077
config_file="$data_dir/wechat-share.properties"
if [[ -f "$config_file" ]]; then
  cp -p -- "$config_file" "$config_file.backup-$(date +%Y%m%d%H%M%S)"
fi
temp_file=$(mktemp "$data_dir/.wechat-share.XXXXXX")
trap 'rm -f -- "$temp_file"; unset secret' EXIT
printf 'meiye.wechat.app-id=wxb495cab07d4737c7\nmeiye.wechat.app-secret=%s\nmeiye.wechat.env-version=release\n' "$secret" > "$temp_file"
chmod 600 "$temp_file"
mv -f -- "$temp_file" "$config_file"
unset secret
docker restart "$container" >/dev/null
printf '%s\n' 'Mini program secret saved privately. Only meiye-live was restarted.'
