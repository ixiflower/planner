# Project Index Guide for AI Agents

## Quick Start

Read these files first to understand the project:
1. `AGENT.TXT` - Project operations policy and change log
2. `frontend/src/App.tsx` - Main app routing and auth guards
3. `frontend/src/contexts/AuthContext.tsx` - Authentication system

## Project Overview

**Planner** is a collaborative productivity application with:
- **Backend**: Django REST API (`backend/`)
- **Frontend**: React + Vite + TypeScript (`frontend/`)

## Key Directories

### Backend (`backend/`)
| Path | Purpose |
|------|---------|
| `ixiflowerv2ray/` | Django settings, URLs, WSGI/ASGI |
| `authentication/` | Custom User model, auth endpoints |
| `tickets/` | Tasks, submissions, team features, Telegram bot |
| `structure/` | Structure Board API (boards, nodes, edges) |
| `sim/` | Simulation module |

### Frontend (`frontend/`)
| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main app, routing, auth guards |
| `src/pages/` | Page components (calendar, structure, team, etc.) |
| `src/pages/structure.tsx` | Structure Board (custom Canvas engine) |
| `src/components/ui/` | Shadcn UI primitives |
| `src/components/planner/` | Planner-specific components |
| `src/contexts/AuthContext.tsx` | Auth state management |
| `src/config/backend.ts` | API base URL configuration |

## Key Features

### Structure Board (`frontend/src/pages/structure.tsx`)
- Custom Canvas-based board (migrated from React Flow)
- Nodes with position, size, data (label, color, paths)
- Edges connecting nodes
- Modes: Mouse (select/drag), Pen (draw inside nodes), Text
- Group nodes that contain other nodes
- Pan/zoom, marquee selection, keyboard shortcuts

### Authentication
- Token-based auth stored in cookies + localStorage
- Roles: Leader, Mod, Member
- Route guards: `RequireValidated`, `RequireRole`, `RequireMember`

### Calendar/Planner (`frontend/src/pages/calendar.tsx`)
- Event management, tasks, goals
- Sidebar components for checklists, notes, music

## Data Models

### Structure Board
```
Board: id (UUID), name, owner, members[]
Node: id, type, position {x,y}, width, height, data, style
Edge: id, source, target, animated, style
```

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/auth/me/` | Get current user |
| `/api/structure/boards/` | List/create boards |
| `/api/structure/boards/{id}/` | CRUD board with nodes/edges |

## Important Conventions

1. **AGENT.TXT is the source of truth** - Always append changes there
2. **TypeScript strict mode** - Use proper types
3. **Shadcn UI** - Use existing UI components from `components/ui/`
4. **Backend API stability** - Avoid breaking changes; enrich payloads instead
5. **Canvas engine** - All structure board logic is in `structure.tsx` BoardCanvas component

## Common Tasks

### Adding a new page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add nav link in `src/components/navbar.tsx`

### Adding a new API endpoint
1. Create view in appropriate backend app
2. Add URL pattern
3. Add serializer if needed

### Modifying Structure Board
- All canvas rendering logic is in `BoardCanvas` component
- Node types: Block, Group
- Check AGENT.TXT for current Phase status
