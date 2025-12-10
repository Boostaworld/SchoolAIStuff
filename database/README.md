# 🎨 Image Generation Database Setup

This directory contains the SQL schema and setup instructions for the Synthesis Lab image generation and storage system.

## 📋 Prerequisites

- Supabase project with PostgreSQL database
- Database access credentials

## 🚀 Setup Instructions

### 1. Run the SQL Schema

Execute the schema file in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `image_generation_schema.sql`
5. Click **Run** to execute the schema

This will create:
- `image_folders` table for organizing images into collections
- `generated_images` table for storing all generated images with metadata
- Row Level Security (RLS) policies for data protection
- Database triggers for auto-updating folder counts

### 2. Verify the Tables

Run this query to verify the tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('image_folders', 'generated_images');
```

You should see both tables listed.

### 3. Test the Setup

Try creating a test folder:

```sql
INSERT INTO image_folders (user_id, name, description, color, icon)
VALUES (
  auth.uid(),
  'My First Collection',
  'Test folder for AI-generated images',
  '#06B6D4',
  '🎨'
)
RETURNING *;
```

## 📊 Database Schema Overview

### `image_folders` Table

Stores user-created folders/collections for organizing images.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| name | TEXT | Folder name (unique per user) |
| description | TEXT | Optional description |
| color | TEXT | Hex color for UI (default: #06B6D4) |
| icon | TEXT | Emoji icon (default: 📁) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| image_count | INTEGER | Auto-updated count of images |

### `generated_images` Table

Stores all AI-generated images with complete metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| folder_id | UUID | Optional folder reference |
| image_url | TEXT | Base64 data URL or storage URL |
| thumbnail_url | TEXT | Optional thumbnail |
| prompt | TEXT | Original generation prompt |
| negative_prompt | TEXT | Optional negative prompt |
| model | TEXT | Model used (gemini-3-image or gemini-2.5-flash-image) |
| aspect_ratio | TEXT | Image dimensions (1:1, 16:9, etc.) |
| style | TEXT | Artistic style applied |
| resolution | TEXT | Quality setting (1K-4K) |
| web_search_used | BOOLEAN | If web search was enabled |
| thinking_enabled | BOOLEAN | If thinking mode was enabled |
| thinking_process | TEXT | AI's reasoning text |
| thought_images | JSONB | Array of thought image URLs |
| created_at | TIMESTAMPTZ | Creation timestamp |
| is_favorite | BOOLEAN | Favorite flag |
| tags | TEXT[] | Searchable tags |
| notes | TEXT | User notes |
| download_count | INTEGER | Download counter |
| view_count | INTEGER | View counter |

## 🔒 Security

All tables have Row Level Security (RLS) enabled. Users can only:
- View their own folders and images
- Create new folders and images for themselves
- Update/delete only their own data

The policies are automatically enforced at the database level.

## 🔄 Auto-Updates

The database includes automatic triggers:

- **Folder Image Count**: Automatically updates when images are added/removed/moved
- **Updated Timestamps**: Auto-updates `updated_at` when folders are modified

## 💡 Usage in Code

The `lib/imageStorage.ts` module provides TypeScript functions for all database operations:

```typescript
// Folders
await getFolders()
await createFolder({ name: 'Portraits', icon: '👤' })
await deleteFolder(folderId)

// Images
await getImages() // All images
await getImages(folderId) // Images in specific folder
await saveImage({ image_url, prompt, model, ... })
await deleteImage(imageId)
await moveImageToFolder(imageId, folderId)
await toggleFavorite(imageId, true)
```

## 🎯 Features

✅ **Persistent Storage** - Images survive browser refresh
✅ **Folder Organization** - Create custom collections
✅ **Thinking Process Storage** - Save AI reasoning steps
✅ **Thought Images** - Store intermediate visual reasoning
✅ **Favorites** - Mark and filter favorite generations
✅ **Tags & Search** - Organize and find images easily
✅ **Download Tracking** - View statistics per image
✅ **Full Metadata** - Every generation parameter saved

## 🚨 Troubleshooting

### Tables Not Created

- Check you have database permissions in Supabase
- Verify you're running the SQL in the correct project
- Look for error messages in the SQL Editor

### RLS Errors

- Ensure you're authenticated when accessing images
- Check that `auth.uid()` returns a valid user ID
- Verify RLS policies are enabled on both tables

### Migration from Local State

Images previously stored only in React state will need to be regenerated. The new system automatically saves all new generations to the database.

## 📈 Future Enhancements

Planned features:
- Bulk image operations
- Folder sharing between users
- Public gallery mode
- Export/import collections
- Advanced search with filters
- Image versioning
