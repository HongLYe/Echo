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
    this._idleTimeout = null;

    // Bind event handlers to prevent memory leaks on re-creation
    this._onIdle = this._onIdle.bind(this);
    this._onError = this._onError.bind(this);

    this.player.on(AudioPlayerStatus.Idle, this._onIdle);
    this.player.on("error", this._onError);
  }

  _onIdle() {
    this.current = null;
    if (this.songs.length > 0) {
      this._playNext();
    } else {
      this.playing = false;
      if (this.textChannel) {
        this.textChannel.send("✅ Queue finished! Disconnecting...").catch((err) => {
          console.error("Failed to send queue finished message:", err);
        });
      }
      // Clear any existing timeout before setting a new one
      if (this._idleTimeout) clearTimeout(this._idleTimeout);
      this._idleTimeout = setTimeout(() => this._destroyConnection(), 5000);
    }
  }

  _onError(error) {
    console.error("AudioPlayer error:", error);
    this.current = null;
    
    // Notify users about the error
    if (this.textChannel) {
      this.textChannel.send(`❌ Error playing audio: ${error.message || "Unknown error"}`).catch((err) => {
        console.error("Failed to send error message:", err);
      });
    }
    
    if (this.songs.length > 0) this._playNext();
  }

  async join(voiceChannel, textChannel) {
    // Check bot permissions before joining
    const permissions = voiceChannel.permissionsFor(voiceChannel.guild.members.me);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      throw new Error("❌ I don't have permission to connect or speak in that voice channel!");
    }

    this.textChannel = textChannel;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
    } catch (err) {
      console.error("Failed to establish voice connection:", err);
      this._destroyConnection();
      throw new Error("Could not connect to voice channel. Please check my permissions and try again.");
    }

    this.connection.subscribe(this.player);
  }

  async addSong(query) {
    let songInfo;

    // Validate query is not empty
    if (!query || typeof query !== "string" || query.trim() === "") {
      throw new Error("Please provide a valid song name or YouTube URL.");
    }

    // Detect URL or search query using better regex
    const urlRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i;
    
    if (urlRegex.test(query)) {
      try {
        const info = await play.video_info(query);
        songInfo = {
          title: info.video_details.title,
          url: info.video_details.url,
          duration: info.video_details.durationRaw,
          thumbnail: info.video_details.thumbnails?.[0]?.url ?? null,
          requestedBy: null,
        };
      } catch (err) {
        if (err.message?.includes("expired") || err.message?.includes("unavailable")) {
          throw new Error("This video URL has expired or is unavailable. Please search for the song instead.");
        }
        throw new Error(`Failed to fetch video info: ${err.message}`);
      }
    } else {
      try {
        const results = await play.search(query, { limit: 1 });
        if (!results || results.length === 0) {
          throw new Error(`No results found for: "${query}"`);
        }
        const video = results[0];
        songInfo = {
          title: video.title,
          url: video.url,
          duration: video.durationRaw,
          thumbnail: video.thumbnails?.[0]?.url ?? null,
          requestedBy: null,
        };
      } catch (err) {
        if (err.message?.includes("rate limit") || err.message?.includes("too many requests")) {
          throw new Error("Rate limit reached. Please wait a moment and try again.");
        }
        throw new Error(`Search failed: ${err.message}`);
      }
    }

    this.songs.push(songInfo);
    return songInfo;
  }

  async _playNext() {
    if (this.songs.length === 0) return;

    this.current = this.songs.shift();
    this.playing = true;

    try {
      // Validate stream before creating resource
      const stream = await play.stream(this.current.url);
      
      if (!stream || !stream.stream) {
        throw new Error("Failed to create audio stream");
      }
      
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
        ).catch((err) => {
          console.error("Failed to send now playing message:", err);
        });
      }
    } catch (err) {
      console.error("Stream error:", err);
      if (this.textChannel) {
        let errorMsg = `❌ Error playing **${this.current?.title}**. Skipping...`;
        
        // Provide more helpful error messages
        if (err.message?.includes("expired")) {
          errorMsg = `❌ The URL for **${this.current?.title}** has expired. Please re-add the song.`;
        } else if (err.message?.includes("unavailable")) {
          errorMsg = `❌ **${this.current?.title}** is no longer available.`;
        }
        
        this.textChannel.send(errorMsg).catch((sendErr) => {
          console.error("Failed to send error message:", sendErr);
        });
      }
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
    // Clear idle timeout if exists
    if (this._idleTimeout) clearTimeout(this._idleTimeout);
    this._destroyConnection();
  }

  _destroyConnection() {
    // Remove event listeners to prevent memory leaks
    this.player.off(AudioPlayerStatus.Idle, this._onIdle);
    this.player.off("error", this._onError);
    
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
