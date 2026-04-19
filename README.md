# 🎵 Discord Music Bot

A full-featured Discord music bot that plays audio from YouTube with search, queue management, and volume control — built with **discord.js v14** and **play-dl**.

---

## ✨ Features

| Command | Description |
|---|---|
| `/play <query or URL>` | Search by name or paste a YouTube URL |
| `/skip` | Skip the current song |
| `/pause` | Pause playback |
| `/resume` | Resume paused playback |
| `/stop` | Stop and clear the queue |
| `/queue` | Display the song queue |
| `/volume <0–100>` | Adjust volume |
| `/nowplaying` | Show current song info |

---

## 🛠 Prerequisites

- **Node.js v18+** (required by discord.js v14)
- **FFmpeg** — installed automatically via `ffmpeg-static`
- A **Discord Bot Token** from the [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🚀 Setup

### 1. Clone / Download the project
```bash
git clone <your-repo-url>
cd discord-music-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Then edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
```

### 4. Get your Bot Token & Client ID
1. Go to https://discord.com/developers/applications
2. Create a **New Application**
3. Go to **Bot** tab → click **Reset Token** → copy it
4. Go to **OAuth2** → copy the **Client ID**
5. Enable these **Privileged Gateway Intents** under the Bot tab:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 5. Invite the bot to your server
Generate an invite URL from: `OAuth2 > URL Generator`  
Scopes: `bot`, `applications.commands`  
Permissions: `Connect`, `Speak`, `Send Messages`, `Read Messages/View Channels`

### 6. Deploy slash commands
```bash
npm run deploy
```

### 7. Start the bot
```bash
npm start
```

---

## 📁 Project Structure

```
discord-music-bot/
├── index.js              # Bot entry point & event handlers
├── deploy-commands.js    # Registers slash commands with Discord
├── package.json
├── .env.example
└── src/
    ├── MusicQueue.js     # Core queue/player logic per guild
    └── commands/
        ├── play.js       # /play command
        └── other.js      # All other music commands
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `opus` errors | Run `npm install @discordjs/opus` or `npm install opusscript` |
| Bot joins but no audio | Make sure FFmpeg is working: `npx ffmpeg-static` |
| Slash commands not showing | Run `npm run deploy` and wait ~1 hour for global propagation (or use guild-specific commands for instant) |
| `Could not connect` error | Check the bot has `Connect` and `Speak` permissions in the voice channel |

---

## 📝 Notes

- The bot uses **inline volume control** — volume changes take effect immediately.
- Queues are **per-guild** (server), so multiple servers work independently.
- The bot **auto-disconnects** after the queue is empty (5s delay).
