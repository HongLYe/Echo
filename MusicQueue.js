const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} = require("@discordjs/voice");
const play = require("play-dl");

class MusicQueue {
  constructor() {
    this.songs = [];
    this.volume = 80;
    this.playing = false;
    this.player = createAudioPlayer();
    this.connection = null;
    this.current = null;
    this.textChannel = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.current = null;
      if (this.songs.length > 0) {
        this._playNext();
      } else {
        this.playing = false;
        if (this.textChannel) {
          this.textChannel.send("✅ Queue finished! Disconnecting...");
        }
        setTimeout(() => this._destroyConnection(), 5000);
      }
    });

    this.player.on("error", (error) => {
      console.error("AudioPlayer error:", error);
      this.current = null;
      if (this.songs.length > 0) this._playNext();
    });
  }

  async join(voiceChannel, textChannel) {
    this.textChannel = textChannel;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      this._destroyConnection();
      throw new Error("Could not connect to voice channel.");
    }

    this.connection.subscribe(this.player);
  }

  async addSong(query) {
    let songInfo;

    // Detect URL or search query
    if (
      query.startsWith("http://") ||
      query.startsWith("https://")
    ) {
      const info = await play.video_info(query);
      songInfo = {
        title: info.video_details.title,
        url: info.video_details.url,
        duration: info.video_details.durationRaw,
        thumbnail: info.video_details.thumbnails?.[0]?.url ?? null,
        requestedBy: null,
      };
    } else {
      const results = await play.search(query, { limit: 1 });
      if (!results || results.length === 0)
        throw new Error("No results found for: " + query);
      const video = results[0];
      songInfo = {
        title: video.title,
        url: video.url,
        duration: video.durationRaw,
        thumbnail: video.thumbnails?.[0]?.url ?? null,
        requestedBy: null,
      };
    }

    this.songs.push(songInfo);
    return songInfo;
  }

  async _playNext() {
    if (this.songs.length === 0) return;

    this.current = this.songs.shift();
    this.playing = true;

    try {
      const stream = await play.stream(this.current.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      resource.volume.setVolume(this.volume / 100);
      this._currentResource = resource;
      this.player.play(resource);

      if (this.textChannel) {
        this.textChannel.send(
          `🎵 Now playing: **${this.current.title}** \`[${this.current.duration}]\``
        );
      }
    } catch (err) {
      console.error("Stream error:", err);
      if (this.textChannel)
        this.textChannel.send(`❌ Error playing **${this.current?.title}**. Skipping...`);
      if (this.songs.length > 0) this._playNext();
    }
  }

  async start() {
    if (!this.playing && this.songs.length > 0) {
      await this._playNext();
    }
  }

  skip() {
    this.player.stop();
  }

  pause() {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  resume() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
    if (this._currentResource?.volume) {
      this._currentResource.volume.setVolume(this.volume / 100);
    }
  }

  stop() {
    this.songs = [];
    this.player.stop();
    this.playing = false;
    this._destroyConnection();
  }

  _destroyConnection() {
    if (
      this.connection &&
      this.connection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
      this.connection.destroy();
    }
    this.connection = null;
  }
}

module.exports = MusicQueue;
