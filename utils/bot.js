import discord from 'discord.js';
const { Client, GatewayIntentBits } = discord;

import dotenv from 'dotenv';
import fetch from 'node-fetch';

import { parseTask } from './taskParser.js';
import {
  sendScheduleConfirmation,
  sendErrorMessage,
  sendHelpMessage
} from './discordNotify.js';

import {
  getScheduledTasks,
  cancelTask,
  getQueueStatus   // ✅ added
} from './scheduler.js';

dotenv.config();

// Validate Discord token
if (!process.env.DISCORD_TOKEN) {
  throw new Error('❌ DISCORD_TOKEN is missing in .env file!');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ]
});

client.once('ready', () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();

  // ─── !help ───────────────────────────────────────
  if (content === '!help') {
    await sendHelpMessage(message.channel);
    return;
  }

  // ─── !queue (GLOBAL QUEUE VIEW) ──────────────────
  if (content === '!queue') {
    const { total, running, waiting, tasks } = getQueueStatus();

    if (total === 0) {
      await message.channel.send({
        embeds: [{
          title: '📋 Queue Empty',
          description: 'No tasks in queue right now.',
          color: 0x5865F2,
          footer: { text: 'StudyBot AI' }
        }]
      });
      return;
    }

    const taskList = tasks
      .slice(0, 10) // ⚠️ prevent overflow
      .map((t, i) => {
        const time = new Date(t.scheduledTime).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const emoji =
          t.status === 'running' ? '🔄' :
          t.status === 'completed' ? '✅' : '⏳';

        const shortTask =
          t.task.length > 50 ? t.task.substring(0, 50) + '...' : t.task;

        return `${emoji} **${i + 1}.** ${t.taskType.toUpperCase()} — ${time}\n👤 ${t.username} — ${shortTask}`;
      })
      .join('\n\n');

    await message.channel.send({
      embeds: [{
        title: '📋 Task Queue',
        description: taskList,
        color: 0x5865F2,
        fields: [
          { name: '📊 Total', value: `${total}`, inline: true },
          { name: '🔄 Running', value: `${running}`, inline: true },
          { name: '⏳ Waiting', value: `${waiting}`, inline: true },
        ],
        footer: { text: 'StudyBot AI • Tasks sorted by scheduled time' }
      }]
    });

    return;
  }

  // ─── !list ───────────────────────────────────────
  if (content === '!list') {
    const tasks = getScheduledTasks(message.author.id);

    if (tasks.length === 0) {
      await message.channel.send({
        embeds: [{
          title: '📋 No Scheduled Tasks',
          description: 'You have no tasks scheduled right now.',
          color: 0x5865F2,
          footer: { text: 'StudyBot AI' }
        }]
      });
    } else {
      const taskList = tasks.map((t, i) =>
        `**${i + 1}.** ${t.taskType.toUpperCase()} — ${t.task}\n⏰ ${new Date(t.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n🆔 ID: \`${t.taskId}\``
      ).join('\n\n');

      await message.channel.send({
        embeds: [{
          title: '📋 Your Scheduled Tasks',
          description: taskList,
          color: 0x5865F2,
          footer: { text: 'StudyBot AI' }
        }]
      });
    }
    return;
  }

  // ─── !cancel ─────────────────────────────────────
  if (content.startsWith('!cancel')) {
    const taskId = content.split(' ')[1];

    if (!taskId) {
      await sendErrorMessage(
        message.channel,
        message.author.id,
        'Please provide a task ID.\nUsage: `!cancel <taskId>`'
      );
      return;
    }

    const cancelled = cancelTask(taskId);

    if (cancelled) {
      await message.channel.send({
        embeds: [{
          title: '✅ Task Cancelled',
          description: `Task \`${taskId}\` has been cancelled successfully.`,
          color: 0x57F287,
          footer: { text: 'StudyBot AI' }
        }]
      });
    } else {
      await sendErrorMessage(
        message.channel,
        message.author.id,
        `Task \`${taskId}\` not found. Use \`!list\` to see your tasks.`
      );
    }
    return;
  }

  // ─── !task ───────────────────────────────────────
  if (content.startsWith('!task')) {
    const parsed = parseTask(message.content); // ⚠️ original content, not lowercase

    if (!parsed.success) {
      await sendErrorMessage(message.channel, message.author.id, parsed.error);
      return;
    }

    try {
      const SERVER_URL =
        process.env.SERVER_URL ||
        `http://localhost:${process.env.PORT || 3000}`;

      const response = await fetch(`${SERVER_URL}/schedule-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: message.author.id,
          channelId: message.channel.id,
          username: message.author.username,
          task: parsed.task,
          taskType: parsed.taskType,
          scheduledTime: parsed.scheduledTime
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        await sendScheduleConfirmation(
          message.channel,
          message.author.id,
          parsed.task,
          parsed.taskType,
          parsed.scheduledTime
        );
      } else {
        await sendErrorMessage(
          message.channel,
          message.author.id,
          'Failed to schedule task. Try again.'
        );
      }

    } catch (error) {
      console.error('❌ Error:', error);
      await sendErrorMessage(
        message.channel,
        message.author.id,
        'Server error. Make sure the bot is running.'
      );
    }

    return;
  }
});

client.login(process.env.DISCORD_TOKEN);

export default client;
export { client as discordClient };