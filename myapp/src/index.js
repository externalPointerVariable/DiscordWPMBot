const { Client, GatewayIntentBits } = require("discord.js");
const config = require("../config/config.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
    if (message.content === "Ping") {
        message.reply("Pong");
    }
});

client.login(config.discordToken);
