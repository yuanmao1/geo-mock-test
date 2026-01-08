#!/usr/bin/env sh
set -eu

if [ "${ENABLE_XVFB:-1}" = "1" ]; then
  Xvfb "${DISPLAY:-:99}" -screen 0 "${XVFB_SCREEN:-1920x1080x24}" -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
fi

ACCESS_LOG_ARGS="--no-access-log"
if [ "${UVICORN_ACCESS_LOG:-0}" = "1" ]; then
  ACCESS_LOG_ARGS=""
fi

exec uvicorn app.main:app \
  --host "${HOST:-0.0.0.0}" \
  --port "${PORT:-8000}" \
  ${ACCESS_LOG_ARGS}
