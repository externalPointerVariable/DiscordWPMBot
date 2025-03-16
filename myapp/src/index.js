const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("../config/config.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping
    ]
});

const typingData = new Map();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("typingStart", (typing) => {
    typingData.set(typing.user.id, Date.now());
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return; 

    const { author, content } = message;
    const startTime = typingData.get(author.id);

    if (!startTime) return;

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    const words = content.trim().split(/\s+/).length;
    if (words < 3) return;

    const wpm = Math.round((words * 60) / timeTaken);
    typingData.delete(author.id);

    try {
        await message.delete();

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle("Typing Speed Results")
            .setDescription(`**Original Message:**\n> ${content}\n\nYou typed **${words} words** in **${timeTaken.toFixed(2)} seconds**\n**WPM:** ${wpm}`)
            .setFooter({ text: "Keep typing fast! ⌨️" });

        message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error("Error deleting message:", error);
    }
});

client.login(config.discordToken);
