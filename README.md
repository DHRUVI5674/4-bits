# 4-bits: AI-Powered Multiplayer Murder Mystery Game

A full-stack, real-time multiplayer murder mystery game combining **React (TanStack Start + Router)**, **Phaser.js** for gaming graphics/interaction, and an **Express/Node.js** server with **Socket.IO** and **Google Gemini API** for generative AI gameplay mechanics.

---

## 🚀 Features
- **Real-Time Multiplayer**: Built on Socket.IO for seamless room creation, lobby system, and instant action synchronization.
- **Interactive Phaser.js Game Client**: Visualizes game canvas elements, rooms, and investigations.
- **AI-Driven Game Master**: Leverages Google Gemini API to orchestrate investigation stages, generate crime dossiers, dynamically react to player clues, and judge accusations.
- **Seamless Deployment**: Production-ready configurations tailored for hosting platforms like Render.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) (React SSR & Router)
- **Game Engine**: [Phaser.js](https://phaser.io/)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Bundler Integration**: Nitro engine preset for server-side compilation

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB (Mongoose ORM)
- **Real-time Engine**: Socket.IO
- **AI Integration**: Google Generative AI (Gemini API)
- **Voice SDK**: LiveKit Server SDK

---

## ⚙️ Environment Configurations

### 1. Backend (`/backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
GEMINI_API_KEY=your_google_gemini_api_key_here
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
```

### 2. Frontend (`/frontend/.env`)
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000
```

---

## 📦 Installation & Local Development

Make sure you have Node.js (v18+) and npm installed.

### 1. Clone the repository
```bash
git clone https://github.com/DHRUVI5674/4-bits.git
cd 4-bits
```

### 2. Setup the Backend
```bash
cd backend
npm install
npm run dev
```
The backend server will run on `http://localhost:5000`.

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
The frontend dev server will start on `http://localhost:3000` (or the next available port).

---

## 🚀 Deployment Guide (Render)

This repository contains a unified `render.yaml` configuration in the root directory for deploying both the Frontend and Backend simultaneously.

### Option A: Deployment via Blueprints (Recommended)
1. Go to your **Render Dashboard** -> **+ New** -> **Blueprint**.
2. Select your `4-bits` GitHub repository.
3. Render will read the `render.yaml` file automatically.
4. Input the required environment variables:
   - For backend: `MONGODB_URI`, `GEMINI_API_KEY`, etc.
   - For frontend: `VITE_API_URL` (point to the backend service URL once generated).
5. Click **Apply**. Render will deploy both services.

### Option B: Manual Frontend Web Service Deployment
If deploying the frontend independently:
1. Create a **New Web Service** (not a Static Site, as the app uses TanStack Start SSR).
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `node .output/server/index.mjs`
3. Add the following **Environment Variables**:
   - `NITRO_PRESET`: `node-server`
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
   - `VITE_API_URL`: *[Your backend Render service URL]*
4. Deploy on the **Free** tier.

---

## 📄 License
This project is licensed under the MIT License.