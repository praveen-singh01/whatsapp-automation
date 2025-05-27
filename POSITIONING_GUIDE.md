# User Image Positioning Guide

## Overview
The WhatsApp Business application now supports flexible user image positioning on poster images. Users can choose from predefined positions or specify custom coordinates for precise control.

## Available Positioning Options

### 1. Preset Positioning
Use predefined positions for quick and consistent placement:

```json
{
  "preset": "center-left",
  "margin": 20
}
```

**Available Presets:**
- `top-left` - Top-left corner
- `top-center` - Top center
- `top-right` - Top-right corner
- `center-left` - Center-left (default)
- `center` - Center
- `center-right` - Center-right
- `bottom-left` - Bottom-left corner
- `bottom-center` - Bottom center
- `bottom-right` - Bottom-right corner

**Parameters:**
- `preset`: The position preset name
- `margin`: Distance from edges in pixels (default: 20)

### 2. Custom Positioning
Use pixel values or percentages for precise control:

```json
{
  "custom": {
    "top": "25%",
    "left": 100
  }
}
```

**Supported Values:**
- Pixel values: `100`, `250`, etc.
- Percentage values: `"25%"`, `"50%"`, etc.
- Mixed values: `{ "top": "50%", "left": 200 }`

### 3. Legacy Format (Backward Compatibility)
Direct top/left coordinates (maintained for backward compatibility):

```json
{
  "top": 100,
  "left": 50
}
```

## API Integration

### Get Available Position Options
```http
GET /api/position-options
```

**Response:**
```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "value": "center-left",
        "label": "Center Left",
        "description": "Position user image at center-left (default)"
      }
    ],
    "customOptions": {
      "description": "Use custom positioning with pixel values or percentages",
      "examples": [...]
    },
    "usage": {
      "preset": { "format": { "preset": "center-left", "margin": 20 } },
      "custom": { "format": { "custom": { "top": 100, "left": 50 } } },
      "legacy": { "format": { "top": 100, "left": 50 } }
    }
  }
}
```

### Using Positioning in Bulk Messaging

#### Enhanced API Endpoint
```http
POST /api/send-bulk-message
Content-Type: multipart/form-data

target_roles: ["karyakarta"]
message_content: "Hello everyone!"
include_user_image: true
user_image_position: {"preset": "top-right", "margin": 30}
poster_image: [file]
```

#### Legacy Endpoint
```http
POST /send-bulk-messages
Content-Type: multipart/form-data

target_role: karyakarta
user_image_position: {"custom": {"top": "25%", "left": "75%"}}
poster_image: [file]
```

#### Single Message Endpoint
```http
POST /send-message
Content-Type: application/json

{
  "poster_url": "https://example.com/poster.jpg",
  "user_image_url": "https://example.com/user.jpg",
  "phone_number": "1234567890",
  "name": "John Doe",
  "position": {
    "preset": "bottom-center",
    "margin": 25
  }
}
```

## Frontend Implementation

### 1. Fetch Position Options
```javascript
const response = await fetch('/api/position-options');
const { data } = await response.json();
const presets = data.presets;
```

### 2. Create Position Selector UI
```javascript
// Dropdown for preset positions
const presetSelect = presets.map(preset => ({
  value: preset.value,
  label: preset.label,
  description: preset.description
}));

// Custom position inputs
const customPosition = {
  top: "25%",    // or pixel value like 100
  left: "50%"    // or pixel value like 200
};
```

### 3. Send Positioning Data
```javascript
// For preset positioning
const positionData = {
  preset: selectedPreset,
  margin: marginValue
};

// For custom positioning
const positionData = {
  custom: {
    top: topValue,
    left: leftValue
  }
};

// Include in form data
formData.append('user_image_position', JSON.stringify(positionData));
```

## Android Implementation Example

### Kotlin Data Classes
```kotlin
data class PositionConfig(
    val preset: String? = null,
    val margin: Int? = null,
    val custom: CustomPosition? = null
)

data class CustomPosition(
    val top: Any, // Can be Int or String (for percentages)
    val left: Any
)
```

### UI Components
```kotlin
// Preset selector
Spinner presetSpinner = findViewById(R.id.preset_spinner);
SeekBar marginSeekBar = findViewById(R.id.margin_seekbar);

// Custom position inputs
EditText topInput = findViewById(R.id.top_input);
EditText leftInput = findViewById(R.id.left_input);
Switch percentageToggle = findViewById(R.id.percentage_toggle);
```

### API Call
```kotlin
val positionConfig = if (usePreset) {
    PositionConfig(preset = selectedPreset, margin = marginValue)
} else {
    PositionConfig(custom = CustomPosition(top = topValue, left = leftValue))
}

val requestBody = RequestBody.create(
    MediaType.parse("text/plain"),
    Gson().toJson(positionConfig)
)

apiService.sendBulkMessage(
    // ... other parameters
    userImagePosition = requestBody
)
```

## Testing

Run the positioning test script:
```bash
node test-positioning.js
```

This will test:
- Fetching position options
- Preview generation with different positions
- Validation of positioning formats

## Best Practices

1. **Default to preset positioning** for consistency
2. **Use custom positioning** for specific design requirements
3. **Validate position values** before sending to API
4. **Provide preview functionality** to show positioning results
5. **Handle edge cases** where images might overflow poster boundaries

## Error Handling

The system automatically:
- Validates position values
- Ensures images stay within poster boundaries
- Falls back to default positioning for invalid configurations
- Provides detailed error messages for debugging
