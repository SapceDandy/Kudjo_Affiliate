Docker Guide

This document provides a starting point for containerising the Kudjo Affiliate monorepo. Containerisation enables consistent builds and easier deployment across environments.

Goals

Build the Next.js application and Firebase Functions in a reproducible environment.

Reduce image size by using multi‑stage builds and caching dependencies.

Run the application as a non‑root user and follow security best practices.

Sample Dockerfile

Below is an example multi‑stage Dockerfile. Adjust the Node version to match the .nvmrc in the repo.

# Stage 1: Install dependencies and build the Next.js app
FROM node:20-buster AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build web application and functions
RUN npm run build:web    # compile Next.js (define in package.json)
RUN npm run build:functions

# Stage 2: Production image
FROM node:20-buster-slim

WORKDIR /app

# Install minimal dependencies for runtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built files from build stage
COPY --from=build /app/.next .next
COPY --from=build /app/functions/dist functions/dist
COPY --from=build /app/public public

# Add a non-root user
RUN useradd -m kudjo && chown -R kudjo:kudjo /app
USER kudjo

EXPOSE 3000
CMD ["npm", "start"]

Notes

System dependencies – If your build relies on native libraries (e.g. image processing), install them in the build stage (e.g. apt-get install -y libcairo2-dev libpango1.0-dev)
vardhmanandroid2015.medium.com
.

Functions – For Firebase Functions, you can use the Functions Framework (npm i -g firebase-functions@latest firebase-tools) and run functions locally with npx functions-framework --target=api or deploy them separately.

Non‑root user – Running as a non‑root user reduces the impact of potential security vulnerabilities
vardhmanandroid2015.medium.com
.

Caching – Use npm ci with package-lock.json to ensure deterministic installs. In CI, cache the .npm directory to speed up builds.

Environment variables – Pass secrets at runtime via docker run -e VAR=value or your orchestration tool. Do not bake secrets into images.

CI/CD integration – Modify your GitHub Actions workflow to build the Docker image (docker build), run tests inside the container, and push the image to a registry before deployment.

This Docker guide is intentionally generic; adapt it to your infrastructure and the specifics of your build pipeline.