#!/bin/bash
# Pirate Chat — Hotspot & Captive Portal Setup
# ==============================================
# Run this on a Raspberry Pi to create a standalone WiFi hotspot
# that auto-opens Pirate Chat when users connect.
#
# Usage: sudo bash pirate-chat-hotspot.sh [SSID]
#   SSID defaults to "piratechat" if not provided

set -e

SSID="${1:-piratechat}"
HOTSPOT_IP="10.42.0.1"
APP_PORT="5000"

echo "  ╔══════════════════════════════════════╗"
echo "  ║   Pirate Chat — Hotspot Installer     ║"
echo "  ╚════════════════════════════════════════╝"
echo "  SSID: $SSID"
echo

# -------------------------------
# 1. Install required packages
# -------------------------------
echo "  ─── Installing packages ───"
apt update -qq
apt install -y -qq hostapd dnsmasq iptables > /dev/null 2>&1
echo "  ✅  Packages installed"

# -------------------------------
# 2. Create hotspot via NetworkManager
# -------------------------------
echo "  ─── Configuring hotspot ───"

# Delete existing connection if present
nmcli connection delete "$SSID" 2>/dev/null || true

# Create AP hotspot
nmcli connection add \
    type wifi \
    ifname wlan0 \
    con-name "$SSID" \
    autoconnect yes \
    autoconnect-priority 100 \
    ssid "$SSID"

nmcli connection modify "$SSID" \
    802-11-wireless.mode ap \
    802-11-wireless.band bg

nmcli connection modify "$SSID" ipv4.method shared

# Disconnect from any existing WiFi to free wlan0
nmcli connection down "$SSID" 2>/dev/null || true
nmcli connection up "$SSID"

echo "  ✅  Hotspot '$SSID' configured"

# -------------------------------
# 3. Captive portal DNS catch-all
# -------------------------------
echo "  ─── Setting up captive portal ───"

mkdir -p /etc/NetworkManager/dnsmasq-shared.d/
cat > /etc/NetworkManager/dnsmasq-shared.d/pirate-chat-portal.conf << EOF
# Pirate Chat captive portal — all domains resolve to the Pi
address=/#/$HOTSPOT_IP
EOF
echo "  ✅  DNS catch-all configured"

# -------------------------------
# 4. Port redirect (80/443 -> 5000)
# -------------------------------
cat > /usr/local/bin/pirate-chat-redirect.sh << 'SCRIPT'
#!/bin/bash
# Pirate Chat port redirect — runs when the hotspot comes up
iptables -t nat -C PREROUTING -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 5000 2>/dev/null || \
    iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 5000
iptables -t nat -C PREROUTING -i wlan0 -p tcp --dport 443 -j REDIRECT --to-port 5000 2>/dev/null || \
    iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 443 -j REDIRECT --to-port 5000
SCRIPT
chmod +x /usr/local/bin/pirate-chat-redirect.sh

# NetworkManager dispatcher — auto-apply rules when hotspot starts
cat > /etc/NetworkManager/dispatcher.d/99-pirate-chat << 'DISPATCHER'
#!/bin/bash
# Pirate Chat — apply captive portal iptables on hotspot start
if [ "$1" = "wlan0" ] && [ "$2" = "up" ]; then
    /usr/local/bin/pirate-chat-redirect.sh
fi
DISPATCHER
chmod +x /etc/NetworkManager/dispatcher.d/99-pirate-chat

# Apply rules immediately
/usr/local/bin/pirate-chat-redirect.sh
echo "  ✅  Port redirect (80/443 → $APP_PORT) active"

# -------------------------------
# 5. Summary
# -------------------------------
echo
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║     Pirate Chat Hotspot is ready! 🏴‍☠️       ║"
echo "  ╚══════════════════════════════════════════════╝"
echo
echo "  📡  WiFi: $SSID (no password)"
echo "  🌐  App:  http://$HOTSPOT_IP:$APP_PORT"
echo
echo "  Connect any device to '$SSID' — the app"
echo "  opens automatically (captive portal)."
echo
