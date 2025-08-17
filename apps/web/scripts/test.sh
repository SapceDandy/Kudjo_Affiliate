#!/bin/bash

# Default values
WATCH=false
COVERAGE=false
UPDATE_SNAPSHOTS=false
FILTER=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch|-w)
      WATCH=true
      shift
      ;;
    --coverage|-c)
      COVERAGE=true
      shift
      ;;
    --update-snapshots|-u)
      UPDATE_SNAPSHOTS=true
      shift
      ;;
    --filter|-f)
      FILTER="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build the command
CMD="jest"

# Add watch mode if requested
if [ "$WATCH" = true ]; then
  CMD="$CMD --watch"
fi

# Add coverage if requested
if [ "$COVERAGE" = true ]; then
  CMD="$CMD --coverage"
fi

# Add update snapshots if requested
if [ "$UPDATE_SNAPSHOTS" = true ]; then
  CMD="$CMD -u"
fi

# Add filter if provided
if [ ! -z "$FILTER" ]; then
  CMD="$CMD $FILTER"
fi

# Run the command
echo "Running: $CMD"
$CMD 