#!/bin/bash

# Vercel deployment script for Tamagotchi Web App
# This script runs the build process and then starts the production server

set -e  # Exit on any error

echo "🚀 Starting Vercel deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a Vercel environment
if [ -n "$VERCEL" ]; then
    print_status "Vercel environment detected"
    export NODE_ENV=production
fi

# Step 1: Run the build process
print_status "Running build process..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 2: Check if we should start the server
# In Vercel, we typically don't start the server during build
# This is mainly for local testing or custom deployments