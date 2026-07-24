# ⚽ TourneyFC — Football Tournament Manager

A full-stack football tournament management app for local area tournaments.
Supports 3s, 5s, 6s, 7s, and 11s formats with full league, knockout, and league+knockout systems.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + Django + Django REST Framework |
| Database | MySQL |
| Web Frontend | React.js + Tailwind CSS (Vite) |
| Mobile App | React Native + Expo |
| Auth | JWT (djangorestframework-simplejwt) |
| File Storage | Cloudinary |
| Push Notifications | Firebase Cloud Messaging |
| Languages | English, Tamil, Malayalam |

## Features

- Multi-area tournament management
- Organiser and Viewer roles
- Age verification via Aadhaar upload
- Auto fixture generation (League / Knockout / League+KO)
- Live league table auto-update
- Top scorers and assists leaderboard
- Per-match and overall tournament awards
- WhatsApp share on every result and fixture
- Dark mode
- Multi-language (English / Tamil / Malayalam)

## Project Structure

```
tourneyfc/
├── backend/          ← Django API
├── web-frontend/     ← React web app
└── mobile-app/       ← React Native Expo app
```

## Getting Started

See setup instructions in docs/SETUP.md

## Created by Suraj
