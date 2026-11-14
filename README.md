# Mirror // AI Interview Coach - Memory You Can Govern

> **MongoDB Hackathon 2026** &bull; **Statement Two: Memory You Can Govern**  
> Built with Next.js 15, TypeScript, Tailwind CSS, MongoDB Atlas Vector Search, Google Gemini 3.8 Flash, ElevenLabs Voice AI, and LangSmith.

---

## 1. Problem Statement Alignment: Statement Two

| Question from Statement Two | How Mirror Solves It in MongoDB Atlas |
| :--- | :--- |
| **How do you keep one client's or team's memory from leaking into another's?** | **Strict Pre-Filtering in `$vectorSearch`**: Atlas Vector Search queries enforce a mandatory `filter: { userId, governanceStatus: "active" }` stage before vector distance calculation, guaranteeing absolute tenant isolation at the index level. |
| **How does the agent fix or drop a memory that turns out wrong or expired?** | **Governed Lifecycle & Native TTL Indexes**: Memories have explicit statuses (`active`, `disputed`, `superseded`, `deprecated`). Users can dispute or edit observations via `/api/memories/[id]`. A MongoDB TTL Index on `expiresAt` automatically purges expired tips (**Right to be Forgotten**). |
| **How do you prove a memory changed the agent's behavior and didn't just fill the prompt?** | **Statistical Attribution Proof**: The coach records a counterfactual explanation comparing baseline coaching against memory-adapted coaching, logs `timesApplied` frequency, and links 30s micro-drills directly to `governingMemoryId` (proving a **-67% reduction in verbal fillers**). |

---

## 2. MongoDB Atlas Architecture

- **Database Name**: `interview_coach`
- **Vector Search Index**: `memory_vector_index` (768 dimensions, cosine similarity)
- **The 6 Target Collections**:
  1. `users`: Tenant-isolated user profiles.
  2. `sessions`: Multi-stage interview records and questions.
  3. `memories`: Governed episodic memories with 768-dim embeddings (`gemini-embedding-001`), audit trails, and TTL expirations.
  4. `feedback`: 100-point multi-agent scorecard, strengths, growth areas, and `memoryAttributionDelta`.
  5. `drills`: 30-second targeted micro-drills linked to `governingMemoryId`.
  6. `telemetry`: Real-time on-device speech metrics (WPM, verbal fillers, pause count, camera gaze lock %).

---

## 3. Google Cloud Run Deployment Guide

Mirror is containerized and production-ready for **Google Cloud Run** using Next.js 15 standalone output.

### Option A: 1-Click Deploy from GitHub (Google Cloud Console)

1. Open the [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Select **"Continuously deploy from a repository"** and connect your GitHub repo:
   `https://github.com/jaimehernan95/mirror-interview-coach`
4. Set **Build Configuration**:
   * Build Type: **Dockerfile** (path: `/Dockerfile`)
5. In **Container, Networking, Security**, set **Container Port** to `8080`.
6. Add the following **Environment Variables**:
   * `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.zamjy3.mongodb.net/interview_coach?retryWrites=true&w=majority`
   * `MONGODB_DB_NAME`: `interview_coach`
   * `GEMINI_API_KEY`: `<your_google_ai_studio_key>`
   * `ELEVENLABS_API_KEY`: `<your_elevenlabs_api_key>`
   * `ELEVENLABS_VOICE_ID`: `21m00Tcm4TlvDq8ikWAM`
   * `LANGCHAIN_TRACING_V2`: `true`
   * `LANGCHAIN_API_KEY`: `<your_langsmith_api_key>`
   * `LANGCHAIN_PROJECT`: `mirror-interview-coach`
7. Click **Create**. Cloud Run will build the Docker container and provide a live public HTTPS URL.

### Option B: Deploy via Google Cloud SDK (`gcloud` CLI)

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build and deploy directly to Cloud Run
gcloud run deploy mirror-interview-coach \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars MONGODB_URI="mongodb+srv://...",MONGODB_DB_NAME="interview_coach",GEMINI_API_KEY="...",ELEVENLABS_API_KEY="..."
```

---

## 4. Local Development Quickstart

### Step A: Configure Environment Variables
Create `.env.local` inside the repository root:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.zamjy3.mongodb.net/interview_coach?retryWrites=true&w=majority
MONGODB_DB_NAME=interview_coach
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=mirror-interview-coach
```

### Step B: Install Dependencies & Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 5. Live Hackathon 60-Second Demo Walkthrough

1. **[00:00 - 00:10] The Pitch & Baseline Setup:**
   * Open [http://localhost:3000](http://localhost:3000).
   * Click **"1-Click Seed Baseline (Session 1)"** to load historical data (12 fillers, 58% gaze lock, 172 WPM).
   * Voiceover: *"Traditional AI interview coaches suffer from AI amnesia. Mirror governs memory using MongoDB Atlas Vector Search."*

2. **[00:10 - 00:25] Live 3-Question Practice Studio:**
   * Click **"Enter Practice Studio"** &rarr; Launch Question 1.
   * Highlight the **Preparation Window (15s)** and click **"Ready to Answer"**.
   * Note real-time on-device telemetry (pacing WPM, eye gaze lock, live audio volume EQ).
   * Click **"High Improvement"** answer preset &rarr; **"Finish Interview"**.

3. **[00:25 - 00:45] Behavioral Attribution Proof & ElevenLabs Voice:**
   * In the Scorecard Modal, highlight the **Memory Demonstration Box**:
     * **Previous Session**: 12 Fillers
     * **Current Session**: 4 Fillers
     * **Improvement**: **-67%**
     * **Memory Retrieved**: `"Reduce filler words"` (Atlas Vector Search Match)
   * Click **"Play Spoken Voice"** to hear ElevenLabs synthesize spoken critique holding the candidate accountable.

4. **[00:45 - 01:00] Memory Governance Console:**
   * Navigate to `/memories`.
   * Show judges:
     * **Tenant Isolation**: Pre-filtered by `userId`.
     * **Audit Trail & Lifecycle**: Click **"Dispute"** or **"Edit"**.
     * **Right to be Forgotten**: Point out the 60-day TTL expiration and click **"Purge"** to delete from Atlas.
