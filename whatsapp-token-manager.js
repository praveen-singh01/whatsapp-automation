const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

class WhatsAppTokenManager {
  constructor() {
    this.currentToken = process.env.WHATSAPP_TOKEN;
    this.appId = process.env.WHATSAPP_APP_ID;
    this.appSecret = process.env.WHATSAPP_APP_SECRET;
    this.systemUserId = process.env.WHATSAPP_SYSTEM_USER_ID;
    this.systemUserToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    this.tokenExpiryTime = null;
    this.refreshInterval = null;
    
    // Start automatic token validation
    this.startTokenMonitoring();
  }

  /**
   * Start monitoring token validity and auto-refresh
   */
  startTokenMonitoring() {
    console.log('🔄 Starting WhatsApp token monitoring...');
    
    // Check token validity every 30 minutes
    this.refreshInterval = setInterval(() => {
      this.validateAndRefreshToken();
    }, 30 * 60 * 1000); // 30 minutes
    
    // Initial validation
    this.validateAndRefreshToken();
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('⏹️ Stopped WhatsApp token monitoring');
    }
  }

  /**
   * Validate current token and refresh if needed
   */
  async validateAndRefreshToken() {
    try {
      console.log('🔍 Validating WhatsApp token...');
      
      const isValid = await this.validateCurrentToken();
      
      if (!isValid) {
        console.log('⚠️ Token is invalid or expired, attempting refresh...');
        await this.refreshToken();
      } else {
        console.log('✅ WhatsApp token is valid');
      }
    } catch (error) {
      console.error('❌ Error in token validation/refresh:', error.message);
    }
  }

  /**
   * Validate current token by making a test API call
   */
  async validateCurrentToken() {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${this.currentToken}`,
          },
          params: {
            limit: 1
          },
          timeout: 10000
        }
      );
      
      return response.status === 200;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return false; // Token is invalid
      }
      throw error; // Other errors should be thrown
    }
  }

  /**
   * Refresh the access token using system user token
   */
  async refreshToken() {
    try {
      console.log('🔄 Refreshing WhatsApp access token...');
      
      if (!this.systemUserToken) {
        throw new Error('System user token not configured');
      }

      // Method 1: Use system user token to generate new access token
      const response = await axios.post(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        null,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: this.systemUserToken
          },
          timeout: 15000
        }
      );

      if (response.data.access_token) {
        const newToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        
        console.log(`✅ New token obtained, expires in ${expiresIn} seconds`);
        
        // Update current token
        this.currentToken = newToken;
        this.tokenExpiryTime = Date.now() + (expiresIn * 1000);
        
        // Update environment variable
        process.env.WHATSAPP_TOKEN = newToken;
        
        // Update .env file
        await this.updateEnvFile(newToken);
        
        console.log('✅ Token refreshed successfully');
        return newToken;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      
      if (error.response) {
        console.error('📡 API Response:', error.response.data);
      }
      
      throw error;
    }
  }

  /**
   * Update .env file with new token
   */
  async updateEnvFile(newToken) {
    try {
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace the token line
      const tokenRegex = /WHATSAPP_TOKEN=.*/;
      envContent = envContent.replace(tokenRegex, `WHATSAPP_TOKEN=${newToken}`);
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env file with new token');
    } catch (error) {
      console.error('❌ Failed to update .env file:', error.message);
    }
  }

  /**
   * Get current valid token
   */
  async getCurrentToken() {
    // Check if token needs refresh
    if (this.tokenExpiryTime && Date.now() > this.tokenExpiryTime - 300000) { // 5 minutes before expiry
      console.log('⏰ Token expiring soon, refreshing...');
      await this.refreshToken();
    }
    
    return this.currentToken;
  }

  /**
   * Manual token refresh (for testing)
   */
  async forceRefresh() {
    console.log('🔄 Force refreshing token...');
    return await this.refreshToken();
  }

  /**
   * Get token status information
   */
  async getTokenStatus() {
    const isValid = await this.validateCurrentToken();
    
    return {
      isValid,
      currentToken: this.currentToken ? `${this.currentToken.substring(0, 20)}...` : 'Not set',
      expiryTime: this.tokenExpiryTime ? new Date(this.tokenExpiryTime).toISOString() : 'Unknown',
      timeUntilExpiry: this.tokenExpiryTime ? Math.max(0, this.tokenExpiryTime - Date.now()) : null
    };
  }
}

module.exports = WhatsAppTokenManager;
