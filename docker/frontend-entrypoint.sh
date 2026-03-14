#!/bin/sh
set -eu

INDEX="/srv/index.html"

if [ -n "${APP_NAME:-}" ]; then
  sed -i "s/__APP_NAME__/${APP_NAME}/g" "$INDEX"
fi

exec "$@"
