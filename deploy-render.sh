#!/bin/bash

# WhatsApp Business API - Render Deployment Script
# Render offers generous free tier with 750 hours/month

set -e

echo "🚀 WhatsApp Business API - Render Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if render.yaml exists
check_render_config() {
    if [ ! -f "render.yaml" ]; then
        print_status "Creating render.yaml configuration..."
        cat > render.yaml << EOF
services:
  - type: web
    name: whatsapp-business-api
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: WHATSAPP_TOKEN
        sync: false
      - key: WHATSAPP_PHONE_ID
        sync: false
      - key: WHATSAPP_BUSINESS_ACCOUNT_ID
        sync: false
      - key: DOMAIN_URL
        sync: false
      - key: WHATSAPP_APP_ID
        sync: false
      - key: WHATSAPP_APP_SECRET
        sync: false
      - key: WHATSAPP_SYSTEM_USER_ID
        sync: false
      - key: WHATSAPP_SYSTEM_USER_TOKEN
        sync: false
      - key: MONGODB_URI
        sync: false
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
      - key: AWS_REGION
        sync: false
      - key: AWS_S3_BUCKET
        sync: false
      - key: AWS_S3_CUSTOM_DOMAIN
        sync: false
EOF
        print_success "render.yaml created"
    else
        print_success "render.yaml already exists"
    fi
}

# Main deployment instructions
main() {
    print_status "Setting up Render deployment configuration..."
    
    check_render_config
    
    echo
    print_success "🎉 Render configuration ready!"
    echo
    print_status "Next steps for Render deployment:"
    echo "1. Push your code to GitHub repository"
    echo "2. Go to https://render.com and sign up/login"
    echo "3. Click 'New +' -> 'Web Service'"
    echo "4. Connect your GitHub repository"
    echo "5. Render will automatically detect render.yaml"
    echo "6. Set environment variables in Render dashboard"
    echo "7. Deploy!"
    echo
    print_status "Render Free Tier includes:"
    echo "  • 750 hours/month (enough for 24/7 operation)"
    echo "  • Automatic SSL certificates"
    echo "  • Custom domains"
    echo "  • No credit card required"
    echo
}

main "$@"
