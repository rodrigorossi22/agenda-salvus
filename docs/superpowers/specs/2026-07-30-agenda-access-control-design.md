# Design Specification: Agenda Access Control & Routing Protection

**Date:** 2026-07-30  
**Project:** Agenda Salvus (`Feegow/Agenda Salvus`)  
**Status:** Approved by User  

---

## 1. Goal & Requirements

### Primary Objectives:
1. Protect the internal clinic daily schedule (patient names, treatments, doctor appointments) from unauthorized public viewing.
2. Prevent accidental exposure when someone visits the root URL (`https://agenda-salvus.vercel.app/`).
3. Maintain **100% feature preservation and non-regression** for the public booking portal (`/agendamento_online`). The public booking code in `OnlineBooking.jsx` MUST NOT be altered in any way.
4. Provide a simple, elegant PIN-based lock screen for staff to access the internal daily schedule at `/admin`.

---

## 2. Architecture & Routing

### 2.1 Route Mapping (`main.jsx`)

| Path | Access | Component / Action | Description |
| :--- | :--- | :--- | :--- |
| `/` | Public | `<Navigate to="/agendamento_online" replace />` | Automatically redirects root traffic to the public booking page. |
| `/agendamento_online` | Public | `<OnlineBooking />` | **Untouched.** Existing Feegow-integrated booking flow. |
| `/menu`, `/servicos`, `/tabela` | Public | `<ServiceMenu />` | **Untouched.** Service menu and price table. |
| `/admin` | Protected | `<AdminRoute><App /></AdminRoute>` | Internal daily agenda for clinic staff, protected by PIN lock. |

---

## 3. PIN Authentication Mechanics

### 3.1 `AdminRoute.jsx` Wrapper & `PinLockScreen.jsx`
- **State Check:** Checks `localStorage.getItem('salvus_admin_auth_token')`.
- **Valid Token:** Renders `<App />` (the internal daily schedule).
- **Invalid / Missing Token:** Renders `<PinLockScreen onAuthenticate={handleAuth} />`.

### 3.2 PIN Validation & Storage
- **Default PIN:** `2408` (configurable via `import.meta.env.VITE_ADMIN_PIN` or default fallback `'2408'`).
- **Storage Key:** `salvus_admin_auth_token`.
- **Value:** Timestamp of authentication.
- **Expiration:** Valid indefinitely on the device until manual logout via the `🔒 Sair` button in the topbar.

### 3.3 Visual Aesthetics (`PinLockScreen.jsx`)
- Strictly adheres to Salvus Silent Luxury visual identity:
  - Fendi / Champagne Gold accents (`#c5a059`).
  - Dark Graphite background (`#0a0a0a` / `#111111`).
  - Typography: Modern serif headings + clean sans-serif body.
- Auto-focus on 4-digit PIN input with masked dots (`••••`).
- Error state: Red border error indicator on incorrect PIN attempt.

---

## 4. Non-Regression Guarantee for `/agendamento_online`

- `OnlineBooking.jsx` and all underlying components (`DateTimeStage.jsx`, `ProcedureStage.jsx`, `FormStage.jsx`, `feegow.js` service) remain 100% unmodified and intact.
- The route `/agendamento_online` remains publicly accessible without any authentication checks.
