require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
    discordToken: process.env.DISCORD_BOT_TOKEN || "",
    port: process.env.PORT || 4000
};
