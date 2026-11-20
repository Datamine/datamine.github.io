#!/usr/bin/env bash
set -euo pipefail
umask 077
command -v flock >/dev/null

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
compose=(docker compose -f "$script_dir/compose.yaml")
env_file=${COMPOSE_ENV_FILE:-$script_dir/.env}
if [[ -n ${COMPOSE_ENV_FILE:-} && ! -f $env_file ]]; then
    echo "Compose environment file not found: $env_file" >&2
    exit 2
fi
if [[ -f $env_file ]]; then compose+=(--env-file "$env_file"); fi
# Resolve the actual bind path through Compose, including its .env settings.
backup_dir=$("${compose[@]}" config --format json | python3 -c 'import json,sys; print(next(v["source"] for v in json.load(sys.stdin)["services"]["game"]["volumes"] if v["target"] == "/backups"))')
mkdir -p -- "$backup_dir"
exec 9>"$backup_dir/.backup.lock"
flock -n 9 || { echo 'A backup is already running; skipping.'; exit 0; }
filename="world-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
"${compose[@]}" run --rm --no-deps -T --user 0:0 --entrypoint node game backup.mjs --output "/backups/$filename"
if [[ -n ${S3_BACKUP_URI:-} ]]; then
    aws s3 cp "$backup_dir/$filename" "${S3_BACKUP_URI%/}/$filename" --only-show-errors
fi
# Only prune after the dump and optional off-host upload have succeeded.
find "$backup_dir" -maxdepth 1 -type f -name 'world-????????T??????Z.sqlite' -mmin +10080 -delete
echo "Backup complete: $backup_dir/$filename"
