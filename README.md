# 🌑 Shadow AI - Deadline Crisis Management Agent

> *Your AI sidekick that turns deadline panic into an actionable rescue plan - in seconds.*

![Shadow AI](https://img.shields.io/badge/Built%20with-Gemini%20API-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Hackathon](https://img.shields.io/badge/Vibe2Ship-Hackathon%202026-FF4B4B?style=for-the-badge)

---

## 🚨 Problem Statement

When a deadline is hours away, people don't need a to-do list - they need a **rescue plan**.

Traditional task managers are built for calm planning. They fail in the chaos of a real deadline crisis: they can't prioritize under pressure, they can't calculate what's actually achievable, and they can't adapt when time collapses.

**Shadow AI** solves exactly this.

---

## 💡 Solution Overview

Shadow AI is an **agentic deadline crisis manager**. You tell it your task and deadline - it acts like a real AI sidekick that:

1. **Calculates urgency & panic levels** based on time remaining vs. task complexity
2. **Autonomously breaks down your work** into timed, prioritized execution blocks
3. **Sorts and ranks tasks** by urgency score so you always know what to do next
4. **Lets you extend deadlines** with one click and recalculates everything in real time
5. **Provides an inline editing UI** so you can adapt your plan as the situation changes

The AI doesn't just chat - it **acts**: planning, calculating, and structuring your remaining time into a step-by-step survival timeline.

---

## ✨ Key Features

| Feature | Description |
|--------|-------------|
| ⚡ **Instant Rescue Plan** | Input a task + deadline → get a full execution breakdown in seconds |
| 🔥 **Urgency & Panic Scoring** | Threshold-based scoring engine calculates how critical each task is |
| 📋 **Agentic Task Breakdown** | AI autonomously generates subtasks with time estimates |
| 🔢 **Priority Sorting** | Backend sorts all tasks by urgency score automatically |
| ✏️ **Inline Deadline Editing** | Edit deadlines directly in the UI with quick +1hr, +1day shortcuts |
| 🌑 **Dark Productivity UI** | Clean, focused dark interface built for high-stress work sessions |

---

## 🛠️ Technologies Used

### Frontend
- **React** + **Vite** - fast, modern UI framework
- **CSS** - custom dark productivity theme

### Backend
- **Node.js** + **Express.js** - REST API server
- **Google Gemini API** - core AI model for agentic task planning and breakdown
- Threshold-based **urgency/panic calculation engine** (server-side)
- **CORS** configured for secure cross-origin requests

---

## 🟦 Google Technologies Utilized

| Technology | How It's Used |
|-----------|---------------|
| **Gemini API (gemini-1.5-flash)** | Powers the AI agent that generates rescue plans and breaks down tasks |
| **Google AI Studio** | Used for prototyping prompts and testing the agentic pipeline |
| **Google Cloud Run** | Deployed the backend as a containerized service via Cloud Run |

---

## 🏗️ Architecture

```
User
 │
 ▼
React + Vite Frontend
 │  (Task input, deadline, urgency display)
 │
 ▼
Express.js Backend (Node.js)
 │  ├── Urgency & Panic Score Calculator
 │  ├── Task Sorter (by urgency)
 │  └── Gemini API Integration
        │
        ▼
   Gemini 1.5 Flash
   (Agentic task planning & breakdown)
```

---

## 🚀 Getting Started

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
PORT=3000
```

Start the backend:
```bash
node index.js
```

### Set up the Frontend
```bash
cd ../Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
Shadow_AI/
├── Backend/
│   ├── index.js          # Express server + Gemini API integration
│   ├── package.json
│   └── .env              # (not committed — add your own)
├── Frontend/
│   ├── src/
│   │   ├── App.jsx       # Main app component
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 👤 Author

**Sanchita** - [@Sanchita-InLoop](https://github.com/Sanchita-InLoop)

Built for **Vibe2Ship Hackathon 2026** 🚀

---

## 📄 License

MIT License - feel free to build on this.
