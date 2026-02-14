Kudjo Affiliate

Kudjo Affiliate is an affiliate marketing platform connecting businesses and influencers. Merchants define discount campaigns and budgets, influencers accept offers and receive coupon codes, and administrators manage accounts and payouts
GitHub
. The current MVP relies on Firebase for authentication and data storage, with Next.js for the front‑end and Firebase Functions for the API
GitHub
.

Features

Businesses: create offers, set budgets, and track campaign performance.

Influencers: browse available offers, accept campaigns, and receive affiliate codes and meal coupons.

Admin: approve or deny businesses and influencers, manage coupons, and export reports.

Manual redemption: until POS integration, redemptions are entered manually.

Messaging: 1:1 chat and announcements via Firestore and FCM.

Tech Stack

Frontend: Next.js 14 (app router), React 18, TypeScript, Tailwind CSS, shadcn/ui components, and Recharts
GitHub
.

Backend: Firebase Auth, Firestore, and Cloud Functions (Express router)
GitHub
.

Build/QA: ESLint, Prettier, and Vitest/Jest (recommended), with Firebase emulators for local development.

Prerequisites

Node.js ≥ 20 and npm ≥ 10
GitHub
.

Firebase CLI installed globally (npm i -g firebase-tools)
GitHub
.

A Firebase project with Firestore, Auth, and Functions enabled.

(Optional) Vercel account for hosting the web app.

See INSTRUCTIONS.md
 for a full build guide.

Getting Started

Clone and install dependencies

git clone https://github.com/<your‑org>/Kudjo_Affiliate.git
cd Kudjo_Affiliate
npm install


Configure environment variables
Copy .env.example to .env.local for the Next.js app and .env inside functions/ for Cloud Functions. Fill in the required values (do not commit secrets). See Section 2.3 of INSTRUCTIONS.md
 for details
GitHub
.

Run the development environment

firebase login
firebase use <your‑project>
firebase emulators:start
# in a separate terminal
npm run dev


The app should be available at http://localhost:3000. The Firebase emulators provide Firestore, Auth, and Functions locally
GitHub
.

Testing
Unit and integration tests live under tests/. Use:

npm run test:unit       # unit tests
npm run test:e2e        # end‑to‑end tests
npm run test:all        # run all tests


Lint and type‑check the code with:

npm run lint
npm run typecheck


Seeding demo data
To seed the local Firestore with demo users and campaigns, run:

npm run seed          # or ./scripts/run-seed-no-prompt.sh


Seeding creates sample admin, business, and influencer accounts. Use the credentials printed in the console.

Deployment

For production deployment, see DEPLOYMENT.md
 and the checklist in deployment/production-checklist.md. Deployment generally involves:

Building the Next.js app (npm run build) and deploying it to Vercel or Firebase Hosting.

Deploying Firestore rules, indexes, and Cloud Functions with the Firebase CLI
GitHub
.

Setting environment variables in Vercel and Firebase (do not commit them).

Running smoke tests and verifying the core flows after deployment
GitHub
.

Roles and Route Guarding

Kudjo Affiliate defines three user roles
GitHub
:

admin – accesses /control-center/* and can manage businesses, influencers, and campaigns.

business – accesses /business/*, can create offers and view campaign performance.

influencer – accesses /influencer/*, browses offers and sees affiliate codes.

Authentication is via Firebase Email/Password or Google sign‑in
GitHub
. Admins log in via a custom session-cookie endpoint using the ADMIN_EMAIL and ADMIN_PASSCODE from your environment. Unauthenticated users are redirected to /auth/*.

Contributing

Use the Makefile commands (see below) to perform common tasks.

Follow the code style enforced by ESLint and Prettier.

Update the docs/delivery/backlog.md with new work items; each PBI should live in docs/delivery/pbis/.

When adding new features, write unit tests and update the production checklist as needed.

This README is a companion to INSTRUCTIONS.md. For a deeper explanation of the data model, API routes, security rules, and portal flows, refer to that document. Always keep secrets out of the repository.