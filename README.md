<div align="center">
  <h1 style="color: #d3869b; font-family: monospace; font-size: 2.5em; margin: 0; font-weight: bold;">Planner</h1>
  <p style="font-size: 1.1em; color: #83a598; margin-top: 5px;">
    <strong>A full-featured team management and personal productivity platform</strong>
  </p>
  <br>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django" alt="Django">
    <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind">
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker" alt="Docker">
  </p>
</div>

---

## ✨ Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 📋 **Task Management** | Create, organize, and track tasks with colors, priorities, and deadlines |
| 🎯 **Daily Goals** | Set daily goals with priority levels and target times |
| 📅 **Calendar** | Plan events with color coding, templates, and exercise tracking |
| 👥 **Team Management** | Role-based access control (Leader, Mod, Member, Developer) |
| ⏰ **Work Hours** | Check-in/check-out system with hour tracking and charts |
| 📝 **Submissions & Reports** | Submit daily reports with admin approval workflow |
| 💬 **Chat System** | Real-time direct messaging between team members |
| 🔔 **Notifications** | In-app notification system with read/unread tracking |
| 📁 **File Management** | Upload/download files with role-based targeting |
| 🤖 **Telegram Bot** | Bot integration for reports, tasks, team info, and prices |
| 📊 **Google Sheets** | Auto-sync data to Google Sheets |
| 🔐 **V2Ray Configs** | Admin-managed VPN configuration sharing |
| 🗒️ **Notepad** | Persistent personal notes for users |

</div>

---

## 🚀 Installation

### Prerequisites

- **Python 3.8+** with pip
- **Node.js v18+** with npm
- **Docker** (optional, for production)

### Quick Start

```bash
git clone https://github.com/AmirabbasRouintan/planner.git
cd planner
chmod +x start.sh
./start.sh
```

The script sets up a Python venv, installs backend dependencies, starts Django on port 8001, installs frontend dependencies, and starts Vite on port 80.

### Manual Setup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 80
```

### Docker (Production)

```bash
cd backend
docker-compose up -d
```

Starts Django backend, Telegram bot, PostgreSQL, Redis, and Nginx.

---

## 🧠 Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion, Lucide Icons |
| **Backend** | Django 5.2, Django REST Framework 3.16 |
| **Database** | SQLite (dev), PostgreSQL (production) |
| **Charts** | Recharts |
| **3D Graphics** | React Three Fiber, Three.js |
| **Drag & Drop** | Atlassian Pragmatic Drag and Drop |
| **Flow Diagrams** | xyflow/react |
| **Chat** | Stream Chat API + custom REST |
| **Calendar** | react-day-picker, date-fns |

</div>

---

## 📁 Project Structure

```
planner/
├── frontend/              # React + Vite frontend
│   └── src/
│       ├── pages/         # App pages and routes
│       ├── components/    # UI components (shadcn/ui + custom)
│       ├── contexts/      # Auth context
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities and services
│       └── config/        # Backend URL config
├── backend/               # Django backend
│   ├── authentication/    # Auth app (User model, login, register)
│   ├── tickets/           # Main app (all core features)
│   ├── sim/               # Google Sheets + API docs
│   └── ixiflowerv2ray/    # Django project settings
├── start.sh               # Quick start script
└── .env                   # Environment variables
```

---

## 🔌 API Overview

The backend exposes **70+ API endpoints** under:
- `/api/` — Authentication, user management, working hours, Telegram, database
- `/tickets/api/` — Tasks, goals, submissions, reports, chat, notifications, files, configs, Google Sheets
- `/admin/` — Django admin panel

---

## 🤖 Telegram Bot

A full-featured Telegram bot (`backend/planner-bot.py`) with commands:
- `/reports` — View daily reports
- `/tasks` — View assigned tasks
- `/team` — View team members
- `/dollar` — Current dollar price
- `/gold` — Current gold price
- `/start` — Welcome message
- `/help` — Command list

---

## 📄 License

This project is [MIT](LICENSE) licensed.

---

<div align="center">
  <br>
  <p style="font-size: 1.3em; color: #d3869b;">
    ⭐ If you found this project useful, please give it a star!
  </p>
  <p style="color: #83a598;">
    It took a lot of time and effort to build this project — your support means a lot ❤️
  </p>
  <br>
  <p>
    <a href="https://github.com/AmirabbasRouintan/planner">
      <img src="https://img.shields.io/github/stars/AmirabbasRouintan/planner?style=for-the-badge&logo=github&color=yellow" alt="Stars">
    </a>
    <a href="https://github.com/AmirabbasRouintan/planner/issues">
      <img src="https://img.shields.io/github/issues/AmirabbasRouintan/planner?style=for-the-badge&logo=github" alt="Issues">
    </a>
  </p>
  <br>
</div>
