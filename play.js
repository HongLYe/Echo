const { SlashCommandBuilder } = require("discord.js");
const MusicQueue = require("../MusicQueue");

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
    await interaction.deferReply();

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply("❌ You must be in a voice channel!");
    }

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
      console.error(err);
      await interaction.editReply(`❌ Error: ${err.message}`);
    }
  },
};
