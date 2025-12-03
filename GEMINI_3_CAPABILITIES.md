# Gemini 3.0 Pro Preview Capabilities

This document outlines the capabilities of the Gemini 3.0 Pro Preview model and how to integrate them into the application.

## 1. Core Capabilities

Gemini 3.0 Pro Preview introduces several advanced features:
- **Thinking Mode**: Customizable reasoning depth for complex problem-solving.
- **High-Resolution Image Analysis**: Ability to analyze 4K images and understand fine details.
- **Image Generation**: Native image generation capabilities.
- **Media Upload**: Support for uploading files for analysis.

## 2. Thinking Mode

Thinking mode allows the model to spend more time reasoning before generating a response. This is useful for complex tasks requiring logic, math, or detailed analysis.

### Usage
```python
from google import genai
from google.genai import types

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents="How does AI work?",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="low") # Options: "low", "medium", "high"
    ),
)
print(response.text)
```

**Note**: Thinking mode might not be supported on all experimental models or in combination with certain other features.

## 3. Image Analysis (Vision)

Gemini 3.0 Pro Preview offers enhanced vision capabilities, including support for high-resolution images.

### Usage (v1alpha API)
```python
from google import genai
from google.genai import types
import base64

# The media_resolution parameter is currently only available in the v1alpha API version.
client = genai.Client(http_options={'api_version': 'v1alpha'})
response = client.models.generate_content(
    model="gemini-3-pro-preview",
    contents=[
        types.Content(
            parts=[
                types.Part(text="What is in this image?"),
                types.Part(
                    inline_data=types.Blob(
                        mime_type="image/jpeg",
                        data=base64.b64decode("..."),
                    ),
                    media_resolution={"level": "media_resolution_high"}
                )
            ]
        )
    ]
)
print(response.text)
```

## 4. Image Generation

The `gemini-3-pro-image-preview` model can generate high-quality images.

### Usage
```python
from google import genai
from google.genai import types

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Generate an infographic of the current weather in Tokyo.",
    config=types.GenerateContentConfig(
        tools=[{"google_search": {}}],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="4K"
        )
    )
)

# Saving the image
image_parts = [part for part in response.parts if part.inline_data]
if image_parts:
    image = image_parts[0].as_image()
    image.save('weather_tokyo.png')
    image.show()
```

## 5. File Upload (Media API)

For larger files or persistent usage, use the File API.

### Usage
```python
from google import genai

client = genai.Client()
myfile = client.files.upload(file="path/to/image.jpg")
print(f"{myfile=}")

result = client.models.generate_content(
    model="gemini-2.0-flash", # Or gemini-3-pro-preview
    contents=[
        myfile,
        "\n\n",
        "Can you tell me about the instruments in this photo?",
    ],
)
print(f"{result.text=}")
```

## 6. Integration Plan

### UI Changes
- **Settings Modal**: Add a modal to configure:
    - **Mode Toggle**: Chat Mode vs. Image Mode.
    - **Thinking Level**: Slider/Dropdown (Low, Medium, High) - *Only for supported models*.
    - **Model Selection**: Dropdown sorted by capability (e.g., Gemini 3.0 Pro, Gemini 2.0 Flash, etc.).
- **Image Upload**: Drag-and-drop or file picker for uploading images.
- **Profile Pictures**: Display user avatars in the feed with click-to-view/DM functionality.

### Logic Changes
- Update `IntelService` to handle different models and configurations.
- Implement `media.upload` logic for file handling.
- Add error handling for unsupported combinations (e.g., Thinking + Image Analysis if not supported).
