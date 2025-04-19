ChatApp: Real‑Time WebSocket Chat with Node.js & MongoDB

A simple, full‑stack chat application built with Node.js, Express, and WebSocket, styled with Tailwind CSS and EJS templates, backed by MongoDB for persistence. Deployed via Docker Compose on a Proxmox VM and exposed securely using a Cloudflare Tunnel.

🚀 Features

Real‑time messaging via WebSocket

Typing indicators and read receipts

Online user list with dynamic counts

Avatar integration using DiceBear API

Session‑based authentication (Express sessions + Mongo store)

Admin dashboard for user role management

Persistent chat history (since user login) in MongoDB

🏗️ Tech Stack

Layer

Technology

Runtime & Server

Node.js (18.x LTS), Express.js

Real‑time         

WebSocket (express‑ws)

Database

MongoDB, Mongoose

Templating & UI

EJS, Tailwind CSS

Session Store

connect-mongo

Deployment

Docker, Docker Compose, Portainer

Host

Proxmox VM (Ubuntu/Debian guest)

Tunnel & DNS

Cloudflare Tunnel (token method)

Version Control

Git, GitHub

📦 Repository Structure

├── Dockerfile              # Node.js application image build
├── docker-compose.yml      # App + MongoDB + Cloudflare Tunnel stack
├── .env.example            # Environment variable template
├── index.js                # Main Express/WebSocket server
├── models/                 # Mongoose schemas (User, Message)
├── public/                 # Static assets & frontend.js
├── utils/chatUtils.js      # WebSocket handlers & history filtering
├── views/                  # EJS templates (authenticated, login, etc.)
├── package.json            # npm dependencies & scripts
└── README.md               # (You are here)

⚙️ Prerequisites

Docker & Docker Compose installed on host

Portainer CE (optional, for GUI container management)

A Proxmox VM running a Linux distro (Ubuntu 22.04 / Debian)

A Cloudflare account and a Tunnel token (see below)

📝 Environment Variables

Create a .env file in the repo root (this file should be in your .gitignore):

MONGODB_URI=mongodb://mongo:27017/yourdbname
SESSION_SECRET=yourSuperSecret
PORT=3000
TUNNEL_TOKEN=<YOUR_CLOUDFLARE_TUNNEL_TOKEN>

MONGODB_URI: Connection string for the MongoDB service

SESSION_SECRET: Secret for Express session encryption

PORT: Port on which the Node.js app listens (default 3000)

TUNNEL_TOKEN: JWT‑style token from Cloudflare for the Tunnel

🐳 Docker & Docker Compose

Build and run all services:

docker-compose up -d --build

Services:

mongo: MongoDB database (persistent volume mongo-data)

chat-app: Your Node.js chat server, auto‑restarts on failure

cloudflared: Cloudflare Tunnel daemon, exposes chat-app securely

Logs & Management:

docker-compose logs -f chat-app

Use Portainer to view logs, exec into containers, and restart if needed

⚓ Deploy via Portainer

Install Portainer (if not already):

docker volume create portainer_data
docker run -d -p 8000:8000 -p 9000:9000 \
  --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce

Create a new Stack in Portainer:

Repository: https://github.com/<your-org>/<your-repo>.git

Branch: refs/heads/main

Compose Path: docker-compose.yml

Define Environment Variables in the Stack UI:

MONGODB_URI, SESSION_SECRET, PORT, TUNNEL_TOKEN (populate with your real values)

Click Deploy. Portainer will build and start all three containers.

🔒 Cloudflare Tunnel (Token Method)

In Cloudflare Zero Trust → Access → Tunnels → Tokens → create a new token with Tunnel:Run scope.

Copy the TUNNEL_TOKEN into your .env.

cloudflared container in your stack uses:

command: tunnel --no-autoupdate --url http://chat-app:3000 run --token $TUNNEL_TOKEN

Optionally set a CNAME in Cloudflare DNS to point chat.yourdomain.com to the tunnel.

🎯 Usage

Navigate to https://chat.yourdomain.com once DNS/Cloudflare Tunnel is configured

Sign up or log in to start chatting in real time

Admins can visit /admin for user management

📄 License

This project is open‑source under the MIT License. Feel free to fork and adapt!

