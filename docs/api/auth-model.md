# Authentication and Authorization Model

## Overview

The Secure Serverless Incident Portal uses a split-access model:

- **public users** can submit and track reports without creating an account
- **admin/reviewer users** authenticate and access protected management routes

This model is intentionally designed to:
- keep the MVP feasible and low-cost
- avoid building a full public identity system
- still demonstrate strong security thinking

---

## Public submitter model

Public users do **not** need to sign in.

They can:

- submit a report
- optionally upload evidence
- track report status using:
  - `PublicId`
  - `TrackingToken`

### Why no public account system in MVP?

This keeps the project:

- simpler to implement
- cheaper to operate
- more realistic for a student subscription
- focused on core secure workflow design

---

## Tracking-token model

When a public report is submitted, the backend generates:

- `PublicId`  
  Example: `INC-2026-000001`

- `TrackingToken`  
  Example: a high-entropy random string shown once to the submitter

### Security rules

- the raw tracking token is shown **only once**
- only `TrackingTokenHash` is stored in the database
- tracking requires both:
  - `PublicId`
  - `TrackingToken`

### Why this is a strong design

It provides:

- secure anonymous status lookup
- no need for password/account management
- no recovery of raw secret from storage
- a professional security-oriented design choice

---

## Admin / reviewer model

Admin and reviewer users must authenticate.

### MVP authentication mechanism

Use custom auth cookie.

### Why this choice

This gives:

- protected admin routes
- Full control of the authentication
- 

---

## Route protection model

### Frontend route protection

Admin routes should be protected in `staticwebapp.config.json`.

Example concept:

- `/admin*` routes require authenticated access
- unauthorized users are redirected to sign-in

### Backend route protection

Frontend protection alone is **not sufficient**.

Every admin API endpoint must also validate:

- user authentication
- expected claims/identity
- admin/reviewer authorization rules

### Security principle

The backend is the real security boundary.

---

## Authorization boundaries

## Public endpoints

Allowed:
- submit incident
- upload evidence
- track incident status using token

Not allowed:
- list incidents
- update incident details
- view internal comments
- view audit history
- see reviewer assignment
- see internal-only metadata

---

## Admin endpoints

Allowed:
- list incidents
- search/filter incidents
- retrieve incident detail
- update:
  - status
  - severity
  - category
  - reviewer assignment
- add internal comments
- review evidence metadata

---

## MVP role model

For MVP, admin-side authenticated users will share one privileged role.


## Secrets and credential handling

### Rules

- no hardcoded secrets
- no credentials committed to Git
- use app settings / environment configuration where required
- prefer managed identity later for Azure resource access

---

## Evidence access model

Uploaded evidence should never be publicly accessible.

### Rules

- store evidence in a private Blob container
- expose evidence access only through controlled backend logic
- do not allow direct anonymous blob browsing

---

## Summary

This authentication/authorization model is intentionally designed to balance:

- security
- practicality
- Azure-native implementation
- MVP feasibility

It provides:
- anonymous public submission
- secure token-based tracking
- authenticated admin management
- clear privilege boundaries