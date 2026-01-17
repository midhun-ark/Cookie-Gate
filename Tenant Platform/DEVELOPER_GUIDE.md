# ComplyArk Tenant Platform - Developer Guide

This document provides a comprehensive guide to running, testing, and understanding the ComplyArk Tenant Platform.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (via Docker)

### 1. Start the Database
The Tenant Platform shares the database with the Admin Portal.
```bash
cd "Admin Portal"
docker-compose up -d
```

### 2. Start the Backend Server
```bash
cd "Tenant Platform/apps/server"
npm install
npm run migrate:up
npm run dev
```
- Server runs on: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- API Prefix: `/tenant` (e.g., `/tenant/auth/login`)

### 3. Start the Frontend Application
```bash
cd "Tenant Platform/apps/tenant-ui"
npm install
npm run dev
```
- UI runs on: `http://localhost:5173` (by default)

## 🏗️ Architecture Overview

The platform is built as a monorepo with strict separation of concerns:

### Backend (`apps/server`)
- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL with `node-pg-migrate`
- **Validation**: Zod (Enforces DPDPA rules strictly)
- **Auth**: JWT-based (HttpOnly cookies + Bearer token)
- **Compliance**:
  - **Middleware**: `requirePasswordReset` enforces mandatory password changes.
  - **Audit Logs**: Immutable, append-only logs for all actions.
  - **Banner Guards**: Prevents dark patterns (e.g., unequal button colors).

### Frontend (`apps/tenant-ui`)
- **Framework**: React + Vite + TypeScript
- **State**: Zustand (Auth/UI) + TanStack Query (Server State)
- **Styling**: Plain CSS with CSS Variables (Design System)
- **Features**:
  - Login & Force Password Reset Flow
  - Dashboard with Compliance Status
  - Website Management (CRUD)
  - Audit Logs Viewer

## 🛡️ DPDPA Compliance Features

The platform is designed to be "Compliant by Default".

1.  **Notice Requirements**:
    - Minimum description length enforced.
    - English translation is **mandatory**.
    - Policy URL validation.

2.  **Purpose Limitation**:
    - Essential purposes cannot be disabled by end-users.
    - Essential purposes must have English translations.

3.  **Dark Pattern Prevention (Banner Customization)**:
    - **Visual Equality**: Accept and Reject buttons must have the same color.
    - **Text Equality**: Button text length must be similar (within 50%).
    - **No Manipulative Language**: Validation rejects biased terminology.

4.  **Audit Trail**:
    - Every configuration change is logged.
    - Logs capture Actor, IP, User Agent, and diffs.
    - Logs are immutable (enforced by DB trigger).

## 🧪 Testing

### Backend Tests
Unit tests cover critical validation logic (Auth, Banner compliance).
```bash
cd "Tenant Platform/apps/server"
npm test
```

### Frontend Build
Verify type safety and build integrity.
```bash
cd "Tenant Platform/apps/tenant-ui"
npm run build
```

## 📝 API Documentation
Detailed API documentation is available in `Tenant Platform/docs/API.md`.

## 📂 Project Structure
```
Tenant Platform/
├── apps/
│   ├── server/          # Fastify Backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── validators/ # Compliance Rules
│   │   │   └── middleware/
│   │   └── migrations/     # SQL Migrations
│   └── tenant-ui/       # React Frontend
│       ├── src/
│       │   ├── api/        # Axios Client
│       │   ├── components/ # Shared UI
│       │   ├── pages/      # Route Components
│       │   └── store/      # Zustand Stores
├── docs/                # Documentation
└── docker-compose.yml   # Shared Infrastructure
```
