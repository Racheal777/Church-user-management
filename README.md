# Church Youth Management System

Progressive Web App for YPG with member management, attendance, dues tracking, and audit logging.

## Workspace

- `frontend/`: React + Vite + TypeScript PWA
- `backend/`: Express + TypeScript + Prisma API

## Quick Start

1. Install dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Run `npm run prisma:generate --workspace backend`.
4. Run `npm run prisma:migrate --workspace backend`.
5. Run `npm run prisma:seed --workspace backend`.
6. Run `npm run dev --workspace backend` and `npm run dev --workspace frontend`.
