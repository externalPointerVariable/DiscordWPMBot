const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("../config/config.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
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

  if (!message.mentions.has(client.user)) return;

  const { author, content } = message;
  const startTime = typingData.get(author.id);

  if (!startTime) return;

  const endTime = Date.now();
  const timeTaken = (endTime - startTime) / 1000; 

  const words = content.trim().split(/\s+/).length; 
  if (words < 3) return; 

  const wpm = Math.round((words * 60) / timeTaken); 
  typingData.delete(author.id);

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("Typing Speed: ")
    .setDescription(
      `You typed **${words} words** in **${timeTaken.toFixed(
        2
      )} seconds**\n**WPM:** ${wpm}`
    );

  message.reply({ embeds: [embed] });
});

client.login(config.discordToken);
