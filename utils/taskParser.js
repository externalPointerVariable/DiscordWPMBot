export function parseTask(message) {
  const timeRegex = /at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;
  const timeMatch = message.match(timeRegex);

  if (!timeMatch) {
    return { success: false, error: 'No time found. Use format: !task <your task> at <time>' };
  }

  const timeString = timeMatch[1].trim();
  const task = message.replace(timeRegex, '').replace(/!task/i, '').trim();
  const scheduledTime = convertToIST(timeString);

  if (!scheduledTime) {
    return { success: false, error: 'Invalid time format. Use HH:MM AM/PM or HH:MM' };
  }

  const taskType = detectTaskType(task);

  return { success: true, task, taskType, scheduledTime };
}

function detectTaskType(task) {
  const lower = task.toLowerCase();

  if (lower.includes('quiz') || lower.includes('mcq') || lower.includes('questions')) return 'quiz';
  if (lower.includes('notes') || lower.includes('note')) return 'notes';
  if (lower.includes('flashcard') || lower.includes('flash card')) return 'flashcards';
  if (lower.includes('summary') || lower.includes('summarize') || lower.includes('summarise')) return 'summary';
  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('timetable')) return 'plan';
  if (lower.includes('math') || lower.includes('solve') || lower.includes('calculate') || lower.includes('equation')) return 'math';
  if (lower.includes('code') || lower.includes('program') || lower.includes('function') || lower.includes('script')) return 'code';
  if (lower.includes('translate') || lower.includes('translation') || lower.includes('hindi')) return 'translate';
  if (lower.includes('letter') || lower.includes('email') || lower.includes('write to')) return 'letter';
  if (lower.includes('report') || lower.includes('essay') || lower.includes('assignment')) return 'report';
  if (lower.includes('mindmap') || lower.includes('mind map') || lower.includes('diagram')) return 'mindmap';

  return 'notes';
}

function convertToIST(timeString) {
  try {
    const [time, modifier] = timeString.split(/\s+/);
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier) {
      if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    // Get today's date in IST
    const now = new Date();
    const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Build ISO string with IST offset +05:30
    const pad = (n) => String(n).padStart(2, '0');
    const isoString = `${istDateStr}T${pad(hours)}:${pad(minutes)}:00+05:30`;
    const scheduled = new Date(isoString);

    // If time already passed today schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.toISOString();

  } catch (error) {
    return null;
  }
}