# 30-Minute Schedule Grid for Saturday 01/08/2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 30-minute interval slot generation and 30-minute Feegow duration booking exclusively for Saturday 01/08/2026 on the `/homologacao` route.

**Architecture:** Update `scarcitySlotsForDate` and booking payload logic in `OnlineBooking.jsx` to check `isHomologation && dateKey === '2026-08-01'`, generating 30-min slots and sending `duracao: 30` to Feegow API.

**Tech Stack:** React, Feegow REST API, Vitest.

---

### Task 1: Update Slot Generation & Booking Payload in `OnlineBooking.jsx`

**Files:**
- Modify: `Feegow/Agenda Salvus/src/components/OnlineBooking/OnlineBooking.jsx`

- [ ] **Step 1: Add 30-min slot calculation for Saturday 01/08/2026 in `scarcitySlotsForDate`**

In `OnlineBooking.jsx`, check if `isHomologation && dateKey === '2026-08-01'`:
If true, include all available 30-minute slots without filtering out 60-min overlaps.

- [ ] **Step 2: Update Feegow creation payload for 01/08/2026 in `handleSubmitBooking`**

In `OnlineBooking.jsx`, when booking for `2026-08-01` in homologation mode:
Send `duracao: 30` in the appointment payload to Feegow.

- [ ] **Step 3: Run Vitest & Build Check**

Run `npm run build` inside `Feegow/Agenda Salvus`.

- [ ] **Step 4: Commit**

```bash
git add "Feegow/Agenda Salvus/src/components/OnlineBooking/OnlineBooking.jsx"
git commit -m "feat(homologation): add 30-min schedule grid exclusively for Saturday 01/08/2026"
```
