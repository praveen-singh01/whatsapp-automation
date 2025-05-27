# WhatsApp Business Bulk Messaging API Specification

## Overview
This API specification provides comprehensive documentation for implementing a mobile interface for the WhatsApp Business bulk messaging system. The API supports role-based bulk messaging with MongoDB integration and comprehensive error handling.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints use WhatsApp Business API tokens configured in the server environment. No additional authentication is required from the client side.

---

## API Endpoints

### 1. Get Available User Roles

**Endpoint:** `GET /api/roles`

**Description:** Retrieves all available user roles from the MongoDB database for role selection in the mobile interface.

**Request:**
```http
GET /api/roles HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "value": "karyakarta",
        "label": "Karyakarta",
        "userCount": 5
      },
      {
        "value": "admin",
        "label": "Admin",
        "userCount": 3
      },
      {
        "value": "user",
        "label": "User",
        "userCount": 12
      },
      {
        "value": "manager",
        "label": "Manager",
        "userCount": 8
      }
    ],
    "totalUsers": 28
  },
  "message": "Roles retrieved successfully"
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Database connection error",
  "message": "Unable to connect to MongoDB database",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Send Bulk WhatsApp Messages

**Endpoint:** `POST /api/send-bulk-message`

**Description:** Sends personalized WhatsApp messages to all users with the specified role(s). Supports both template-based and custom message content.

**Request:**

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target_roles` | Array[String] | Yes | Array of user roles to target. Valid values: `["karyakarta", "admin", "user", "manager"]` |
| `message_content` | String | Yes | The message content to send (max 1000 characters) |
| `template_name` | String | No | WhatsApp template name (if using template) |
| `poster_image` | File | No | Image file for personalized poster (PNG/JPG, max 5MB) |
| `include_user_image` | Boolean | No | Whether to overlay user images on poster (default: false) |

**Example Request:**
```http
POST /api/send-bulk-message HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="target_roles"

["karyakarta", "admin"]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="message_content"

Hello! This is an important announcement for all team members.
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="template_name"

poster_template
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="poster_image"; filename="announcement.png"
Content-Type: image/png

[Binary image data]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="include_user_image"

true
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTargeted": 8,
      "successCount": 7,
      "failureCount": 1,
      "processingTimeMs": 15420
    },
    "results": [
      {
        "userId": "kary_001",
        "userName": "Rajesh Kumar",
        "userPhone": "97471063300",
        "userRole": "karyakarta",
        "status": "success",
        "messageId": "wamid.HBgNOTE3MTA2MzMwMBUCABIYFjNFQjBDMUQ2RkY4QzRFNTlBNzA5AA==",
        "deliveredAt": "2024-01-15T10:35:22.000Z",
        "personalizedImageUrl": "https://images.polimart.in/personalized/kary_001_poster_20240115103522.png"
      },
      {
        "userId": "kary_002",
        "userName": "Priya Sharma",
        "userPhone": "919170920772",
        "userRole": "karyakarta",
        "status": "success",
        "messageId": "wamid.HBgNOTE3MTA2MzMwMBUCABIYFjNFQjBDMUQ2RkY4QzRFNTlBNzA5BB==",
        "deliveredAt": "2024-01-15T10:35:25.000Z",
        "personalizedImageUrl": "https://images.polimart.in/personalized/kary_002_poster_20240115103525.png"
      },
      {
        "userId": "admin_001",
        "userName": "Admin User",
        "userPhone": "919876543210",
        "userRole": "admin",
        "status": "failed",
        "error": "Invalid phone number format",
        "errorCode": "INVALID_PHONE_NUMBER",
        "attemptedAt": "2024-01-15T10:35:28.000Z"
      }
    ],
    "targetedRoles": ["karyakarta", "admin"],
    "operationId": "bulk_op_20240115103520_abc123"
  },
  "message": "Bulk messaging completed with 7 successful deliveries out of 8 attempts"
}
```

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation Error",
  "details": {
    "target_roles": "At least one role must be specified",
    "message_content": "Message content is required and cannot exceed 1000 characters"
  },
  "message": "Invalid request parameters",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "WhatsApp API Error",
  "details": {
    "whatsappError": "Rate limit exceeded",
    "retryAfter": 300,
    "affectedUsers": ["user_001", "user_002"]
  },
  "message": "WhatsApp API rate limit exceeded. Please retry after 5 minutes.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 3. Get WhatsApp Templates

