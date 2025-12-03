# Implementation Plan - Gemini 3.0 Integration & Profile Viewing

## Goal
Integrate Gemini 3.0 Pro Preview capabilities into the Intel Engine, including Thinking Mode, Image Analysis, and Image Generation. Also, enable profile viewing from the Horde Feed.

## User Review Required
> [!IMPORTANT]
> **Gemini 3.0 Access**: Ensure your API key has access to `gemini-3.0-pro-preview` and `gemini-3.0-pro-image-preview`. If not, these features will fail or fallback.
> **Image Upload**: We will use base64 encoding for image analysis for now, as `media.upload` requires a more complex backend setup or specific client configuration not fully visible here.

## Proposed Changes

### 1. AI Logic Layer (`lib/ai`)

#### [MODIFY] [intel.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/lib/ai/intel.ts)
- Update `IntelQueryParams` to include:
    - `thinkingLevel`: 'low' | 'medium' | 'high'
    - `image`: string (base64 data)
    - `mode`: 'chat' | 'image' | 'generation'
- Update `runIntelQuery` to:
    - Map `gemini-3.0-pro-preview` and `gemini-3.0-pro-image-preview`.
    - Construct `thinkingConfig` based on `thinkingLevel`.
    - Handle image input in `contents`.
    - Handle image generation response processing.

#### [MODIFY] [IntelService.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/lib/ai/IntelService.ts)
- Update `IntelQueryOptions` to pass through new parameters.
- Update `sendIntelQueryWithPersistence` to handle the new options.

### 2. UI Components (`components/Intel`)

#### [MODIFY] [IntelPanel.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Intel/IntelPanel.tsx)
- **Command Deck Updates**:
    - Add **Mode Toggle**: Chat / Image Analysis / Image Generation.
    - Add **Model Selector**: Add "Gemini 3.0 Pro" and "Gemini 3.0 Image".
    - Add **Thinking Level**: Slider/Selector (Low, Medium, High) - visible only for supported models.
- **Input Area Updates**:
    - Add **Image Upload**: Button/Dropzone for image mode.
- **Logic**:
    - Handle file selection and conversion to base64.
    - Pass new state to `sendIntelQuery`.

### 3. Horde Feed (`components/Horde`)

#### [MODIFY] [HordeFeed.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Horde/HordeFeed.tsx)
- Add `fetchProfile` function to get full profile data from Supabase by `author_id`.
- Add `showProfileModal` state.
- Make avatar clickable to trigger fetch and show `ProfileModal`.

## Verification Plan

### Automated Tests
- None (Frontend/API integration).

### Manual Verification
1.  **Gemini 3.0 Chat**:
    - Open Intel Panel -> Settings.
    - Select "Gemini 3.0 Pro".
    - Set Thinking Level to "High".
    - Send a complex query (e.g., "Solve this riddle...").
    - Verify response indicates deep thinking (or check logs for model usage).
2.  **Image Analysis**:
    - Switch to "Image Mode".
    - Upload an image.
    - Ask "What is in this image?".
    - Verify accurate description.
3.  **Image Generation**:
    - Switch to "Image Generation Mode".
    - Prompt "Cyberpunk city".
    - Verify an image is generated and displayed.
4.  **Profile Viewing**:
    - Go to Horde Feed.
    - Click on a user's avatar.
    - Verify `ProfileModal` opens with their stats.
