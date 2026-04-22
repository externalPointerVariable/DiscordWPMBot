import express from 'express';
import dotenv from 'dotenv';
import client from './utils/bot.js';
import { scheduleTask } from './utils/scheduler.js';

dotenv.config();

const server = express();
const port = process.env.PORT || 3000;
server.use(express.json());

// ─── ONLY ENDPOINT: Schedule task ────────────────────
server.post('/schedule-task', async (req, res) => {
  const { userId, channelId, username, task, taskType, scheduledTime } = req.body;

  // Validate required fields
  if (!userId || !channelId || !username || !task || !taskType || !scheduledTime) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const result = await scheduleTask(
      { userId, channelId, username, task, taskType, scheduledTime },
      client
    );

    if (result.success) {
      console.log(`📅 Task scheduled for ${username}: ${task}`);
      res.json({ success: true, message: 'Task scheduled successfully' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }

  } catch (error) {
    console.error('❌ Error scheduling task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});