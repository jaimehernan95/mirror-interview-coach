# Mirror // AI Interview Coach - Memory You Can Govern

> **MongoDB Hackathon 2026** &bull; **Statement Two: Memory You Can Govern**  
> Built with Next.js 15, TypeScript, Tailwind CSS, MongoDB Atlas Vector Search, Google Gemini SDK, ElevenLabs Voice AI, and LangSmith.

---

## 1. Problem Statement Alignment: Statement Two

| Question from Statement Two | How Mirror Solves It in MongoDB Atlas |
| :--- | :--- |
| **How do you keep one client's or team's memory from leaking into another's?** | **Strict Pre-Filtering**: Atlas Vector Search queries (`$vectorSearch`) enforce a mandatory `filter: { userId, governanceStatus: "active" }` stage before vector distance ranking, guaranteeing absolute tenant isolation. |
| **How does the agent fix or drop a memory that turns out wrong or expired?** | **Governed Lifecycle & TTL**: Memories have explicit statuses (`active`, `disputed`, `superseded`, `deprecated`). Users can dispute or edit observations via `/api/memories/[id]`. A MongoDB TTL Index on `expiresAt` automatically purges expired tips (**Right to be Forgotten**). |
| **How do you prove a memory changed the agent's behavior and didn't just fill the prompt?** | **Attribution Proof Delta**: The multi-agent coach records a counterfactual explanation comparing baseline coaching against memory-adapted coaching, logs `timesApplied` frequency, and links micro-drills directly to `governingMemoryId`. |

---

## 2. MongoDB Atlas Architecture

- **Database Name**: `interview_coach`
- **The 6 Target Collections**:
  1. `users`: Tenant-isolated user profiles.
  2. `sessions`: Multi-stage interview records and questions.
  3. `memories`: Governed episodic memories with 768-dim embeddings (`text-embedding-004`), audit trails, and TTL expirations.
  4. `feedback`: 100-point multi-agent scorecard, strengths, growth areas, and `memoryAttributionDelta`.
  5. `drills`: 30-second targeted micro-drills linked to `governingMemoryId`.
  6. `telemetry`: Real-time on-device speech metrics (WPM, filler word breakdown, pause count, gaze % on camera).

---

## 3. Quickstart & Local Setup

### Step A: Configure Environment Variables
Create `.env.local` inside `C:\Dev\mirror-interview-coach`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DB_NAME=interview_coach
GEMINI_API_KEY=your_gemini_api_key_here
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=mirror-interview-coach
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### Step B: Install Dependencies & Run Development Server
```bash
cd C:\Dev\mirror-interview-coach
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 4. Live Hackathon 60-Second Demo Script

1. **[00:00 - 00:15] The Pitch & Baseline Setup:**
   - Open [http://localhost:3000](http://localhost:3000).
   - Click **"1-Click Seed Baseline (Session 1)"** to load historical data (12 fillers, 58% gaze lock, 172 WPM).
   - State: *"Traditional AI interview coaches have memory amnesia—treating each session in isolation. Mirror remembers and governs memory using MongoDB Atlas."*

2. **[00:15 - 00:35] Live Practice & On-Device Telemetry:**
   - Click **"Enter Practice Studio"** &rarr; Launch Question 1.
   - Click **"Start 60s Answer"** and speak or select the **"Session 2 (High Improvement)"** answer preset.
   - Point to the live reticle (*"Gaze Locked on Camera"*, WPM cadence, and filler detector).
   - Click **"Finish & Evaluate"**.

3. **[00:35 - 00:50] The Breakthrough: Measurable Improvement & Memory Attribution:**
   - On the Scorecard Modal, highlight:
     - **Measurable Longitudinal Improvement**: *"Fillers dropped by 75% (12 &rarr; 1-2); Gaze lock improved by +27%"*.
     - **Behavioral Attribution**: Show the box proving the coach changed its recommendations because of Memory `#mem_seed_gaze_01`.

4. **[00:50 - 01:00] Memory Governance Console:**
   - Navigate to [http://localhost:3000/memories](http://localhost:3000/memories).
   - Show the judges:
     - **Anti-Leakage**: Scoped strictly to `demo_speaker_1`.
     - **Lifecycle**: Click **"Dispute"** or **"Edit"** to show real-time audit logging.
     - **TTL**: Point out the expiration dates and the **"Purge"** button for GDPR Right to be Forgotten.
