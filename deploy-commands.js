require("dotenv").config();
const { REST, Routes } = require("discord.js");
const playCmd = require("./src/commands/play");
const { skip, stop, pause, resume, queueCmd, volume, nowplaying } =
  require("./src/commands/other");

const allCommands = [playCmd, skip, stop, pause, resume, queueCmd, volume, nowplaying];
const commandData = allCommands.map((c) => c.data.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commandData,
    });
    console.log("✅ Slash commands registered successfully!");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();
