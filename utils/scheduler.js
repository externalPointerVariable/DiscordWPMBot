import dotenv from 'dotenv';
dotenv.config();

console.log('🔑 Groq Key loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO - MISSING!');

// ─── Priority Queue System ────────────────────────────
class TaskQueue {
  constructor() {
    this.tasks = new Map();      // all tasks
    this.timeouts = new Map();   // setTimeout references
    this.running = new Set();    // currently running tasks
    this.maxConcurrent = 3;      // max tasks running at same time
  }

  // Add task to queue
  add(taskData) {
    const { taskId, scheduledTime } = taskData;
    this.tasks.set(taskId, {
      ...taskData,
      status: 'waiting',
      createdAt: new Date().toISOString()
    });

    // Sort queue by scheduled time
    this._sortQueue();

    console.log(`📋 Queue status: ${this.tasks.size} task(s) in queue`);
    this._printQueue();

    return taskId;
  }

  // Remove task from queue
  remove(taskId) {
    if (this.timeouts.has(taskId)) {
      clearTimeout(this.timeouts.get(taskId));
      this.timeouts.delete(taskId);
    }
    this.tasks.delete(taskId);
    this.running.delete(taskId);
    console.log(`🗑️ Task ${taskId} removed from queue`);
  }

  // Update task status
  updateStatus(taskId, status) {
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId);
      task.status = status;
      this.tasks.set(taskId, task);
      console.log(`📊 Task ${taskId} status: ${status}`);
    }
  }

  // Get tasks for a user
  getUserTasks(userId) {
    const userTasks = [];
    for (const [id, task] of this.tasks) {
      if (task.userId === userId) {
        userTasks.push(task);
      }
    }
    // Sort by scheduled time
    return userTasks.sort((a, b) =>
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
  }

  // Get all tasks sorted by time
  getAllSorted() {
    return Array.from(this.tasks.values()).sort((a, b) =>
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
  }

  // Check if task can run (concurrent limit)
  canRun() {
    return this.running.size < this.maxConcurrent;
  }

  // Mark task as running
  markRunning(taskId) {
    this.running.add(taskId);
    this.updateStatus(taskId, 'running');
  }

  // Mark task as done
  markDone(taskId) {
    this.running.delete(taskId);
    this.updateStatus(taskId, 'completed');
  }

  // Sort queue by scheduled time
  _sortQueue() {
    const sorted = Array.from(this.tasks.entries()).sort(([, a], [, b]) =>
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
    this.tasks.clear();
    for (const [id, task] of sorted) {
      this.tasks.set(id, task);
    }
  }

  // Print queue to console
  _printQueue() {
    const sorted = this.getAllSorted();
    if (sorted.length === 0) return;
    console.log('📋 Current Queue (sorted by time):');
    sorted.forEach((t, i) => {
      const time = new Date(t.scheduledTime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`   ${i + 1}. [${t.status.toUpperCase()}] ${t.taskType} — ${time} — ${t.username}`);
    });
  }
}

// Global queue instance
const queue = new TaskQueue();

// ─── Main function — schedule a task ─────────────────
export async function scheduleTask({ userId, channelId, username, task, taskType, scheduledTime }, discordClient) {

  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  const delay = scheduledDate.getTime() - now.getTime();

  if (delay <= 0) {
    console.log('⚠️ Scheduled time is in the past!');
    return { success: false, error: 'Scheduled time is in the past' };
  }

  // Generate task ID
  const taskId = `${userId}-${Date.now()}`;

  // Add to queue
  queue.add({
    taskId,
    userId,
    channelId,
    username,
    task,
    taskType,
    scheduledTime
  });

  console.log(`📅 Task scheduled for ${username} — runs in ${Math.round(delay / 1000 / 60)} minutes`);

  // Schedule with setTimeout
  const timeout = setTimeout(async () => {
    await executeTask(taskId, discordClient);
  }, delay);

  queue.timeouts.set(taskId, timeout);

  return { success: true, taskId };
}

// ─── Execute task when time comes ────────────────────
async function executeTask(taskId, discordClient) {
  const taskData = queue.tasks.get(taskId);
  if (!taskData) {
    console.log(`⚠️ Task ${taskId} not found in queue`);
    return;
  }

  const { userId, channelId, username, task, taskType } = taskData;

  // Check concurrent limit
  if (!queue.canRun()) {
    console.log(`⏳ Concurrent limit reached. Waiting 30 seconds...`);
    const timeout = setTimeout(() => executeTask(taskId, discordClient), 30000);
    queue.timeouts.set(taskId, timeout);
    return;
  }

  // Mark as running
  queue.markRunning(taskId);
  console.log(`🤖 Executing task for ${username}: ${task}`);

  try {
    const systemPrompt = getPrompt(taskType);
    const result = await callGroq(systemPrompt, task);

    if (!result) {
      queue.updateStatus(taskId, 'failed');
      await notifyError(discordClient, channelId, userId, username, taskType);
    } else {
      queue.markDone(taskId);
      await notifySuccess(discordClient, channelId, userId, username, task, taskType, result);
    }

  } catch (error) {
    console.error('❌ Task execution error:', error);
    queue.updateStatus(taskId, 'failed');
    await notifyError(discordClient, channelId, userId, username, taskType);
  } finally {
    // Remove from queue after completion
    setTimeout(() => queue.remove(taskId), 5000);
  }
}

// ─── Call Groq API with retry ─────────────────────────
async function callGroq(systemPrompt, task, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1} of ${retries}...`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: task }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (response.status === 429) {
        const waitTime = (i + 1) * 10000;
        console.log(`⏳ Rate limited. Waiting ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Groq error body:', errorBody);
        throw new Error(`Groq error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Groq response received!');
      return data.choices[0].message.content;

    } catch (error) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error('❌ All retries failed');
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return null;
}

// ─── Discord Notifications ────────────────────────────
async function notifySuccess(discordClient, channelId, userId, username, task, taskType, result) {
  try {
    const channel = await discordClient.channels.fetch(channelId);
    await channel.send({
      content: `<@${userId}> ✅ Your **${taskType}** task is complete!`,
      embeds: [{
        title: `📚 ${taskType.toUpperCase()} Result`,
        description: result.length > 4096 ? result.substring(0, 4093) + '...' : result,
        color: 0x5865F2,
        fields: [{ name: '📝 Task', value: task, inline: false }],
        footer: { text: `Requested by ${username} • StudyBot AI` },
        timestamp: new Date().toISOString()
      }]
    });

    try {
      const user = await discordClient.users.fetch(userId);
      await user.send({
        content: `Hey ${username}! Your **${taskType}** task is ready 🎉`,
        embeds: [{
          title: `📚 ${taskType.toUpperCase()} Result`,
          description: result.length > 4096 ? result.substring(0, 4093) + '...' : result,
          color: 0x5865F2,
          footer: { text: 'StudyBot AI' }
        }]
      });
    } catch (dmError) {
      console.log('⚠️ Could not send DM — user may have DMs disabled');
    }

    console.log(`✅ Result sent to Discord for ${username}`);

  } catch (error) {
    console.error('❌ Error sending to Discord:', error);
  }
}

async function notifyError(discordClient, channelId, userId, username, taskType) {
  try {
    const channel = await discordClient.channels.fetch(channelId);
    await channel.send({
      content: `<@${userId}>`,
      embeds: [{
        title: '❌ Task Failed',
        description: `Sorry ${username}, your **${taskType}** task failed. Please try again.`,
        color: 0xFF0000,
        footer: { text: 'StudyBot AI' }
      }]
    });
  } catch (error) {
    console.error('❌ Error sending error notification:', error);
  }
}

// ─── Prompts ──────────────────────────────────────────
function getPrompt(taskType) {
  const prompts = {
    quiz:       'Generate 10 MCQs with 4 options each and mark correct answer for this topic:',
    notes:      'Generate detailed well structured study notes with headings for this topic:',
    flashcards: 'Generate 15 flashcards in Q: A: format for this topic:',
    summary:    'Write a clear and concise summary for this topic:',
    plan:       'Create a detailed 7 day study plan with daily tasks for this topic:',
    math:       'Solve this problem step by step showing all working clearly:',
    code:       'Write clean well commented code with detailed explanation for this:',
    translate:  'Translate the following text to Hindi accurately:',
    letter:     'Write a professional formal letter for this request:',
    report:     'Write a detailed well structured report with sections for this topic:',
    mindmap:    'Create a detailed text based mind map with main topics and subtopics for:'
  };
  return prompts[taskType] || 'Answer this question in detail:';
}

// ─── Exports ──────────────────────────────────────────
export function getScheduledTasks(userId) {
  return queue.getUserTasks(userId);
}

export function cancelTask(taskId) {
  if (queue.tasks.has(taskId)) {
    queue.remove(taskId);
    return true;
  }
  return false;
}

export function getQueueStatus() {
  return {
    total: queue.tasks.size,
    running: queue.running.size,
    waiting: queue.tasks.size - queue.running.size,
    tasks: queue.getAllSorted()
  };
}