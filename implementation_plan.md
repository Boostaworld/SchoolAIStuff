# Implementation Plan - Gemini 3.0 Integration & Profile Viewing

## Goal
Integrate Gemini 3.0 Pro Preview capabilities into the Intel Engine, including Thinking Mode, Image Analysis, and Image Generation. Enable profile viewing from the Horde Feed. Implement a "Prompt Improver" for all modes. Finally, create a global "Announcer" system for critical updates and news.

## User Review Required
> [!IMPORTANT]
> **Gemini 3.0 Access**: Ensure your API key has access to `gemini-3.0-pro-preview` and `gemini-3.0-pro-image-preview`. If not, these features will fail or fallback.
> **Image Upload**: We will use base64 encoding for image analysis for now, as `media.upload` requires a more complex backend setup or specific client configuration not fully visible here.

## Proposed Changes

### 1. Database (`sql`)

#### [NEW] [announcements.sql](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/sql/announcements.sql)
- **Table**: `announcements`
    - `id`: uuid (PK)
    - `title`: text
    - `simple_description`: text (for the banner)
    - `full_content`: text (markdown supported, for the modal)
    - `type`: 'update' | 'announcement' | 'alert'
    - `created_at`: timestamp
    - `is_active`: boolean (defaults to true)
    - `version`: string (e.g., "1.2.0")

### 2. AI Logic Layer (`lib/ai`)

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

#### [NEW] [promptImprover.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/lib/ai/promptImprover.ts)
- `improvePrompt(originalPrompt: string, mode: 'chat' | 'image' | 'vision', context?: string): Promise<string>`
- **Logic**:
    - **Web Search**: Query for "best prompt engineering practices for [mode] [context]".
    - **Refinement**:
        - **Vision**: Convert "Read this" -> "Analyze this image in detail, describing key elements, text, and visual style..."
        - **Image Gen**: Enhance descriptive terms (e.g., "Cyberpunk city" -> "Futuristic cyberpunk city, neon lights, rain-slicked streets, high detail, cinematic lighting...").
        - **Chat**: Structure the prompt for better reasoning or clarity based on the search results.

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

#### [MODIFY] [InputArea.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Intel/InputArea.tsx)
- Add "Magic Wand" / "Improve Prompt" button.
- On click:
    - Show loading state ("Refining prompt...").
    - Call `improvePrompt`.
    - Update input value with refined prompt.
    - Show toast/notification of what changed (optional).



### 3. Announcer System (`components/Announcer`)

#### [NEW] [AnnouncementBanner.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Announcer/AnnouncementBanner.tsx)
- **Visuals**:
    - Fixed top bar (dismissible).
    - Vivid gradient background (based on `type`).
    - Title + "View More" button + Close (X) icon.
- **Logic**:
    - Check `useOrbitStore` for `lastDismissedAnnouncementId`.
    - If `latestAnnouncement.id` != `lastDismissedId`, show banner.
    - On Close: Update `lastDismissedAnnouncementId`.
    - On "View More": Open `AnnouncementModal`.

#### [NEW] [AnnouncementModal.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Announcer/AnnouncementModal.tsx)
- **Visuals**:
    - Standard Orbit Modal design.
    - Pagination controls (< Prev | Next >) to browse historical updates.
    - Markdown rendering for `full_content`.
- **Logic**:
    - Fetch all active announcements (ordered by date).
    - Maintain `currentIndex` state.

### 4. Admin Integration (`components/Admin`)

#### [MODIFY] [GodModePanel.tsx](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/components/Admin/GodModePanel.tsx)
- Add "Announcements" tab.
- Form to create new announcement:
    - Title, Banner Description, Full Content (Markdown Editor), Type.
    - "Post Announcement" button.
- List active announcements (Edit/Delete).

### 5. Horde Feed (`components/Horde`)

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

5.  **Prompt Improver**:
    - **Vision Mode**:
        - Type "Read this".
        - Click "Improve Prompt".
        - Verify it changes to a detailed analysis prompt.
    - **Image Gen Mode**:
        - Type a simple noun (e.g., "Cat").
        - Click "Improve Prompt".
        - Verify it expands to a detailed description.
    - **General Chat**:
        - Type a question.
        - Click "Improve Prompt".
        - Verify it adds structure or context based on web search best practices.

6.  **Announcer System**:
    - **Admin**:
        - Create a new announcement ("Test Update 1.0").
        - Verify it appears in the list.
    - **User Experience**:
        - Refresh page. Verify Top Banner appears.
        - Click "View More". Verify Modal opens with details.
        - Close Modal. Click "X" on Banner.
        - Refresh page. Verify Banner does NOT reappear.
        - Clear LocalStorage (or reset persistence logic). Verify Banner reappears.
