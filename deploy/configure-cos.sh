#!/usr/bin/env bash
set -euo pipefail

container=meiye-live
data_dir=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$container")
if [[ "$data_dir" != /home/ubuntu/meiye-live/data ]]; then
  printf '%s\n' 'Unexpected meiye data mount; no configuration was changed.' >&2
  exit 1
fi

read -r -p 'COS bucket: ' bucket </dev/tty
read -r -p 'COS region [ap-guangzhou]: ' region </dev/tty
region=${region:-ap-guangzhou}
read -r -s -p 'Paste rotated COS SecretId (input hidden): ' secret_id </dev/tty
printf '\n' >/dev/tty
read -r -s -p 'Paste rotated COS SecretKey (input hidden): ' secret_key </dev/tty
printf '\n' >/dev/tty

if [[ ! "$bucket" =~ ^[a-z0-9][a-z0-9-]{2,62}-[0-9]{6,12}$ || ! "$region" =~ ^[a-z0-9-]+$ ||
      ! "$secret_id" =~ ^[A-Za-z0-9]{10,128}$ || ! "$secret_key" =~ ^[A-Za-z0-9]{20,128}$ ]]; then
  printf '%s\n' 'Invalid COS bucket, region, or credential format; nothing was saved.' >&2
  unset secret_id secret_key
  exit 1
fi

umask 077
config_file="$data_dir/cos.properties"
if [[ -f "$config_file" ]]; then
  cp -p -- "$config_file" "$config_file.backup-$(date +%Y%m%d%H%M%S)"
fi
temp_file=$(mktemp "$data_dir/.cos.XXXXXX")
trap 'rm -f -- "$temp_file"; unset secret_id secret_key' EXIT
printf 'meiye.cos.bucket=%s\nmeiye.cos.region=%s\nmeiye.cos.secret-id=%s\nmeiye.cos.secret-key=%s\n' \
  "$bucket" "$region" "$secret_id" "$secret_key" > "$temp_file"
chmod 600 "$temp_file"
mv -f -- "$temp_file" "$config_file"
unset secret_id secret_key

if ! docker restart "$container" >/dev/null; then
  printf '%s\n' 'COS settings saved, but the application restart failed.' >&2
  exit 1
fi
printf '%s\n' 'COS settings saved privately. Only meiye-live was restarted.'
