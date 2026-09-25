#!/usr/bin/env bash
# Opens the fitting room full-screen on a Raspberry Pi (Raspberry Pi OS, desktop).
#
#   ./pi-kiosk.sh install   one-time: saves the URL and starts the kiosk at every login
#   ./pi-kiosk.sh           launches the kiosk now
#
# The URL (including ?key=<ACCESS_CODE>) is kept in ~/.config/magimirror/url,
# outside the repo, so the access code never ends up on GitHub.
set -euo pipefail

CONFIG_DIR="$HOME/.config/magimirror"
URL_FILE="$CONFIG_DIR/url"
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

install() {
  read -rp "Mirror URL (e.g. https://your-app.vercel.app/try-on?key=CODE): " url
  mkdir -p "$CONFIG_DIR"
  printf '%s\n' "$url" > "$URL_FILE"
  chmod 600 "$URL_FILE"

  # Bookworm and later (Wayland, labwc)
  mkdir -p "$HOME/.config/labwc"
  touch "$HOME/.config/labwc/autostart"
  grep -qF "$SELF" "$HOME/.config/labwc/autostart" || echo "$SELF &" >> "$HOME/.config/labwc/autostart"

  # Bullseye and older (X11, LXDE)
  mkdir -p "$HOME/.config/autostart"
  cat > "$HOME/.config/autostart/magimirror.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=MagiMirror
Exec=$SELF
EOF

  echo "Installed. Reboot, or run $SELF to start now."
  echo "Also turn off screen blanking: sudo raspi-config > Display Options > Screen Blanking > No"
}

launch() {
  if [[ ! -s "$URL_FILE" ]]; then
    echo "No URL saved. Run: $SELF install" >&2
    exit 1
  fi
  url="$(<"$URL_FILE")"

  # Wait (up to ~60 s) for the network so the first load doesn't fail.
  host="$(printf '%s' "$url" | sed -E 's#^[a-z]+://([^/:?]+).*#\1#')"
  for _ in $(seq 1 30); do
    ping -c1 -W2 "$host" >/dev/null 2>&1 && break
    sleep 2
  done

  # X11 only; on Wayland use raspi-config (see install).
  if [[ -n "${DISPLAY:-}" ]] && command -v xset >/dev/null; then
    xset s off -dpms s noblank || true
  fi

  browser="$(command -v chromium || command -v chromium-browser)"
  exec "$browser" \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --no-first-run \
    --check-for-update-interval=31536000 \
    --overscroll-history-navigation=0 \
    "$url"
}

case "${1:-}" in
  install) install ;;
  "") launch ;;
  *) echo "Usage: $0 [install]" >&2; exit 1 ;;
esac
