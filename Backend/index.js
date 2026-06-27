import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/rescue', async (req, res) => {
  console.log("📥 Received optimization request for:", req.body.currentFocusTask?.task);
  const { currentFocusTask, allDeadlines } = req.body;

  if (!currentFocusTask) {
    return res.status(400).json({ error: 'Missing current focus task.' });
  }

  // UPDATED: Instructing the AI to expand tips to 30-40 words for better execution depth
  const systemInstruction = `
    You are the core intelligence of Shadow AI, a high-velocity proactive productivity agent.
    The user is in a massive rush. Provide a clear emergency execution roadmap. 
    Keep task names under 5 words.
    CRITICAL: The 'focusTip' MUST be a highly descriptive, comprehensive, and tactical execution tip containing roughly 30 to 40 words.
    For every micro-task, include the 'parentTaskName' which must verbatim match the current primary task name being optimized.
    Carefully analyze the user's progress context description if provided, and tailor the micro-tasks to resolve exactly what is left or what they are struggling with.
  `;

  const taskContext = currentFocusTask.description 
    ? `User's current progress/blocker context: "${currentFocusTask.description}"`
    : `No extra context provided. Plan the entire task from scratch.`;

  const prompt = `
    Current Emergency Task: "${currentFocusTask.task}" due by ${currentFocusTask.deadline}. Importance: ${currentFocusTask.importance}.
    ${taskContext}
    
    Other Upcoming Deadlines to balance: ${JSON.stringify(allDeadlines)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            urgencyRating: { type: 'STRING' },
            panicModeActivated: { type: 'BOOLEAN' },
            proactiveAction: { type: 'STRING' },
            suggestedMicroTasks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  stepNumber: { type: 'NUMBER' },
                  taskName: { type: 'STRING' },
                  parentTaskName: { type: 'STRING' }, // NEW FIELD
                  durationMinutes: { type: 'NUMBER' },
                  focusTip: { type: 'STRING' }
                },
                required: ['stepNumber', 'taskName', 'parentTaskName', 'durationMinutes', 'focusTip']
              }
            }
          },
          required: ['urgencyRating', 'panicModeActivated', 'proactiveAction', 'suggestedMicroTasks']
        }
      }
    });

    console.log("📤 AI successfully generated structured response with descriptive tips.");
    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error('Runtime AI Error:', error);
    res.status(500).json({ error: 'Failed to process workspace timeline.' });
  }
});

const PORT = 5050;
app.listen(PORT, () => {
  console.log(`🚀 Sidekick AI backend running and listening on port ${PORT}`);
});