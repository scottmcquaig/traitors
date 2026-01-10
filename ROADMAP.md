# FantaCTV – Development Roadmap

## Tech Stack (Chosen for Free Tier Safety)

Frontend:
- Next.js (App Router)
- React
- Tailwind CSS

Backend / BaaS:
- Firebase Auth (email/password)
- Firestore (low read/write volume)
- Firebase Admin SDK (admin ops)

Infra:
- Docker
- Coolify
- VPS deployment

---

## Phase 0 – Project Setup

Parallel Tasks:
- Initialize Next.js app
- Configure Tailwind
- Create Firebase project
- Set up Firestore + Auth
- Dockerfile + env handling

Deliverable:
- App boots locally
- Firebase connected

---

## Phase 1 – Auth & Access Control

Parallel Tasks:
- Email/password auth
- Invite token schema
- Invite acceptance flow
- Admin role flag
- Route protection middleware

Deliverable:
- Invite-only access enforced
- Admin vs player permissions working

---

## Phase 2 – League + Draft

Parallel Tasks:
- League schema
- Contestant schema
- Draft order logic
- Draft board UI
- Draft lock state

Deliverable:
- Admin can draft
- Players can view draft

---

## Phase 3 – Scoring Engine

Parallel Tasks:
- Episode schema
- Score entry form (admin)
- Automatic totals
- Edit history logging

Deliverable:
- Scores persist and calculate correctly

---

## Phase 4 – Player Views

Parallel Tasks:
- Standings page
- Episode detail page
- Roster page
- Read-only guards

Deliverable:
- Players can view everything they need

---

## Phase 5 – Deployment

Parallel Tasks:
- Docker build
- Coolify config
- Env secrets
- Domain setup

Deliverable:
- Live at app.fantactv.com