const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const MusicQueue = require("./MusicQueue");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube (URL or search query)")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("YouTube URL or song name to search")
        .setRequired(true)
    ),

  async execute(interaction, queues) {
    // Check voice channel permissions before deferring
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ 
        content: "❌ You must be in a voice channel!", 
        ephemeral: true 
      });
    }

    // Check bot permissions
    const botPermissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has(PermissionFlagsBits.Connect) || !botPermissions.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ 
        content: "❌ I don't have permission to connect or speak in that voice channel!", 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: false });

    const query = interaction.options.getString("query");
    const guildId = interaction.guildId;

    if (!queues.has(guildId)) {
      queues.set(guildId, new MusicQueue());
    }

    const queue = queues.get(guildId);

    try {
      // Join voice if not already connected
      if (!queue.connection) {
        await queue.join(voiceChannel, interaction.channel);
      }

      const song = await queue.addSong(query);
      song.requestedBy = interaction.user.username;

      const wasPlaying = queue.playing;
      await queue.start();

      if (wasPlaying) {
        await interaction.editReply(
          `✅ Added to queue: **${song.title}** \`[${song.duration}]\` — requested by **${song.requestedBy}**`
        );
      } else {
        await interaction.editReply(
          `▶️ Starting: **${song.title}** \`[${song.duration}]\``
        );
      }
    } catch (err) {
      console.error("Play command error:", err);
      
      // Sanitize error message for users
      let userFriendlyError = "An unexpected error occurred. Please try again.";
      
      if (err.message) {
        // Don't expose internal errors to users
        if (err.message.includes("No results")) {
          userFriendlyError = err.message;
        } else if (err.message.includes("expired") || err.message.includes("unavailable")) {
          userFriendlyError = err.message;
        } else if (err.message.includes("Rate limit")) {
          userFriendlyError = err.message;
        } else if (err.message.includes("permission")) {
          userFriendlyError = err.message;
        }
      }
      
      await interaction.editReply(`❌ Error: ${userFriendlyError}`);
    }
  },
};
