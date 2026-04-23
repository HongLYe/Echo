require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const play = require("play-dl");
const MusicQueue = require("./MusicQueue");
const playCmd = require("./play");
const { skip, stop, pause, resume, queueCmd, volume, nowplaying } = require("./other");

// ── Environment validation ────────────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN environment variable is not set!");
  console.error("Please create a .env file with your Discord bot token.");
  console.error("Example .env file:\n  DISCORD_TOKEN=your_bot_token_here");
  process.exit(1);
}

// ── Bot client setup ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Commands map ──────────────────────────────────────────────────────────────
const commands = new Collection();
const allCommands = [playCmd, skip, stop, pause, resume, queueCmd, volume, nowplaying];
allCommands.forEach((cmd) => {
  if (cmd && cmd.data && cmd.data.name) {
    commands.set(cmd.data.name, cmd);
  } else {
    console.warn(`⚠️  Skipping invalid command: ${JSON.stringify(cmd)}`);
  }
});

// ── Per-guild music queues ────────────────────────────────────────────────────
const queues = new Map();

// ── Events ────────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
  
  // Initialize play-dl tokens
  try {
    await play.validate();
    console.log("✅ play-dl tokens validated");
  } catch (err) {
    console.error("⚠️  play-dl token validation failed:", err.message);
    console.error("Music playback may not work correctly.");
  }
  
  client.user.setActivity("🎵 /play to start music");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`⚠️  Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction, queues);
  } catch (err) {
    console.error(`❌ Error in /${interaction.commandName}:`, err);
    
    const errorMsg = `❌ An error occurred: ${err.message || "Unknown error"}`;
    const msgOptions = { content: errorMsg, ephemeral: true };
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(msgOptions);
      } else {
        await interaction.reply(msgOptions);
      }
    } catch (replyErr) {
      // Failed to reply (e.g., interaction expired), log only
      console.error("Failed to send error message to user:", replyErr);
    }
  }
});

// Auto-cleanup: remove empty queues when bot leaves VC
client.on("voiceStateUpdate", (oldState, newState) => {
  const botId = client.user?.id;
  if (!botId) return;
  
  // Check if it's the bot leaving a voice channel
  if (oldState.member?.user?.id === botId && !newState.channelId) {
    const guildId = oldState.guild?.id;
    if (guildId) {
      const queue = queues.get(guildId);
      if (queue) {
        queue.stop();
        queues.delete(guildId);
        console.log(`🧹 Cleaned up queue for guild ${guildId}`);
      }
    }
  }
});

// Periodic cleanup: remove stale queue entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [guildId, queue] of queues.entries()) {
    // Remove queues with no connection and empty songs for more than 10 minutes
    if (!queue.connection && queue.songs.length === 0 && !queue.current) {
      queues.delete(guildId);
      console.log(`🧹 Removed stale queue for guild ${guildId}`);
    }
  }
}, 5 * 60 * 1000);

// ── Graceful shutdown handling ────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Stop all active queues and disconnect voice connections
  for (const [guildId, queue] of queues.entries()) {
    try {
      if (queue.textChannel) {
        await queue.textChannel.send("🛑 Bot is shutting down. Goodbye!");
      }
      queue.stop();
    } catch (err) {
      console.error(`Error stopping queue for guild ${guildId}:`, err);
    }
  }
  queues.clear();
  
  // Destroy client connection
  if (client.ws.readyState === 1) { // WebSocket is open
    await client.destroy();
  }
  
  console.log("✅ Shutdown complete.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  // Don't shutdown on every rejection, but log it
});

client.login(token);
