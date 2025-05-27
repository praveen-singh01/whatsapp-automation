# Railway Deployment Guide for WhatsApp Business API

This guide will help you deploy your WhatsApp Business application to Railway platform.

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository with your code
- WhatsApp Business API credentials
- MongoDB Atlas account (or Railway MongoDB addon)
- AWS S3 bucket for image storage

### 2. Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)
1. **Connect GitHub Repository**
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect the Dockerfile

#### Option B: Deploy using Railway CLI
1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

### 3. Configure Environment Variables

In your Railway project dashboard, add these environment variables:

#### Required Variables
```env
# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_business_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp_business

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name

# Domain Configuration
DOMAIN_URL=https://your-app-name.up.railway.app

# Application Settings
NODE_ENV=production
PORT=3000
```

#### Optional Variables
```env
# Token Management
WHATSAPP_TOKEN_REFRESH_INTERVAL=3600000
WHATSAPP_TOKEN_EXPIRY_BUFFER=300000

# File Upload Limits
MAX_FILE_SIZE=10485760

# Database Settings
DB_CONNECTION_TIMEOUT=30000
```

### 4. Database Setup

#### Option A: MongoDB Atlas (Recommended)
1. Create a MongoDB Atlas cluster
2. Get connection string
3. Add to `MONGODB_URI` environment variable

#### Option B: Railway MongoDB Addon
1. In Railway dashboard, go to your project
2. Click "Add Service" → "Database" → "MongoDB"
3. Railway will automatically set `MONGODB_URL`
4. Update your app to use `MONGODB_URL` instead of `MONGODB_URI`

### 5. AWS S3 Setup
1. Create an S3 bucket for image storage
2. Configure bucket policy for public read access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
3. Set up CORS configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

### 6. Custom Domain (Optional)
1. In Railway dashboard, go to Settings
2. Click "Domains"
3. Add your custom domain
4. Update `DOMAIN_URL` environment variable

## 🔧 Configuration Files

### Dockerfile
The included Dockerfile is optimized for Railway deployment with:
- Node.js 18 Alpine base image
- Sharp.js dependencies for image processing
- Security best practices (non-root user)
- Health check endpoint
- Production optimizations

### railway.toml
Configuration file for Railway-specific settings:
- Health check path: `/health`
- Restart policy: on failure
- Production environment

## 📊 Monitoring and Logs

### Health Check
Your app includes a comprehensive health check at `/health`:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "version": "2.0.0",
  "environment": "production",
  "mongodb": "connected"
}
```

### Viewing Logs
```bash
# Using Railway CLI
railway logs

# Or view in Railway dashboard
```

### Metrics
Railway provides built-in metrics for:
- CPU usage
- Memory usage
- Network traffic
- Response times

## 🚨 Troubleshooting

### Common Issues

1. **Port Binding Error**
   - Ensure your app listens on `process.env.PORT`
   - Current configuration: `app.listen(PORT, '0.0.0.0')`

2. **MongoDB Connection Issues**
   - Check `MONGODB_URI` format
   - Ensure IP whitelist includes Railway IPs (use 0.0.0.0/0 for simplicity)

3. **WhatsApp API Errors**
   - Verify token validity
   - Check business account ID
   - Ensure webhook URL is accessible

4. **Image Processing Errors**
   - Sharp.js dependencies are included in Dockerfile
   - Check S3 bucket permissions
   - Verify image URLs are accessible

### Debug Commands
```bash
# Check deployment status
railway status

# View environment variables
railway variables

# Connect to deployment shell
railway shell

# View recent deployments
railway deployments
```

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your connected GitHub branch:

1. **Automatic Deployments**
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   # Railway automatically deploys
   ```

2. **Manual Deployments**
   ```bash
   railway up
   ```

## 📱 Testing Your Deployment

1. **Health Check**
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```

2. **API Endpoints**
   ```bash
   # Get roles
   curl https://your-app-name.up.railway.app/api/roles
   
   # Get templates
   curl https://your-app-name.up.railway.app/api/templates
   
   # Get position options
   curl https://your-app-name.up.railway.app/api/position-options
   ```

3. **Send Test Message**
   ```bash
   curl -X POST https://your-app-name.up.railway.app/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "poster_url": "https://example.com/poster.png",
       "user_image_url": "https://example.com/user.png",
       "phone_number": "1234567890",
       "name": "Test User"
     }'
   ```

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] MongoDB connection working
- [ ] AWS S3 bucket accessible
- [ ] WhatsApp Business API credentials valid
- [ ] Health check endpoint responding
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Logs monitoring set up
- [ ] Backup strategy in place

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Test health check endpoint
4. Review MongoDB connection
5. Validate WhatsApp API credentials

Your WhatsApp Business API is now ready for production on Railway! 🚀
