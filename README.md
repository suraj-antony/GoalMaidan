# ⚽ GoalMaidan — Football Tournament Manager

**"Maidan"** is the open ground where local football is played. **GoalMaidan** brings that ground online — a full-stack tournament management platform built for grassroots and local-area football organisers.

Run tournaments in **3s, 5s, 6s, 7s, 9s, and 11s** formats with full **League**, **Knockout**, and **League + Knockout** systems — the same structure used by La Liga, the FA Cup, and the FIFA World Cup, scaled down for your local ground.

---

## ✨ Features

- 🏟️ **Multi-format support** — 3s, 5s, 6s, 7s, 9s, and 11s tournaments in one app
- 🏆 **Three tournament systems** — League, Knockout, and League + Knockout (with Multi-Group "World Cup style" or Single-Group "Champions League style")
- 👥 **Two roles** — Organiser (full control) and Viewer (browse, search, filter public tournaments)
- 🔞 **Age category verification** — U7 to U23, Open, and Veterans, with optional Aadhaar/certificate upload for age-restricted categories
- ⚡ **Auto fixture generation** — round-robin league scheduling, knockout brackets with bye handling, and auto-advancing winners between rounds
- 📊 **Live league table** — auto-updates after every match result
- ⚽ **Full match stats** — goals, assists, goal contributions, cards, clean sheets, saves — organiser chooses what to track and what to show publicly
- 🏅 **Configurable awards** — Top Scorer, Best Goalkeeper, Best Defender, Best Player, Emerging Player, Man of the Match, and more — per match and/or for the whole tournament
- 🗂️ **Squad management** — add, edit, and manage players per team, used directly in match result entry via searchable dropdowns
- 🌳 **Knockout bracket view** — visual bracket tree with connector lines and a Champion box, just like ESPN/Sofascore
- 📲 **WhatsApp sharing** — one-tap share of results and fixtures straight to WhatsApp groups
- 🌗 **Dark mode** — full theme support across web and mobile
- 🌐 **Multi-language** — English, Tamil (தமிழ்), and Malayalam (മലയാളം)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + Django + Django REST Framework |
| Database | MySQL |
| Web Frontend | React.js + Tailwind CSS (Vite) |
| Mobile App | React Native + Expo |
| Auth | JWT (`djangorestframework-simplejwt`) |
| File Storage | Cloudinary |
| Push Notifications | Firebase Cloud Messaging |
| Languages | English, Tamil, Malayalam (i18next) |

---

## 📂 Project Structure

```
goalmaidan/
├── backend/          ← Django REST API
│   └── apps/
│       ├── users/        (organiser + viewer accounts, JWT auth)
│       ├── tournaments/  (tournament + group config)
│       ├── teams/        (teams + players/squad)
│       ├── fixtures/     (fixtures, results, bracket logic)
│       └── awards/       (stats, leaderboards, awards)
├── web-frontend/     ← React web app (Vite + Tailwind)
└── mobile-app/       ← React Native Expo app
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL Server
- Git

### Quick setup
```bash
git clone https://github.com/<your-username>/goalmaidan.git
cd goalmaidan
```

Full step-by-step setup (virtual env, MySQL database, `.env` config, running backend/web/mobile) is in **[`docs/SETUP.md`](docs/SETUP.md)**.

---

## 🗺️ Roadmap

- [ ] SMS match reminders
- [ ] Certificate generator (PDF) for champions and award winners
- [ ] Offline mode for low-connectivity grounds
- [ ] Score predictor game for viewers

---

## 📄 License

This project is currently private / unlicensed. Add a license here once ready to open-source.

---

**Created by Suraj** 🇮🇳