# Android Developer Implementation Guide
## WhatsApp Business Bulk Messaging API

### 🎯 Overview
This guide provides everything needed to implement the Android mobile interface for the WhatsApp Business bulk messaging system.

### 📋 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/roles` | GET | Get available user roles with counts |
| `/api/send-bulk-message` | POST | Send bulk messages with tracking |
| `/api/templates` | GET | Get WhatsApp Business templates |
| `/api/message-status/:id` | GET | Track message delivery status |

### 🚀 Quick Start

1. **Test the API endpoints:**
   ```bash
   node test-enhanced-api.js
   ```

2. **Start the server:**
   ```bash
   node app.js
   ```

3. **Base URL:** `http://localhost:3000`

### 📱 Android App Flow

#### 1. Role Selection Screen
```kotlin
// Fetch available roles
suspend fun loadRoles() {
    try {
        val response = apiService.getRoles()
        if (response.success) {
            roles.value = response.data.roles
            totalUsers.value = response.data.totalUsers
        }
    } catch (e: Exception) {
        handleError(e)
    }
}
```

#### 2. Message Composition Screen
```kotlin
data class MessageComposition(
    val selectedRoles: List<String>,
    val messageContent: String,
    val templateName: String = "poster_template",
    val includeUserImage: Boolean = false,
    val posterImage: File? = null
)

// Validation
fun validateMessage(): Boolean {
    return selectedRoles.isNotEmpty() && 
           messageContent.isNotBlank() && 
           messageContent.length <= 1000
}
```

#### 3. Send Bulk Message
```kotlin
suspend fun sendBulkMessage(composition: MessageComposition) {
    try {
        showProgress("Sending messages...")
        
        val response = apiService.sendBulkMessage(
            targetRoles = composition.selectedRoles.toRequestBody(),
            messageContent = composition.messageContent.toRequestBody(),
            templateName = composition.templateName.toRequestBody(),
            includeUserImage = composition.includeUserImage.toString().toRequestBody(),
            posterImage = composition.posterImage?.toMultipartBody()
        )
        
        if (response.success) {
            operationId = response.data.operationId
            showResults(response.data.summary)
            startStatusTracking()
        }
    } catch (e: Exception) {
        handleError(e)
    } finally {
        hideProgress()
    }
}
```

#### 4. Track Delivery Status
```kotlin
suspend fun trackDeliveryStatus(operationId: String) {
    try {
        val response = apiService.getMessageStatus(operationId)
        if (response.success) {
            updateStatusUI(response.data)
        }
    } catch (e: Exception) {
        handleError(e)
    }
}
```

### 🔧 Network Layer Implementation

#### Retrofit Service Interface
```kotlin
interface WhatsAppApiService {
    @GET("/api/roles")
    suspend fun getRoles(): Response<ApiResponse<RolesData>>
    
    @Multipart
    @POST("/api/send-bulk-message")
    suspend fun sendBulkMessage(
        @Part("target_roles") targetRoles: RequestBody,
        @Part("message_content") messageContent: RequestBody,
        @Part("template_name") templateName: RequestBody,
        @Part("include_user_image") includeUserImage: RequestBody,
        @Part posterImage: MultipartBody.Part?
    ): Response<ApiResponse<BulkMessageResponse>>
    
    @GET("/api/message-status/{operationId}")
    suspend fun getMessageStatus(
        @Path("operationId") operationId: String
    ): Response<ApiResponse<MessageStatusResponse>>
}
```

#### Data Classes
```kotlin
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String,
    val error: String? = null,
    val details: Map<String, String>? = null,
    val timestamp: String? = null
)

data class Role(
    val value: String,
    val label: String,
    val userCount: Int
)

data class RolesData(
    val roles: List<Role>,
    val totalUsers: Int
)

data class BulkMessageSummary(
    val totalTargeted: Int,
    val successCount: Int,
    val failureCount: Int,
    val processingTimeMs: Long
)

data class MessageResult(
    val userId: String,
    val userName: String,
    val userPhone: String,
    val userRole: String,
    val status: String,
    val messageId: String?,
    val error: String?,
    val errorCode: String?,
    val deliveredAt: String?,
    val personalizedImageUrl: String?
)

data class BulkMessageResponse(
    val summary: BulkMessageSummary,
    val results: List<MessageResult>,
    val targetedRoles: List<String>,
    val operationId: String
)
```

### 🎨 UI Components

#### 1. Role Selection
- Multi-select CheckBox list or Spinner
- Display user count for each role
- Show total users selected

#### 2. Message Composition
- EditText with character counter (max 1000)
- Image picker for poster upload
- Toggle for user image overlay
- Template selection (optional)

#### 3. Progress Tracking
- Progress dialog during sending
- Real-time status updates
- Results summary with success/failure counts

#### 4. Error Handling
```kotlin
fun handleApiError(error: ApiError) {
    when (error.code) {
        "VALIDATION_ERROR" -> showValidationDialog(error.details)
        "NO_USERS_FOUND" -> showNoUsersDialog()
        "RATE_LIMIT_EXCEEDED" -> showRetryDialog(error.retryAfter)
        "WHATSAPP_API_ERROR" -> showWhatsAppErrorDialog(error.message)
        else -> showGenericErrorDialog(error.message)
    }
}
```

### 📊 Testing Information

- **Test Phone:** 97471063300 (whitelisted)
- **Test Roles:** karyakarta (5), admin (3), user (12), manager (8)
- **Test Image:** Use `image.png` in project root
- **MongoDB:** 28 test users available

### 🔍 Validation Rules

- **Roles:** Must be from valid list: karyakarta, admin, user, manager
- **Message:** Required, max 1000 characters
- **Image:** PNG/JPG, max 5MB
- **Phone Numbers:** Must be whitelisted for testing

### 📈 Response Format

All endpoints return consistent JSON:
```json
{
  "success": true/false,
  "data": { ... },
  "message": "Description",
  "error": "Error type (if failed)",
  "details": { "field": "error message" },
  "timestamp": "ISO date string"
}
```

### 🚨 Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `VALIDATION_ERROR` | Invalid input | Show field errors |
| `NO_USERS_FOUND` | No users for roles | Show info dialog |
| `RATE_LIMIT_EXCEEDED` | API limit hit | Show retry timer |
| `WHATSAPP_API_ERROR` | WhatsApp issue | Show error message |
| `DATABASE_ERROR` | DB connection | Show retry option |

### 📞 Support

- **API Documentation:** `API_SPECIFICATION.md`
- **Test Script:** `node test-enhanced-api.js`
- **Server Logs:** Check console for detailed error information
