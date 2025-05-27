#!/bin/bash

# WhatsApp Business API - Vercel Deployment Script
# Vercel offers generous free tier for Node.js applications

set -e

echo "🚀 WhatsApp Business API - Vercel Deployment"
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

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    print_success "Vercel CLI is available"
}

# Create vercel.json configuration
create_vercel_config() {
    if [ ! -f "vercel.json" ]; then
        print_status "Creating vercel.json configuration..."
        cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
        print_success "vercel.json created"
    else
        print_success "vercel.json already exists"
    fi
}

# Set up environment variables
setup_env_vars() {
    if [ -f ".env" ]; then
        print_status "Setting up environment variables..."
        
        # Read .env file and set variables
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
                continue
            fi
            
            # Extract key=value
            if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                
                # Remove quotes if present
                value=$(echo "$value" | sed 's/^["'\'']\|["'\'']$//g')
                
                print_status "Setting $key..."
                vercel env add "$key" production <<< "$value"
            fi
        done < .env
        
        print_success "Environment variables set successfully"
    else
        print_warning "No .env file found"
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Deploy
    if vercel --prod; then
        print_success "Deployment completed successfully!"
        
        # Get deployment URL
        VERCEL_URL=$(vercel ls | grep "whatsapp" | head -1 | awk '{print $2}' || echo "")
        if [ -n "$VERCEL_URL" ]; then
            print_success "Your app is available at: https://$VERCEL_URL"
        fi
    else
        print_error "Deployment failed"
        return 1
    fi
}

# Main deployment flow
main() {
    print_status "Starting Vercel deployment process..."
    
    check_vercel_cli
    create_vercel_config
    
    # Login to Vercel
    print_status "Please login to Vercel..."
    vercel login
    
    # Set up environment variables
    read -p "Do you want to set up environment variables from .env file? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        setup_env_vars
    fi
    
    # Deploy
    read -p "Ready to deploy to Vercel? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        deploy_to_vercel
    fi
    
    echo
    print_success "🎉 Vercel deployment process completed!"
    echo
    print_status "Vercel Free Tier includes:"
    echo "  • 100GB bandwidth/month"
    echo "  • Automatic SSL certificates"
    echo "  • Custom domains"
    echo "  • Serverless functions"
    echo
}

main "$@"
