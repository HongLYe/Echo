require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const playCmd = require("./src/commands/play");
const { skip, stop, pause, resume, queueCmd, volume, nowplaying } =
  require("./src/commands/other");

// ── Bot client setup ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// ── Commands map ──────────────────────────────────────────────────────────────
const commands = new Collection();
const allCommands = [playCmd, skip, stop, pause, resume, queueCmd, volume, nowplaying];
allCommands.forEach((cmd) => commands.set(cmd.data.name, cmd));

// ── Per-guild music queues ────────────────────────────────────────────────────
const queues = new Map();

// ── Events ────────────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("🎵 /play to start music");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, queues);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const msg = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

// Auto-cleanup: remove empty queues when bot leaves VC
client.on("voiceStateUpdate", (oldState, newState) => {
  const botId = client.user.id;
  if (oldState.member?.id === botId && !newState.channelId) {
    queues.delete(oldState.guild.id);
  }
});

client.login(process.env.DISCORD_TOKEN);
