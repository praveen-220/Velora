# Velora: Features Roadmap & Implementation Plan

This file lists the required features, priorities, and concrete implementation tasks to bring the Velora web app to production readiness. Use this as a living roadmap and to create issues/PRs.

---

## Phase 1 — High Priority (MVP + Safety)

1) Payment Integration
- Goal: Replace mocked payments with a secure gateway (Razorpay / Stripe).
- Frontend tasks:
  - Add payment flow integration in app.js -> processPayment (tokenize card, handle success/failure)
  - Replace modal mock fields with secure token UX
- Backend tasks:
  - POST /payments/create_session -> create payment intent
  - POST /payments/confirm -> verify webhook/payment status
  - Store transactions & receipts
- Acceptance:
  - Successful payments create booking and return receipt; failed payments rollback booking.

2) Ratings & Reviews
- Goal: Collect post-ride ratings and display aggregated driver/passenger scores.
- Frontend tasks:
  - Add rating UI after ride completion in startRiderTracking -> end flow
  - Display average ratings on profile and rides list
- Backend tasks:
  - POST /rides/:id/rate { user_id, rating, comment }
  - GET /users/:id/ratings
- Acceptance:
  - Ratings update driver and passenger aggregates, shown on profile.

3) Driver Verification Pipeline
- Goal: Secure onboarding and document verification.
- Frontend tasks:
  - Add document upload UI (license, insurance) in profile/offer flow
  - Add verification status UI for dev-dashboard approvals
- Backend tasks:
  - POST /user/documents upload
  - GET /dev/pending-drivers
  - POST /dev/verify-driver { id, status }
  - Integration with basic OCR/KYC (optional)
- Acceptance:
  - Documents stored and admins can approve/reject; driver status updated.

4) Real-time Notifications (in-app + SMS/Email)
- Goal: Notify users of booking confirmations, driver arrival, OTPs.
- Frontend tasks:
  - Add in-app notifications panel & show toasts
  - Integrate WebSocket / EventSource for live events
- Backend tasks:
  - Emit events via Socket.IO or SSE
  - Add SMS/Email provider integration for OTP & important alerts
- Acceptance:
  - OTP messages and booking notifications delivered reliably.

---

## Phase 2 — Medium Priority

5) Safety features
- SOS button should call backend to notify emergency contacts and mark ride flag.
- Add driver photo verification & share ride with trusted contacts (link + expiry).

6) Advanced Search & Filters
- Add filters by price, time window, driver rating, vehicle type.

7) Driver Dashboard & Earnings
- Accept/decline rides endpoints & UI, earnings ledger, payout scheduling.

8) Support center
- In-app contact form, ticketing endpoints, and developer portal support views.

---

## Phase 3 — Enhancements

9) Analytics & Dev Tools
- More charts in devDashboard (hourly demand heatmap, funnels, cohort).

10) Compliance & Privacy
- KYC flows, GDPR data export/delete endpoints, policy pages.

---

## Suggested Repo Changes & Files
- FEATURES.md (this file)
- API: backend/routes/payments.py (or equivalent) + webhooks
- Frontend: app.js changes near processPayment, startRiderTracking, handlePublishRide
- New UI components: Rating modal, Notifications panel, Document upload form
- Tests: unit tests for pricing engine and payment flows

---

## First GitHub Tasks (Concrete)
- Create issue: Integrate Stripe/Razorpay payment gateway (include test keys) — ASSIGNEE: backend
- Create issue: Rating & Review flow (frontend + backend endpoints) — ASSIGNEE: frontend
- Create issue: Driver Document Upload + Admin Approval — ASSIGNEE: backend + frontend
- Create issue: Real-time notifications (Socket.IO + SSE fallback)

---

## Notes & Implementation Tips
- Use secure storage for secrets and environment variables (.env for local, Secrets in GitHub Actions)
- Keep third-party requests (Nominatim) rate-limited and cache common geocoding results
- Use a small transactional database table for bookings to avoid double booking seats
- Design APIs to be idempotent for retries (payments, webhooks)