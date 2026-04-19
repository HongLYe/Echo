// ─────────────────────────────────────────────
// skip.js
// ─────────────────────────────────────────────
const { SlashCommandBuilder } = require("discord.js");

const skip = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.playing)
      return interaction.reply("❌ Nothing is playing!");
    queue.skip();
    await interaction.reply("⏭️ Skipped!");
  },
};

// ─────────────────────────────────────────────
// stop.js
// ─────────────────────────────────────────────
const stop = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and clear the queue"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.playing)
      return interaction.reply("❌ Nothing is playing!");
    queue.stop();
    queues.delete(interaction.guildId);
    await interaction.reply("⏹️ Stopped and cleared the queue.");
  },
};

// ─────────────────────────────────────────────
// pause.js
// ─────────────────────────────────────────────
const pause = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.playing)
      return interaction.reply("❌ Nothing is playing!");
    const paused = queue.pause();
    await interaction.reply(paused ? "⏸️ Paused." : "❌ Already paused.");
  },
};

// ─────────────────────────────────────────────
// resume.js
// ─────────────────────────────────────────────
const resume = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused song"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue) return interaction.reply("❌ Nothing is paused!");
    const resumed = queue.resume();
    await interaction.reply(resumed ? "▶️ Resumed!" : "❌ Not paused.");
  },
};

// ─────────────────────────────────────────────
// queue.js
// ─────────────────────────────────────────────
const queueCmd = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current song queue"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || (!queue.current && queue.songs.length === 0))
      return interaction.reply("📭 The queue is empty.");

    const lines = [];
    if (queue.current) {
      lines.push(`🎵 **Now Playing:** ${queue.current.title} \`[${queue.current.duration}]\``);
    }
    if (queue.songs.length > 0) {
      lines.push("\n**Up Next:**");
      queue.songs.slice(0, 10).forEach((s, i) => {
        lines.push(`${i + 1}. ${s.title} \`[${s.duration}]\``);
      });
      if (queue.songs.length > 10) {
        lines.push(`…and ${queue.songs.length - 10} more`);
      }
    }
    await interaction.reply(lines.join("\n"));
  },
};

// ─────────────────────────────────────────────
// volume.js
// ─────────────────────────────────────────────
const volume = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the playback volume (0–100)")
    .addIntegerOption((opt) =>
      opt
        .setName("level")
        .setDescription("Volume level between 0 and 100")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    ),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.playing)
      return interaction.reply("❌ Nothing is playing!");
    const level = interaction.options.getInteger("level");
    queue.setVolume(level);
    const emoji = level === 0 ? "🔇" : level < 50 ? "🔉" : "🔊";
    await interaction.reply(`${emoji} Volume set to **${level}%**`);
  },
};

// ─────────────────────────────────────────────
// nowplaying.js
// ─────────────────────────────────────────────
const nowplaying = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the currently playing song"),
  async execute(interaction, queues) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.current)
      return interaction.reply("❌ Nothing is playing!");
    const s = queue.current;
    await interaction.reply(
      `🎶 **Now Playing:** ${s.title} \`[${s.duration}]\`${s.requestedBy ? ` — requested by **${s.requestedBy}**` : ""}\n🔊 Volume: **${queue.volume}%**`
    );
  },
};

module.exports = { skip, stop, pause, resume, queueCmd, volume, nowplaying };
