# Pirate Chat 🏴‍☠️

A portable chat and file-sharing app that runs on any Linux machine — perfect for Raspberry Pi, LAN parties, events, or offline gatherings.

**No internet required.** Just a WiFi hotspot and a browser.

## Features

- 💬 **Real-time chat** — send messages and images
- 📁 **File sharing board** — share files up to 1 GB
- 🔐 **Admin panel** — moderate chat, delete files, kick users, view stats
- 📊 **Live stats** — see active users, total messages, and storage usage
- 📱 **Mobile-friendly** — works on any phone browser
- 🍎 **iOS captive portal** — auto-detected on Apple devices
- 🚀 **Lightweight** — runs on a Pi Zero 2W with ease
- ⚡ **Offline-capable** — works as a WiFi access point (hostapd + dnsmasq)

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/pirate-chat.git
cd pirate-chat
python3 setup.py
```

The setup script will:
- Ask for your admin password
- Generate a secure session key
- Create config files
- Install dependencies
- Optionally install as a systemd service (auto-start on boot)

### 2. Run It

```bash
python3 app.py
```

Or if you installed the systemd service:

```bash
sudo systemctl start pirate-chat
```

### 3. Open It

Open `http://<your-pi-ip>:5000` in any browser on the same network.

## File Structure

```
pirate-chat/
├── app.py                  # Main Flask application
├── setup.py                # Interactive installer (first-run)
├── config.py.example       # Configuration template
├── config.py               # Your config (gitignored — NEVER commit this!)
├── requirements.txt        # Python dependencies
├── pirate-chat.service     # systemd unit file
├── templates/
│   ├── index.html          # Landing page
│   ├── chat.html           # Chat interface
│   ├── files.html          # File sharing board
│   └── admin.html          # Admin dashboard
├── static/
│   ├── style.css
│   └── script.js
├── uploads/                # Chat images (gitignored)
├── shared_files/           # Shared files (gitignored)
├── chat.db                 # SQLite database (gitignored)
└── .gitignore
```

## Offline WiFi Hotspot Mode

For fully offline use, set up `hostapd` and `dnsmasq` on your Raspberry Pi:

```bash
sudo apt install hostapd dnsmasq
```

Configure your Pi to broadcast a WiFi network called "PirateChat" with a captive portal that automatically opens the app when users connect.

## Admin Panel

Navigate to `/admin` on your Pirate Chat server and enter the password you set during `setup.py`.

From the admin dashboard you can:
- View live stats (messages, files, active users, storage)
- Browse all messages and files
- Delete individual messages or files
- Clear the entire chat
- Kick a user (remove all their messages)

## License

MIT — do whatever you want with it.

Built with ❤️ for offline communities and local gatherings.