**Endpoint:** `GET /api/templates`

**Description:** Retrieves available WhatsApp Business message templates for template selection.

**Request:**
```http
GET /api/templates HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | Integer | No | Maximum number of templates to return (default: 100) |
| `status` | String | No | Filter by template status (`APPROVED`, `PENDING`, `REJECTED`) |

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_001",
        "name": "poster_template",
        "status": "APPROVED",
        "language": "en",
        "category": "MARKETING",
        "components": [
          {
            "type": "HEADER",
            "format": "IMAGE",
            "example": {
              "header_handle": ["https://example.com/image.png"]
            }
          },
          {
            "type": "BODY",
            "text": "Hello {{1}}, check out this announcement!",
            "example": {
              "body_text": [["John Doe"]]
            }
          }
        ],
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 100,
      "hasNext": false
    }
  },
  "message": "Templates retrieved successfully"
}
```

---

### 4. Message Delivery Status

**Endpoint:** `GET /api/message-status/{operationId}`

**Description:** Get detailed status of a bulk messaging operation.

**Request:**
```http
GET /api/message-status/bulk_op_20240115103520_abc123 HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "operationId": "bulk_op_20240115103520_abc123",
    "status": "completed",
    "summary": {
      "totalTargeted": 8,
      "successCount": 7,
      "failureCount": 1,
      "pendingCount": 0
    },
    "startedAt": "2024-01-15T10:35:20.000Z",
    "completedAt": "2024-01-15T10:35:45.000Z",
    "results": [
      {
        "userId": "kary_001",
        "status": "delivered",
        "messageId": "wamid.HBgNOTE3MTA2MzMwMBUCABIYFjNFQjBDMUQ2RkY4QzRFNTlBNzA5AA==",
        "deliveredAt": "2024-01-15T10:35:22.000Z",
        "readAt": "2024-01-15T10:36:15.000Z"
      }
    ]
  },
  "message": "Operation status retrieved successfully"
}
```

---

## Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |
| `INVALID_ROLE` | 400 | Invalid user role specified |
| `FILE_TOO_LARGE` | 400 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FILE_TYPE` | 400 | File type not supported |
| `NO_USERS_FOUND` | 404 | No users found for specified roles |
| `TEMPLATE_NOT_FOUND` | 404 | WhatsApp template not found |
| `WHATSAPP_API_ERROR` | 500 | WhatsApp Business API error |
| `DATABASE_ERROR` | 500 | MongoDB connection or query error |
| `S3_UPLOAD_ERROR` | 500 | AWS S3 file upload error |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |

---

## Android App Implementation Guide

### 1. Role Selection Interface

**Recommended UI Components:**
- Spinner/Dropdown for single role selection
- Multi-select CheckBox list for multiple roles
- Display user count for each role

**Implementation:**
```kotlin
// Fetch available roles
suspend fun fetchUserRoles(): ApiResponse<RolesData> {
    return apiService.getUserRoles()
}

// Role data class
data class Role(
    val value: String,
    val label: String,
    val userCount: Int
)
```

### 2. Message Composition

**UI Components:**
- EditText for message content with character counter (max 1000)
- Template selection dropdown (optional)
- Image picker for poster upload
- Toggle for user image overlay

### 3. Bulk Messaging Flow

**Recommended Implementation:**
```kotlin
// 1. Validate inputs
fun validateInputs(): Boolean {
    return selectedRoles.isNotEmpty() &&
           messageContent.isNotBlank() &&
           messageContent.length <= 1000
}

// 2. Show progress dialog
fun sendBulkMessage() {
    showProgressDialog("Sending messages...")

    // 3. Make API call
    viewModel.sendBulkMessage(
        targetRoles = selectedRoles,
        messageContent = messageContent,
        posterImage = selectedImage,
        includeUserImage = includeUserImageToggle
    )
}

