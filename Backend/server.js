import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
const app = express();
app.use(cors({ origin: '*', methods: ['POST','GET','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get('/health', (_req, res) => res.json({ status: 'online' }));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Urgency calculation done locally — no API call wasted ───────────────────
function calculateUrgencyLocally(tasks) {
  const now        = Date.now();
  const ONE_HOUR   = 60 * 60 * 1000;
  const SIX_HOURS  = 6  * ONE_HOUR;
  const TWELVE_HRS = 12 * ONE_HOUR;
  const ONE_DAY    = 24 * ONE_HOUR;
  const TWO_DAYS   = 48 * ONE_HOUR;

  let minGap        = Infinity;
  let hasOverdue    = false;
  let hasHighPrio   = false;

  for (const t of tasks) {
    const gap = new Date(t.deadline).getTime() - now;
    if (gap < minGap) minGap = gap;
    if (gap < 0)              hasOverdue  = true;
    if (t.importance === 'High') hasHighPrio = true;
  }

  // Sort tasks by urgency for the proactive action message
  const mostUrgent = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  let urgencyRating;
  let panicModeActivated;

  if (hasOverdue) {
    urgencyRating      = '🔴 OVERDUE';
    panicModeActivated = true;
  } else if (minGap < SIX_HOURS) {
    urgencyRating      = '🔴 CRITICAL';
    panicModeActivated = true;
  } else if (minGap < TWELVE_HRS) {
    urgencyRating      = '🟠 SEVERE';
    panicModeActivated = true;
  } else if (minGap < ONE_DAY) {
    urgencyRating      = '🟠 HIGH';
    panicModeActivated = true;
  } else if (minGap < TWO_DAYS && hasHighPrio) {
    urgencyRating      = '🟡 ELEVATED';
    panicModeActivated = false;
  } else if (minGap < TWO_DAYS) {
    urgencyRating      = '🟡 MODERATE';
    panicModeActivated = false;
  } else {
    urgencyRating      = '🟢 MANAGEABLE';
    panicModeActivated = false;
  }

  const hoursUntil = Math.max(0, Math.round(minGap / ONE_HOUR));
  const proactiveAction = hasOverdue
    ? `⚠️ "${mostUrgent.task}" is OVERDUE — stop everything and handle it immediately.`
    : minGap < ONE_DAY
    ? `🚨 "${mostUrgent.task}" is due in ${hoursUntil}h — start this RIGHT NOW, skip everything else.`
    : `▶️ Start with "${mostUrgent.task}" — it's your nearest deadline. Execute step 1 immediately.`;

  return { urgencyRating, panicModeActivated, proactiveAction };
}

// ─── Sort tasks by true urgency priority ─────────────────────────────────────
function sortByUrgency(tasks) {
  const IMPORTANCE_WEIGHT = { High: 3, Medium: 2, Low: 1 };
  const now = Date.now();

  return [...tasks].sort((a, b) => {
    const gapA = new Date(a.deadline).getTime() - now;
    const gapB = new Date(b.deadline).getTime() - now;

    // Overdue tasks always first
    const aOverdue = gapA < 0;
    const bOverdue = gapB < 0;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return  1;

    // Within 24h — sort purely by deadline time
    const aUrgent = gapA < 24 * 60 * 60 * 1000;
    const bUrgent = gapB < 24 * 60 * 60 * 1000;
    if (aUrgent || bUrgent) return gapA - gapB;

    // Beyond 24h — weight by importance first, then deadline
    const importanceDiff = IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance];
    return importanceDiff !== 0 ? importanceDiff : gapA - gapB;
  });
}

// ─── Generate exactly 3 micro-tasks for ONE task ─────────────────────────────
async function generateMicroTasksForOne(task, stepOffset) {
  const now       = Date.now();
  const gapMs     = new Date(task.deadline).getTime() - now;
  const hoursLeft = Math.max(0, Math.round(gapMs / (60 * 60 * 1000)));
  const minutesLeft = Math.max(0, Math.round(gapMs / 60000));
  const isOverdue = gapMs < 0;

  // ── Time-budget ceiling ──────────────────────────────────────────────────
  // Steps must never collectively exceed the time actually remaining, and in
  // practice should leave realistic headroom for sleep, meals, commute, other
  // obligations etc. We cap the *suggested* work budget well under 100% of
  // remaining time, scaling more conservatively the more time is available.
  let budgetFraction;
  if (isOverdue || hoursLeft < 3)       budgetFraction = 0.9;  // true emergency: almost all time is fair game
  else if (hoursLeft < 12)              budgetFraction = 0.6;  // still need sleep/breaks
  else if (hoursLeft < 24)              budgetFraction = 0.35; // a day has school/work/life in it
  else if (hoursLeft < 72)              budgetFraction = 0.20; // multi-day — work happens in short daily sessions
  else                                   budgetFraction = 0.10; // plenty of runway — don't front-load it

  const maxTotalMinutes = isOverdue
    ? 180 // overdue tasks get short, immediate-action steps, not hours of "planning"
    : Math.max(20, Math.round(minutesLeft * budgetFraction));

  const urgencyCtx = isOverdue
    ? 'THIS TASK IS OVERDUE. Steps must be immediate and recovery-focused — minutes, not hours, per step.'
    : hoursLeft < 6
    ? `CRITICAL: only ${hoursLeft} hours left. Steps must be ultra-focused and fast.`
    : hoursLeft < 24
    ? `URGENT: ${hoursLeft} hours remaining. Steps must be efficient and realistic — the person still needs to sleep, eat, and handle other obligations, so do not allocate anywhere close to the full ${hoursLeft}h to these 3 steps.`
    : `${hoursLeft} hours (~${Math.round(hoursLeft/24)} days) remaining. Steps should be short, realistic work sessions — think 30-120 minutes each, NOT multi-hour blocks. The person has other commitments; these are just the next concrete actions, not the entire remaining timeline.`;

  const prompt = `You are Shadow AI's scheduling engine.

Task: "${task.task.trim()}"
Deadline: ${task.deadline}
Priority: ${task.importance}
Time context: ${urgencyCtx}
${task.description ? `Context: ${task.description.trim()}` : ''}

Generate EXACTLY 3 sequential micro-tasks for this specific task.
- stepNumbers: ${stepOffset + 1}, ${stepOffset + 2}, ${stepOffset + 3}
- parentTaskName: must be exactly "${task.task.trim()}"
- taskName: concrete action phrase, under 5 words
- focusTip: specific tactical tip for THIS task, 15-25 words
- durationMinutes: realistic time estimate for a focused work session on just that step

HARD CONSTRAINT: the sum of all 3 durationMinutes values MUST NOT exceed ${maxTotalMinutes} minutes total. These are short, focused sessions, not the person's entire remaining schedule — they still need time to sleep, eat, and live their life around this deadline. Individual steps should typically be 15-120 minutes; do not invent multi-hour steps to fill time.

Return only valid JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      responseSchema: {
        type: 'OBJECT',
        properties: {
          microTasks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                stepNumber:      { type: 'NUMBER' },
                taskName:        { type: 'STRING' },
                parentTaskName:  { type: 'STRING' },
                durationMinutes: { type: 'NUMBER' },
                focusTip:        { type: 'STRING' },
              },
              required: ['stepNumber','taskName','parentTaskName','durationMinutes','focusTip'],
            },
          },
        },
        required: ['microTasks'],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  let microTasks = (parsed.microTasks ?? []).slice(0, 3).map((t, i) => ({
    ...t,
    stepNumber:     stepOffset + i + 1,
    parentTaskName: task.task.trim(), // Always override — never trust model's string
    durationMinutes: Math.max(5, Math.round(Number(t.durationMinutes) || 30)), // sanitize
  }));

  // ── Server-side safety net ──────────────────────────────────────────────
  // The model can still ignore the prompt constraint, so clamp the total here
  // too. If steps blow the budget, scale every step down proportionally
  // (preserving relative weighting between steps) rather than discarding data.
  const total = microTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  if (total > maxTotalMinutes && total > 0) {
    const scale = maxTotalMinutes / total;
    microTasks = microTasks.map(t => ({
      ...t,
      durationMinutes: Math.max(5, Math.round(t.durationMinutes * scale)),
    }));
  }

  return microTasks;
}

// ─── Main route ───────────────────────────────────────────────────────────────
app.post('/api/rescue', async (req, res) => {
  console.log('📥 Request received.');
  const { currentFocusTask, allDeadlines } = req.body;

  if (!currentFocusTask?.task) {
    return res.status(400).json({ error: 'Missing task.' });
  }

  const allDeadlinesArr = Array.isArray(allDeadlines) ? allDeadlines : [];
  const allTasks        = [currentFocusTask, ...allDeadlinesArr];

  // Re-sort ALL tasks by true urgency on the backend — don't trust frontend sort
  const sortedTasks = sortByUrgency(allTasks);

  console.log(`🔢 ${sortedTasks.length} tasks → ${sortedTasks.length * 3} micro-tasks`);
  console.log('📋 Sorted order:', sortedTasks.map(t => {
    const gap = new Date(t.deadline).getTime() - Date.now();
    const h   = Math.round(gap / 3600000);
    return `"${t.task}" (${gap < 0 ? 'OVERDUE' : h + 'h'})`; 
  }));

  // Calculate urgency locally — saves one API call
  const { urgencyRating, panicModeActivated, proactiveAction } = calculateUrgencyLocally(sortedTasks);
  console.log(`🚨 Urgency: ${urgencyRating} | Panic: ${panicModeActivated}`);

  try {
    const allMicroTasks = [];

    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      console.log(`⚙️  [${i+1}/${sortedTasks.length}] Generating for: "${task.task}"`);

      const microTasks = await generateMicroTasksForOne(task, i * 3);
      const stepTotal = microTasks.reduce((s, t) => s + t.durationMinutes, 0);
      console.log(`  ✅ ${microTasks.length} steps generated (${stepTotal}m total)`);
      allMicroTasks.push(...microTasks);

      if (i < sortedTasks.length - 1) await sleep(500);
    }

    console.log(`📤 Done — ${allMicroTasks.length} total micro-tasks dispatched.`);
    res.json({ urgencyRating, panicModeActivated, proactiveAction, suggestedMicroTasks: allMicroTasks });

  } catch (err) {
    console.error('❌', err?.message ?? err);
    if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      const seconds = (err.message.match(/retry in (\d+)/i) ?? [])[1] ?? '60';
      return res.status(429).json({ error: `Rate limit hit. Wait ${seconds}s and try again.` });
    }
    res.status(500).json({ error: err.message || 'Failed to generate timeline.' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Shadow AI Engine online at http://localhost:${PORT}`));