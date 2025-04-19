# ChatApp: Real-Time WebSocket Chat with Node.js & MongoDB

A simple, full-stack chat application built with Node.js, Express, and WebSocket, styled with Tailwind CSS and EJS templates, and backed by MongoDB for persistence. Deployed via Docker Compose on a Proxmox VM and secured using a Cloudflare Tunnel.

---

## 🚀 Features

- Real‑time messaging via WebSocket  
- Typing indicators and read receipts  
- Online user list with dynamic counts  
- Avatar integration using the DiceBear API  
- Session‑based authentication (Express sessions + Mongo store)  
- Admin dashboard for user and role management  
- Persistent chat history (since user login) in MongoDB  

---

## 🏗️ Tech Stack

- **Node.js & Express.js** (Runtime & Server)  
- **express-ws** (WebSocket)  
- **MongoDB & Mongoose** (Database)  
- **EJS & Tailwind CSS** (Templating & UI)  
- **connect-mongo** (Session Store)  
- **Docker & Docker Compose** (Deployment)  
- **Portainer** (Container Management)  
- **Proxmox VM** (Host)  
- **Cloudflare Tunnel** (Secure Exposure)  
- **Git & GitHub** (Version Control)  

---

## 📁 Repository Structure

    ├── Dockerfile              # Build Node.js app image  
    ├── docker-compose.yml      # Define services: app, Mongo, tunnel  
    ├── .env.example            # Template for environment variables  
    ├── index.js                # Main Express/WebSocket server  
    ├── models/                 # Mongoose schemas (message.js, user.js)  
    ├── public/                 # Static assets & frontend.js  
    ├── utils/                  # chatUtils.js for WS handling  
    ├── views/                  # EJS templates  
    │   ├── index/  
    │   │   ├── authenticated.ejs  
    │   │   └── unauthenticated.ejs  
    │   ├── login.ejs  
    │   ├── profile.ejs  
    │   └── signup.ejs  
    ├── package.json            # npm dependencies & scripts  
    └── README.md               # Project documentation  

---

## ⚙️ Prerequisites

- Docker & Docker Compose installed on your host  
- Portainer CE (optional, for GUI-based container management)  
- A Proxmox VM running a Linux distro (Ubuntu 22.04 / Debian)  
- A Cloudflare account and a Tunnel token  

---

## 📝 Environment Variables

Create a `.env` file at the project root (this file should be in your `.gitignore`):

    MONGODB_URI=mongodb://mongo:27017/yourdbname  
    SESSION_SECRET=yourSuperSecret  
    PORT=3000  
    TUNNEL_TOKEN=your-cloudflare-tunnel-token  

- **MONGODB_URI**: Connection string to MongoDB  
- **SESSION_SECRET**: Secret key for Express session  
- **PORT**: Port the Node.js app listens on (default 3000)  
- **TUNNEL_TOKEN**: Cloudflare Tunnel run token  

---

## 🐳 Docker & Docker Compose

1. **Build and start** all services in detached mode:  
       docker-compose up -d --build  
2. **Services**:  
   - `mongo` — MongoDB database (persistent volume `mongo-data`)  
   - `chat-app` — Node.js chat server  
   - `cloudflared` — Cloudflare Tunnel daemon  
3. **Logs & Management**:  
   - View logs: `docker-compose logs -f chat-app`  
   - Manage via Portainer UI (logs, console, restarts)  

---

## ⚓ Deploy via Portainer

1. **Open Portainer** at `http://<VM_IP>:9000` and log in.  
2. Navigate to **Stacks → Add stack**.  
3. Configure **Git repository**:  
   - Repository: `https://github.com/<your-org>/<your-repo>.git`  
   - Reference: `refs/heads/main`  
   - Compose path: `docker-compose.yml`  
4. Scroll to **Environment variables** and add:  
       MONGODB_URI    = mongodb://mongo:27017/yourdbname  
       SESSION_SECRET = yourSuperSecret  
       PORT           = 3000  
       TUNNEL_TOKEN   = <your-cloudflare-token>  
5. Click **Deploy**.

---

## 🔒 Cloudflare Tunnel (Token Method)

- The `cloudflared` service uses:  
       command: tunnel --no-autoupdate --url http://chat-app:3000 run --token $TUNNEL_TOKEN  
- Generate a token in **Cloudflare Zero Trust → Access → Tunnels → Tokens** with **Tunnel:Run** permission.  
- Add that token to your `.env` or Portainer stack variables.  

---

## 🎯 Usage

- Visit `https://chat.yourdomain.com` once DNS is set up in Cloudflare.  
- Sign up or log in to start chatting in real time.  
- Admins can access `/admin` for user management.  

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to fork and adapt!
