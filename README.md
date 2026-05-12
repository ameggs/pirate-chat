# Pirate Chat 🏴‍☠️

A portable chat and file-sharing app that runs on any Linux machine — perfect for Raspberry Pi, LAN parties, events, or offline gatherings.

**No internet required.** Just a WiFi hotspot and a browser.

## Features

- 💬 **Real-time chat** — send messages and images
- 📁 **File sharing board** — share files up to 1 GB
- 🔐 **Admin panel** — moderate chat, delete files, kick users, view stats
- 📊 **Live stats** — see active users, total messages, upload size
- 📱 **Mobile-friendly** — works on any phone browser
- 🚀 **Lightweight** — runs on a Pi Zero 2W (512 MB RAM)
- 📡 **Offline hotspot** — becomes its own WiFi access point with captive portal
- ⚙️ **Auto-start** — systemd service, comes up on boot

## Quick Start Options

### Option A: One-shot installer (Raspberry Pi, recommended)

Run this on a **fresh Raspberry Pi OS** (Bookworm+) with WiFi:

```bash
sudo bash install-piratechat.sh
```

The script will prompt you for:
- **Admin password** — secures the dashboard (with confirmation)
- **WiFi SSID** — the hotspot name (default: `piratechat`)

That's it. One command does everything:

1. Installs system packages (Python, pip, NetworkManager, iptables)
2. Clones Pirate Chat from GitHub
3. Installs Python dependencies
4. Creates config with your admin password
5. Installs and starts the systemd service
6. Sets up a WiFi hotspot with captive portal

When it finishes, the Pi is broadcasting your chosen SSID — connect any device and Pirate Chat opens automatically.

**For automation** (non-interactive), pass arguments:

```bash
sudo bash install-piratechat.sh --password YourAdminPass --ssid MyNetwork
```

> **🔌 Default IP:** `10.42.0.1:5000` — connect any device to the hotspot and open this address in a browser.
>
> **⚠️ SSH note:** Once the hotspot activates, your Pi's WiFi switches to AP mode. On a Pi Zero 2W (single WiFi chip), you will **lose SSH access over WiFi**. To get SSH back, connect a device to the hotspot and SSH to `10.42.0.1`, or use a USB Ethernet adapter. Pi 3/4/5 models with Ethernet stay accessible via the wired connection.

### Option B: Interactive setup (any Linux machine)

```bash
git clone https://github.com/ameggs/pirate-chat.git
cd pirate-chat
python3 setup.py
```

The setup wizard will guide you through:
- Setting an admin password
- Generating a secure session key
- Installing Python packages
- Optionally installing a systemd service
- Optionally setting up a WiFi hotspot (Pi only)

Then run:

```bash
python3 app.py
```

Or if you installed the systemd service:

```bash
sudo systemctl start pirate-chat
```

## Pi Deployment (the full picture)

This is the intended use case — a Pi Zero 2W running as a standalone chat hub.

### What you need

- Raspberry Pi Zero 2W (or Pi 3/4/5) with WiFi
- 16 GB+ microSD card
- Raspberry Pi OS Lite (Bookworm, 64-bit)

### After the Pi boots

```bash
# SSH into the Pi (default: pi/raspberry)
ssh pi@<pi-ip>

# Download and run the installer (will prompt for password + SSID)
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/ameggs/pirate-chat/main/install-piratechat.sh)"
```

**Your Pi is now an offline chat hub.** SSH will drop once the hotspot activates.

### ⚠️ Important

On a **Pi Zero 2W**, the WiFi chip can run as an access point **or** a client — not both at once. When the hotspot activates, the Pi disconnects from your home WiFi. To SSH again, either:
- Connect a device to the hotspot and SSH to `10.42.0.1`
- Use a USB Ethernet adapter

For other Pi models (3/4/5) with Ethernet, the hotspot runs on WiFi while Ethernet maintains network access.

## How the Hotspot Works

When someone connects to the hotspot:

1. **DNS catch-all** — every domain they visit resolves to the Pi (`10.42.0.1`)
2. **Port redirect** — HTTP (80) is forwarded to the Flask app (5000)
3. **Captive portal** — phones/laptops auto-detect the portal and pop up a "Sign in to network" notification
4. **Landing page** — the Pirate Chat home screen with links to chat and file sharing

The hotspot uses NetworkManager's built-in AP mode (not hostapd directly) and its internal dnsmasq for DHCP/DNS. No separate dnsmasq installation needed.

### Networking details

| Setting | Value |
|---------|-------|
| Hotspot IP | 10.42.0.1 |
| Subnet | 10.42.0.0/24 |
| DHCP | NetworkManager shared (built-in) |
| DNS | Catch-all, all domains → 10.42.0.1 |
| HTTP redirect | Port 80 → 5000 |
| WiFi | 2.4 GHz, channel bg, no password |

## File Structure

```
pirate-chat/
├── app.py                         # Main Flask application
├── setup.py                       # Interactive installer wizard
├── install-piratechat.sh          # All-in-one Pi installer (this is what you want)
├── config.py.example              # Configuration template
├── config.py                      # Your config (gitignored — NEVER commit this!)
├── requirements.txt               # Python dependencies
├── pirate-chat.service            # systemd unit file
├── templates/
│   ├── index.html                 # Landing page
│   ├── chat.html                  # Chat interface
│   ├── files.html                 # File sharing board
│   └── admin.html                 # Admin dashboard
├── static/
│   ├── style.css
│   └── script.js
├── uploads/                       # Chat images (gitignored)
├── shared_files/                  # Shared files (gitignored)
└── chat.db                        # SQLite database (gitignored)
```

## Admin Panel

Navigate to `/admin` on your Pirate Chat server and enter the password you set during installation.

From the admin dashboard you can:
- View live stats (messages, files, active users, storage)
- Browse all messages and files
- Delete individual messages or files
- Clear the entire chat
- Kick a user (remove all their messages)

## Troubleshooting

### "apt install" gets killed (OOM on Pi Zero 2W)

The Pi Zero 2W has 512 MB RAM. If apt runs out of memory:

```bash
# Install packages one at a time
sudo apt update
sudo apt install -y python3
sudo apt install -y python3-pip
sudo apt install -y git
sudo apt install -y network-manager iptables dnsmasq-base
```

Then run the install script — it skips already-installed packages.

### WiFi hotspot won't activate

Check if the Pi's WiFi supports AP mode:

```bash
sudo iw list | grep -A 5 "Supported interface modes" | grep -i ap
```

If "AP" is listed, you're good. If not, the Pi's WiFi chip doesn't support access point mode.

### Lost SSH after hotspot comes up

The Pi Zero 2W drops WiFi client mode when the hotspot activates. Either:
- Connect to the hotspot and SSH to `10.42.0.1`
- Plug in a USB Ethernet adapter

### Service won't start

```bash
sudo journalctl -u pirate-chat -n 50 --no-pager
```

Common issues: port conflict, config.py not found, permissions on uploads/ directory.

## License

MIT — do whatever you want with it.

Built with ❤️ for offline communities and local gatherings.
