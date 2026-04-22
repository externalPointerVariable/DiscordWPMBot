// 🟡 Fix 5 — Correct IST time display
export async function sendScheduleConfirmation(channel, userId, task, taskType, scheduledTime) {

  // Properly format IST time
  const time = new Date(scheduledTime).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: 'short'
  });

  await channel.send({
    embeds: [{
      title: '✅ Task Scheduled!',
      description: `Your task has been scheduled successfully.`,
      color: 0x5865F2,
      fields: [
        { name: '📝 Task', value: task, inline: false },
        { name: '🏷️ Type', value: taskType.toUpperCase(), inline: true },
        { name: '⏰ Scheduled At', value: `${time} IST`, inline: true },
      ],
      footer: { text: `StudyBot AI • You will be notified when done` },
      timestamp: new Date().toISOString()
    }]
  });
}

export async function sendErrorMessage(channel, userId, errorMsg) {
  await channel.send({
    content: `<@${userId}>`,
    embeds: [{
      title: '❌ Error',
      description: errorMsg,
      color: 0xFF0000,
      footer: { text: 'StudyBot AI' }
    }]
  });
}

export async function sendHelpMessage(channel) {
  await channel.send({
    embeds: [{
      title: '🤖 StudyBot AI — Help',
      description: 'Schedule AI-powered study tasks to run at a specific time!',
      color: 0x5865F2,
      fields: [
        {
          name: '📌 Command Format',
          value: '`!task <your task> at <time>`',
          inline: false
        },
        {
          name: '📚 Examples',
          value: [
            '`!task create a quiz on Photosynthesis at 10:30 PM`',
            '`!task make study notes on World War 2 at 9:00 PM`',
            '`!task solve this integral at 8:00 AM`',
            '`!task create flashcards on Python at 11:00 PM`'
          ].join('\n'),
          inline: false
        },
        {
          name: '🏷️ Supported Task Types',
          value: [
            '`quiz` `notes` `flashcards` `summary`',
            '`plan` `math` `code` `translate`',
            '`letter` `report` `mindmap`'
          ].join('\n'),
          inline: false
        }
      ],
      footer: { text: 'StudyBot AI • Powered by OpenRouter AI' }
    }]
  });
}