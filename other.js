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
    
    // Check if queue exists AND has active connection
    if (!queue || !queue.playing || !queue.connection) {
      return interaction.reply({ 
        content: "❌ Nothing is playing!", 
        ephemeral: true 
      });
    }
    
    try {
      queue.skip();
      await interaction.reply({ 
        content: "⏭️ Skipped!", 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Skip error:", err);
      await interaction.reply({ 
        content: "❌ Failed to skip. Try again.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue || !queue.playing) {
      return interaction.reply({ 
        content: "❌ Nothing is playing!", 
        ephemeral: true 
      });
    }
    
    try {
      queue.stop();
      queues.delete(interaction.guildId);
      await interaction.reply({ 
        content: "⏹️ Stopped and cleared the queue.", 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Stop error:", err);
      await interaction.reply({ 
        content: "❌ Failed to stop. Try again.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue || !queue.playing) {
      return interaction.reply({ 
        content: "❌ Nothing is playing!", 
        ephemeral: true 
      });
    }
    
    try {
      const paused = queue.pause();
      await interaction.reply({ 
        content: paused ? "⏸️ Paused." : "❌ Already paused.", 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Pause error:", err);
      await interaction.reply({ 
        content: "❌ Failed to pause. Try again.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue) {
      return interaction.reply({ 
        content: "❌ Nothing is paused!", 
        ephemeral: true 
      });
    }
    
    try {
      const resumed = queue.resume();
      await interaction.reply({ 
        content: resumed ? "▶️ Resumed!" : "❌ Not paused.", 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Resume error:", err);
      await interaction.reply({ 
        content: "❌ Failed to resume. Try again.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue || (!queue.current && queue.songs.length === 0)) {
      return interaction.reply({ 
        content: "📭 The queue is empty.", 
        ephemeral: true 
      });
    }

    try {
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
      await interaction.reply({ 
        content: lines.join("\n"), 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Queue display error:", err);
      await interaction.reply({ 
        content: "❌ Failed to display queue.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue || !queue.playing) {
      return interaction.reply({ 
        content: "❌ Nothing is playing!", 
        ephemeral: true 
      });
    }
    
    try {
      const level = interaction.options.getInteger("level");
      queue.setVolume(level);
      const emoji = level === 0 ? "🔇" : level < 50 ? "🔉" : "🔊";
      await interaction.reply({ 
        content: `${emoji} Volume set to **${level}%**`, 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Volume error:", err);
      await interaction.reply({ 
        content: "❌ Failed to set volume. Try again.", 
        ephemeral: true 
      });
    }
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
    
    if (!queue || !queue.current) {
      return interaction.reply({ 
        content: "❌ Nothing is playing!", 
        ephemeral: true 
      });
    }
    
    try {
      const s = queue.current;
      await interaction.reply({ 
        content: `🎶 **Now Playing:** ${s.title} \`[${s.duration}]\`${s.requestedBy ? ` — requested by **${s.requestedBy}**` : ""}\n🔊 Volume: **${queue.volume}%**`, 
        ephemeral: true 
      });
    } catch (err) {
      console.error("NowPlaying error:", err);
      await interaction.reply({ 
        content: "❌ Failed to get current song.", 
        ephemeral: true 
      });
    }
  },
};

module.exports = { skip, stop, pause, resume, queueCmd, volume, nowplaying };
