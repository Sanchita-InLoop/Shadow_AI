# 🌑 Shadow AI — The Last-Minute Life Saver

> *Your AI sidekick that turns deadline panic into an actionable rescue plan — in seconds.*

![Shadow AI](https://img.shields.io/badge/Built%20with-Gemini%20API-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Hackathon](https://img.shields.io/badge/Vibe2Ship-Hackathon%202026-FF4B4B?style=for-the-badge)

---

## 🚨 Problem Statement

**Official challenge:** *The Last-Minute Life Saver* — students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, and important commitments. Existing productivity tools rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks. The challenge: build an AI-powered productivity companion that proactively assists users in planning, prioritizing, and completing tasks — moving beyond reminders to help users take meaningful action.

A calendar notification doesn't tell you what to physically do in the next 20 minutes when three deadlines are colliding. **Shadow AI does.**

---

## 💡 Solution Overview

Shadow AI is an **agentic deadline-rescue companion**, not a to-do list with notifications bolted on. You feed it your active deadlines — it acts like a sidekick that:

1. **Re-evaluates true urgency server-side** for every tracked task — never trusting client-side sort order, and always checking for overdue items first
2. **Calculates a live urgency rating and Panic Mode trigger** based on time-remaining thresholds and stated priority
3. **Autonomously plans a time-budgeted execution sequence** — the backend computes how much work time is actually realistic given what's left (a task due in 3 days doesn't get allocated 70% of those 3 days) *before* ever asking the AI to generate steps
4. **Calls the Gemini API** to generate exactly 3 concrete, sequenced micro-tasks per deadline, with a tactical tip and a duration for each
5. **Clamps the AI's output server-side** as a safety net — if the model ignores the time budget, durations are proportionally rescaled rather than trusted blindly

This directly answers the "move beyond passive reminders" brief: the agent doesn't remind you a deadline exists, it decides what action to take right now and how long that action should realistically take.

---

## ✨ Key Features

| Feature | Description |
|--------|-------------|
| ⚡ **Instant Rescue Plan** | Track a deadline → run optimization → get a concrete, time-boxed action plan in seconds |
| 🔥 **Urgency & Panic Scoring** | Threshold-based engine classifies every situation from 🟢 Manageable to 🔴 Overdue, and flips on Panic Mode automatically |
| 🤖 **Agentic, Time-Budgeted Task Breakdown** | The AI doesn't just list subtasks — it works within a server-calculated realistic time ceiling, so plans don't pretend a person has more free time than they do |
| 🔢 **Cross-Task Priority Sorting** | All tracked deadlines are re-sorted by true urgency server-side, every single run |
| ✏️ **Inline Deadline Editing** | Edit task name, deadline, priority, or context notes directly in the UI; any stale AI plan is automatically cleared so it can't go out of sync |
| 📱 **Responsive Dark UI** | Built for high-stress work sessions, usable on both desktop and mobile |
| 🛡️ **Graceful Failure Handling** | Rate-limit detection with parsed wait times, and clear error messaging if the backend is unreachable |

---

## 🛠️ Technologies Used

### Frontend
- **React** + **Vite** — fast, modern UI framework
- **CSS-in-JS** with responsive media queries — custom dark productivity theme

### Backend
- **Node.js** + **Express 5** — REST API server
- **Google Gemini API** (`gemini-2.5-flash`) — core AI model for agentic task planning, using structured JSON schema output for reliable parsing
- Threshold-based **urgency/panic calculation engine** (server-side, runs before any AI call to save quota)
- **CORS** configured for secure cross-origin requests

---

## 🟦 Google Technologies Utilized

| Technology | How It's Used |
|-----------|---------------|
| **Gemini API (`gemini-2.5-flash`)** | Powers the agent that generates time-budgeted rescue plans via the official `@google/genai` SDK, with `responseSchema`-constrained structured output |
| **Google AI Studio** | Used to generate and manage the Gemini API key |
| **Google Cloud Run** | Backend deployed as a containerized service ([live URL](#) — *add once deployed*) |

---

## 🏗️ Architecture

```
User
 │
 ▼
React + Vite Frontend
 │  (Track deadlines, view live countdowns, trigger optimization)
 │
 ▼
Express Backend (Node.js)
 │  ├── Urgency & Panic Score Calculator (local, no API call)
 │  ├── Cross-Task Urgency Sorter
 │  ├── Time-Budget Calculator (per task, before AI call)
 │  ├── Gemini API Integration (structured output)
 │  └── Server-Side Duration Safety Net (clamps AI output to budget)
        │
        ▼
   Gemini 2.5 Flash
   (Generates 3 sequenced micro-tasks per deadline)
```

---

## 🚀 Live Links

- **Frontend (Vercel):** https://shadow-ai-eight.vercel.app
- **Backend (Google Cloud Run):** *[add link here]*

---

## 📦 Getting Started

### Prerequisites
- Node.js v18+
- A Gemini API key ([get one free at Google AI Studio](https://aistudio.google.com))

### Clone the repo
```bash
git clone https://github.com/Sanchita-InLoop/Shadow_AI.git
cd Shadow_AI
```

### Set up the Backend
```bash
cd Backend
npm install
```

Create a `.env` file inside `/Backend`:
```
GEMINI_API_KEY=your_api_key_here
PORT=5050
```

Start the backend:
```bash
npm start
# or for auto-restart on file changes:
npm run dev
```

### Set up the Frontend
```bash
cd ../Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser. In local development, API calls are proxied to the backend via `vite.config.js`; in production, the frontend reads the backend URL from the `VITE_API_URL` environment variable.

---

## 📁 Project Structure

```
Shadow_AI/
├── Backend/
│   ├── server.js          # Express server + urgency engine + Gemini API integration
│   ├── Dockerfile         # Cloud Run container build
│   ├── package.json
│   └── .env               # (not committed — add your own)
├── Frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🧠 How the Agent Decides What's Urgent

Urgency isn't just "closest deadline wins." The engine weighs:
- Whether any task is already **overdue** (always takes absolute priority)
- **Hours remaining** until the nearest deadline, against fixed thresholds (6h / 12h / 24h / 48h)
- **Stated priority** (High / Medium / Low) for tasks more than 24 hours out

That urgency rating then shapes the time budget given to the AI for generating each task's steps — so a 3-day-out task gets short, sustainable work sessions, not a plan that assumes someone has nothing else to do with their next 72 hours.

---

## 👤 Author

**Sanchita** — [@Sanchita-InLoop](https://github.com/Sanchita-InLoop)

Built for **Vibe2Ship Hackathon 2026** 🚀

---

## 📄 License

MIT License — feel free to build on this.