// 4. Handle response
fun handleResponse(response: BulkMessageResponse) {
    hideProgressDialog()

    if (response.success) {
        showSuccessDialog(
            "Messages sent successfully!\n" +
            "Delivered: ${response.data.summary.successCount}\n" +
            "Failed: ${response.data.summary.failureCount}"
        )
    } else {
        showErrorDialog(response.message)
    }
}
```

### 4. Progress Tracking

**UI Components:**
- Progress bar for upload/processing
- Real-time status updates
- Detailed results view with success/failure breakdown

### 5. Error Handling

**Implementation Strategy:**
```kotlin
fun handleApiError(error: ApiError) {
    when (error.code) {
        "VALIDATION_ERROR" -> showValidationErrors(error.details)
        "RATE_LIMIT_EXCEEDED" -> showRetryDialog(error.retryAfter)
        "NO_USERS_FOUND" -> showNoUsersDialog()
        else -> showGenericErrorDialog(error.message)
    }
}
```

---

## Testing Information

**Test Phone Number:** 97471063300 (Whitelisted for testing)

**Test Roles Available:**
- `karyakarta` (5 users)
- `admin` (3 users)
- `user` (12 users)
- `manager` (8 users)

**Sample Test Data:**
The system includes 28 test users across all roles with valid phone numbers and profile images.

---

## Rate Limits

- **Bulk Messaging:** Maximum 50 messages per minute
- **Template Retrieval:** 100 requests per hour
- **File Upload:** Maximum 5MB per file
- **Message Content:** Maximum 1000 characters

---

## Support

For technical support or API questions, please refer to the main application documentation or contact the development team.

---

## Quick Start for Android Developers

### 1. Test the API

Run the comprehensive API test:
```bash
node test-enhanced-api.js
```

### 2. Basic Implementation Flow

```kotlin
// 1. Fetch available roles
val roles = apiService.getRoles()

// 2. Let user select roles and compose message
val selectedRoles = listOf("karyakarta", "admin")
val messageContent = "Hello! Important announcement."

// 3. Send bulk message
val response = apiService.sendBulkMessage(
    targetRoles = selectedRoles,
    messageContent = messageContent,
    posterImage = selectedImageFile,
    includeUserImage = true
)

// 4. Track delivery status
val operationId = response.data.operationId
val status = apiService.getMessageStatus(operationId)
```

### 3. Sample Android Network Layer

```kotlin
interface WhatsAppApiService {
    @GET("/api/roles")
    suspend fun getRoles(): ApiResponse<RolesData>

    @Multipart
    @POST("/api/send-bulk-message")
    suspend fun sendBulkMessage(
        @Part("target_roles") targetRoles: RequestBody,
        @Part("message_content") messageContent: RequestBody,
        @Part("template_name") templateName: RequestBody,
        @Part("include_user_image") includeUserImage: RequestBody,
        @Part posterImage: MultipartBody.Part?
    ): ApiResponse<BulkMessageResponse>

    @GET("/api/message-status/{operationId}")
    suspend fun getMessageStatus(
        @Path("operationId") operationId: String
    ): ApiResponse<MessageStatusResponse>

    @GET("/api/templates")
    suspend fun getTemplates(
        @Query("limit") limit: Int = 100,
        @Query("status") status: String? = null
    ): ApiResponse<TemplatesResponse>
}
```

---

## Implementation Status

✅ **Completed Features:**
- Role-based user targeting with MongoDB integration
- Enhanced bulk messaging with comprehensive tracking
- Operation status monitoring
- Template management
- File upload support for poster images
- Comprehensive error handling
- Backward compatibility with legacy endpoints

🔄 **Ready for Android Development:**
- All API endpoints implemented and tested
- Consistent JSON response format
- Detailed error codes and messages
- Operation tracking for delivery status
- File upload support for images

📱 **Android App Requirements Met:**
- Role selection dropdown data available
- Message composition with validation
- Bulk messaging with progress tracking
- Delivery status monitoring
- Error handling with user-friendly messages
