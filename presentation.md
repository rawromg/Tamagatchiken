Let's use Cursor to create a simple REST API server

## Prep:
1. Create new folder
2. Init Git Repo
3. Create Enviornment
4. Brew Install Node

Commands:
Start Postgres: brew services start postgresql
npm run setup
npm run dev



Prompt:

let’s architect a modern **Tamagotchi-style web app**, with the backend powered by a **Node.js API**. This doc will serve as a blueprint for both game logic and server-side implementation

---
# 🎮 Tamagotchi Web App - Gameplay Design Document
---

## 📌 Overview

**Name**: Tamagotchi Web Revive
**Platform**: Web Browser
**Backend**: Node.js (Express or Fastify)
**Frontend**: Javascript
**Database**: PostgreSQL (relational logic suits game state well)
**Authentication**: Simple Key/Secret stored as browser cookie

---

## 🎯 Core Gameplay Loop

1. Player logs in or creates a new account.
2. Player spawns an egg → hatches into a Tamagotchi.
3. Tamagotchi has meters: hunger, happiness, hygiene, discipline, sleep, and health.
4. Player must perform actions to maintain the pet:

   * Feed, play, clean, heal, sleep, etc.
5. Pet grows over time based on time elapsed and care quality.
6. Pet may evolve, get sick, or die.

---

## 🗂️ Data Models (Simplified)

### User

```ts
{
  id: string,
  email: string,
  passwordHash: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Tamagotchi

```ts
{
  id: string,
  userId: string,
  name: string,
  stage: 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'dead',
  createdAt: Date,
  updatedAt: Date,
  lastInteractedAt: Date,
  stats: {
    hunger: number,      // 0-100
    happiness: number,   // 0-100
    hygiene: number,     // 0-100
    health: number,      // 0-100
    discipline: number,  // 0-100
    energy: number       // 0-100
  },
  evolutionPoints: number
}
```

---

## 📡 API Endpoints (RESTful)

### Auth

* `POST /auth/signup`
* `POST /auth/login`
* `GET /auth/logout`

### Tamagotchi Lifecycle

* `GET /pet` → Get current state
* `POST /pet/spawn` → Create new pet
* `POST /pet/action/:type` → Perform action (feed, play, clean, etc.)
* `POST /pet/sleep` → Toggle sleeping state
* `POST /pet/discipline` → Apply discipline
* `POST /pet/heal` → Give medicine
* `POST /pet/revive` → Restart with new egg (if pet is dead)

---

## Game Loop Mechanic (Server-side Logic)

Every pet updates **passively** based on the time since `lastInteractedAt`. This is to avoid having to constantly ping or run jobs.

### Passive Degradation

* Hunger drops 10 pts per hour.
* Happiness drops 5 pts per hour.
* Hygiene drops 7 pts every 90 minutes.
* If hunger or hygiene = 0, health starts dropping.
* Energy drops faster when not sleeping.

### Scheduled Evolution

* Stage changes based on time alive and care level.
* `evolutionPoints` increase when all stats > 70.

---

## ⏱️ Cron or Worker Jobs

Use scheduled background jobs (via BullMQ or Agenda.js) for:

* Daily resets (e.g., age increments)
* Notification reminders ("Your pet is starving!")
* Random sickness triggers
* Death conditions if critical stats < 10 for X hours

---

## 📈 Actions & Effects

| Action       | Effect                                   |
| ------------ | ---------------------------------------- |
| `feed`       | +20 hunger, -5 hygiene                   |
| `play`       | +15 happiness, -10 energy                |
| `clean`      | +30 hygiene                              |
| `sleep`      | +20 energy per hour, freezes degradation |
| `heal`       | Sets health to 100, costs resources      |
| `discipline` | +10 discipline, -5 happiness             |

---

## 🧠 Evolution System

| Stage | Time Alive | Condition                        |
| ----- | ---------- | -------------------------------- |
| Baby  | 0-2 hours  | Auto after hatching              |
| Child | 2-8 hours  | Must be >50 in all stats         |
| Teen  | 8-24 hours | At least 1 successful discipline |
| Adult | 24+ hours  | Good overall care                |
| Dead  | Any stage  | Any stat at 0 for >3 hours       |

---

## ⚠️ Error Handling & Edge Cases

* If pet is dead, all actions are locked except `/revive`.
* Users can’t spawn multiple pets.
* Inactivity > 72 hours = forced pet death.

---

## 🔐 Security Considerations

* Sanitize all action inputs.
* Validate Api/Key for every pet request.
* Rate-limit action spam to prevent abuse.

---
