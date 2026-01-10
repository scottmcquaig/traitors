# FantaCTV – Product Requirements Document

## Overview
FantaCTV is a private fantasy league app for *The Traitors*. One admin drafts contestants and enters episode scores. All other users view standings and episode breakdowns.

- Private, invite-only
- Small scale (5 total users)
- Objective scoring only
- Deployed at `app.fantactv.com`

## User Roles

### Admin
- Create league
- Invite users by email
- Create contestants
- Run draft
- Enter episode scores
- Edit past episodes

### Player
- Accept invite
- View draft results
- View standings
- View episode scoring breakdowns

## Authentication
- Email + password
- Invite-only
- No public registration
- Admin sends invite emails
- Invite links expire

## Core Features

### League
- Single league MVP
- League name + season label
- Fixed roster size after draft

### Draft
- Snake draft
- Admin-controlled picks
- Draft board view
- Draft lock once finalized

### Scoring
- Episode-based scoring
- Admin inputs points per contestant
- Automatic rollups:
  - Per episode
  - Per roster
  - Season total

### Viewing
- Standings page
- Episode detail page
- Read-only for non-admins

## Non-Goals (MVP)
- No live scoring
- No public leagues
- No chat
- No push notifications

## Success Criteria
- Admin can run entire season without spreadsheets
- Players can check scores episode-by-episode
- Zero free-tier overages