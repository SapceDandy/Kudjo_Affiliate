Deployment Guide

This document explains how to deploy the Kudjo Affiliate application to production. It summarises the production checklist provided in deployment/production-checklist.md
GitHub
 and expands on environment configuration.

Environment Preparation

Set environment variables – Ensure all variables listed in .env.example are provided in your production environment (Vercel and Firebase). Disable demo mode by setting NEXT_PUBLIC_DEMO=0 and remove seeding flags
GitHub
. Do not store secrets in the repository.

Firebase project configuration – Create or select a production Firebase project. Deploy Firestore rules and composite indexes, configure Auth authorised domains and set up Functions variables
GitHub
.

Admin credentials and JWT – Generate secure admin credentials and a JWT secret. Rotate these regularly
GitHub
.

Build and Test

Build – Run the build and type‑check steps:

npm run build       # compiles the Next.js app
npm run typecheck   # runs TypeScript
npm run lint        # runs ESLint:contentReference[oaicite:4]{index=4}


Tests – Execute the test suites before deployment:

npm run test:all    # run unit, integration and e2e tests:contentReference[oaicite:5]{index=5}

Deploy Infrastructure

Firestore Rules and Indexes – Deploy the database security rules and composite indexes first:

npm run deploy:rules


Cloud Functions – Deploy backend functions next:

npm run deploy:functions:contentReference[oaicite:6]{index=6}


Web Application – Deploy the Next.js app to your hosting provider:

npm run deploy:vercel   # deploy to Vercel
# or
npm run deploy:firebase # deploy to Firebase Hosting:contentReference[oaicite:7]{index=7}


Configure the custom domain and TLS via your hosting provider.

Verification

After deployment, perform smoke tests to verify that:

The homepage loads and performs well.

Admin login and portal navigation work.

Business and influencer onboarding flows complete successfully.

Offers can be created, campaigns joined and manual redemptions entered.

Messaging and export features function as expected
GitHub
.

Monitor performance metrics (page load times < 3 s, API response times < 1 s) and ensure assets are optimised
GitHub
. Keep error tracking and performance monitoring services active
GitHub
.

Rollback and Support

Have a rollback plan in place:

Revert to the previous Vercel deployment
GitHub
.

Roll back Firebase Functions to the previous version
GitHub
.

Restore the database from backups if necessary
GitHub
.

Update DNS to point back to the backup environment
GitHub
.

For assistance, consult:

Firebase Support
 
GitHub
.

Vercel Dashboard
 
GitHub
.

Your DNS and monitoring providers.

This deployment guide is a summary; always consult your project’s infrastructure team and deployment/production-checklist.md for a comprehensive list of pre‑deployment, deployment and maintenance tasks.