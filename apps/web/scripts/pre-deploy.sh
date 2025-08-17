#!/bin/bash

# Colors
RED="[0;31m"
GREEN="[0;32m"
YELLOW="[1;33m"
NC="[0m"

echo "🔍 Running pre-deployment checks..."

# Function to check command result
check_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1 passed${NC}"
  else
    echo -e "${RED}✗ $1 failed${NC}"
    exit 1
  fi
}

# Check environment variables
echo -e "
${YELLOW}Checking environment variables...${NC}"
required_vars=(
  "NEXT_PUBLIC_GA_ID"
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_SITE_URL"
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗ Missing required environment variable: $var${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✓ Environment variables check passed${NC}"

# Run security audit
echo -e "
${YELLOW}Running security audit...${NC}"
npm audit
check_result "Security audit"

# Run type check
echo -e "
${YELLOW}Running type check...${NC}"
npm run typecheck
check_result "Type check"

# Run tests
echo -e "
${YELLOW}Running tests...${NC}"
npm run test:ci
check_result "Tests"

# Run accessibility tests
echo -e "
${YELLOW}Running accessibility tests...${NC}"
npm run lint:a11y
check_result "Accessibility tests"

# Run bundle analysis
echo -e "
${YELLOW}Running bundle analysis...${NC}"
npm run analyze
check_result "Bundle analysis"

# Run build
echo -e "
${YELLOW}Running production build...${NC}"
npm run build
check_result "Production build"

echo -e "
${GREEN}✓ All pre-deployment checks passed!${NC}"

echo -e "
${YELLOW}Pre-deployment checklist:${NC}"
echo "□ Verify all environment variables in production"
echo "□ Test error boundaries in production build"
echo "□ Verify analytics tracking"
echo "□ Check SEO meta tags"
echo "□ Verify security headers"
echo "□ Test performance monitoring"
echo "□ Run Lighthouse audit"
echo "□ Check accessibility compliance"
echo "□ Verify backup and rollback procedures"
echo "□ Update documentation"
