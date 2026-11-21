#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "$script_dir/../../.." && pwd)
output="$script_dir/game.tar.gz"
# Package the current working tree, including uncommitted game changes.
# Never ship local databases, dependencies, credentials or Terraform state.
COPYFILE_DISABLE=1 tar -czf "$output" \
    --exclude='.git' --exclude='.env' --exclude='.env.*' \
    --exclude='node_modules' --exclude='data' --exclude='backups' \
    --exclude='.terraform' --exclude='*.tfstate*' --exclude='*.tfvars' \
    --exclude='*.sqlite*' --exclude='*.log' --exclude='game.tar.gz' \
    --exclude='.build' --exclude='.DS_Store' --exclude='__pycache__' \
    --exclude='.aws' --exclude='.codex' --exclude='.agents' \
    -C "$repo_root" sf
echo "Packaged $output"
