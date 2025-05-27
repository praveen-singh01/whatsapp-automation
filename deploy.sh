#!/bin/bash

# WhatsApp Business API - Railway Deployment Script
# This script helps automate the deployment process to Railway

set -e  # Exit on any error

echo "🚀 WhatsApp Business API - Railway Deployment"
echo "=============================================="

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

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed"
        echo "Please install it with: npm install -g @railway/cli"
        exit 1
    fi
    print_success "Railway CLI is installed"
}

# Check if user is logged in to Railway
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        print_error "Not logged in to Railway"
        echo "Please login with: railway login"
        exit 1
    fi
    print_success "Logged in to Railway"
}

# Check if Docker is running (for local testing)
check_docker() {
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        print_success "Docker is available and running"
        return 0
    else
        print_warning "Docker is not available or not running"
        return 1
    fi
}

# Validate environment file
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning "No .env file found"
        echo "Creating sample .env file..."
        cat > .env << EOF
# WhatsApp Business API Configuration
WHATSAPP_TOKEN=your_whatsapp_business_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp_business

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name

# Domain Configuration (will be updated after deployment)
DOMAIN_URL=https://your-app-name.up.railway.app

# Application Settings
NODE_ENV=production
EOF
        print_warning "Please update .env file with your actual values before deploying"
        return 1
    else
        print_success ".env file found"
        return 0
    fi
}

# Build and test Docker image locally
test_docker_build() {
    if check_docker; then
        print_status "Building Docker image locally for testing..."
        if docker build -t whatsapp-business-api .; then
            print_success "Docker image built successfully"

            print_status "Testing Docker container..."
            if docker run --rm -d -p 3001:3000 --name whatsapp-test whatsapp-business-api; then
                sleep 5
                if curl -f http://localhost:3001/health &> /dev/null; then
                    print_success "Docker container is running and healthy"
                    docker stop whatsapp-test
                else
                    print_error "Docker container health check failed"
                    docker stop whatsapp-test
                    return 1
                fi
            else
                print_error "Failed to run Docker container"
                return 1
            fi
        else
            print_error "Docker build failed"
            return 1
        fi
    else
        print_warning "Skipping Docker test (Docker not available)"
    fi
}

# Deploy to Railway
deploy_to_railway() {
    print_status "Deploying to Railway..."

    # Check if railway.toml exists
    if [ ! -f "railway.toml" ]; then
        print_status "Creating railway.toml configuration..."
        cat > railway.toml << EOF
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
EOF
    fi

    # Initialize Railway project if not already done
    if [ ! -f "railway.json" ]; then
        print_status "Initializing Railway project..."
        railway init
    fi

    # Check if a service is linked, if not create one
    if railway status | grep -q "Service: None"; then
        print_status "No service linked. Creating new service..."
        railway add --service whatsapp-business-api
        print_success "Service created and linked"
    fi

    # Deploy
    print_status "Starting deployment..."
    if railway up; then
        print_success "Deployment completed successfully!"

        # Get the deployment URL
        RAILWAY_URL=$(railway domain 2>/dev/null || echo "")
        if [ -n "$RAILWAY_URL" ]; then
            print_success "Your app is available at: $RAILWAY_URL"
            print_status "Testing deployment..."
            sleep 10
            if curl -f "$RAILWAY_URL/health" &> /dev/null; then
                print_success "Deployment is healthy and responding!"
            else
                print_warning "Deployment may still be starting up. Check Railway dashboard."
            fi
        else
            print_warning "Could not retrieve deployment URL. Check Railway dashboard."
        fi
    else
        print_error "Deployment failed"
        return 1
    fi
}

# Set up environment variables
setup_env_vars() {
    print_status "Setting up environment variables..."

    # Check if a service is linked, if not create one
    if railway status | grep -q "Service: None"; then
        print_status "No service linked. Creating new service..."
        railway add --service whatsapp-business-api
        print_success "Service created and linked"
    fi

    if [ -f ".env" ]; then
        print_status "Found .env file. Setting variables in Railway..."

        # Read .env file and set variables (excluding comments and empty lines)
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
                railway variables --set "$key=$value"
            fi
        done < .env

        print_success "Environment variables set successfully"
    else
        print_warning "No .env file found. You'll need to set environment variables manually in Railway dashboard."
    fi
}

# Main deployment flow
main() {
    echo
    print_status "Starting deployment process..."
    echo

    # Pre-deployment checks
    check_railway_cli
    check_railway_auth

    # Environment setup
    if ! check_env_file; then
        print_error "Please configure your .env file before proceeding"
        exit 1
    fi

    # Optional Docker test
    read -p "Do you want to test the Docker build locally first? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! test_docker_build; then
            print_error "Docker test failed. Please fix issues before deploying."
            exit 1
        fi
    fi

    # Environment variables setup
    read -p "Do you want to set up environment variables from .env file? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        setup_env_vars
    fi

    # Deploy
    read -p "Ready to deploy to Railway? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        deploy_to_railway
    else
        print_status "Deployment cancelled by user"
        exit 0
    fi

    echo
    print_success "🎉 Deployment process completed!"
    echo
    print_status "Next steps:"
    echo "1. Check Railway dashboard for deployment status"
    echo "2. Test your API endpoints"
    echo "3. Configure custom domain if needed"
    echo "4. Set up monitoring and alerts"
    echo
    print_status "Useful commands:"
    echo "  railway logs          - View application logs"
    echo "  railway status        - Check deployment status"
    echo "  railway variables     - Manage environment variables"
    echo "  railway domain        - Manage custom domains"
    echo
}

# Run main function
main "$@"
