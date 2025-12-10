import { supabase } from './supabase';

// ====================================
// TYPES
// ====================================

export interface ImageFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  image_count: number;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  folder_id?: string;

  // Image Data
  image_url: string;
  thumbnail_url?: string;

  // Generation Parameters
  prompt: string;
  negative_prompt?: string;
  model: string;
  aspect_ratio: string;
  style: string;
  resolution: string;

  // Advanced Features
  web_search_used: boolean;
  thinking_enabled: boolean;
  thinking_process?: string;
  thought_images?: string[]; // JSON array of base64 images

  // Metadata
  created_at: string;
  is_favorite: boolean;
  tags: string[];
  notes?: string;

  // Stats
  download_count: number;
  view_count: number;
}

export interface CreateImageParams {
  image_url: string;
  prompt: string;
  negative_prompt?: string;
  model: string;
  aspect_ratio: string;
  style: string;
  resolution: string;
  web_search_used?: boolean;
  thinking_enabled?: boolean;
  thinking_process?: string;
  thought_images?: string[];
  folder_id?: string;
  tags?: string[];
}

export interface CreateFolderParams {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// ====================================
// FOLDER FUNCTIONS
// ====================================

/**
 * Get all folders for the current user
 */
export async function getFolders(): Promise<ImageFolder[]> {
  const { data, error } = await supabase
    .from('image_folders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching folders:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Create a new folder
 */
export async function createFolder(params: CreateFolderParams): Promise<ImageFolder> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('image_folders')
    .insert({
      user_id: user.id,
      name: params.name,
      description: params.description,
      color: params.color || '#06B6D4',
      icon: params.icon || '📁'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a folder
 */
export async function updateFolder(
  folderId: string,
  updates: Partial<CreateFolderParams>
): Promise<ImageFolder> {
  const { data, error } = await supabase
    .from('image_folders')
    .update(updates)
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a folder (images will be set to null folder_id)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase
    .from('image_folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
    throw new Error(error.message);
  }
}

// ====================================
// IMAGE FUNCTIONS
// ====================================

/**
 * Get all images for the current user, optionally filtered by folder
 */
export async function getImages(folderId?: string): Promise<GeneratedImage[]> {
  let query = supabase
    .from('generated_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (folderId !== undefined) {
    if (folderId === null || folderId === 'uncategorized') {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching images:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get a single image by ID
 */
export async function getImage(imageId: string): Promise<GeneratedImage> {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (error) {
    console.error('Error fetching image:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Save a newly generated image
 */
export async function saveImage(params: CreateImageParams): Promise<GeneratedImage> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      user_id: user.id,
      image_url: params.image_url,
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      model: params.model,
      aspect_ratio: params.aspect_ratio,
      style: params.style,
      resolution: params.resolution,
      web_search_used: params.web_search_used || false,
      thinking_enabled: params.thinking_enabled || false,
      thinking_process: params.thinking_process,
      thought_images: params.thought_images,
      folder_id: params.folder_id,
      tags: params.tags || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving image:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update an existing image
 */
export async function updateImage(
  imageId: string,
  updates: Partial<{
    folder_id: string | null;
    is_favorite: boolean;
    tags: string[];
    notes: string;
  }>
): Promise<GeneratedImage> {
  const { data, error } = await supabase
    .from('generated_images')
    .update(updates)
    .eq('id', imageId)
    .select()
    .single();

  if (error) {
    console.error('Error updating image:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('generated_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    console.error('Error deleting image:', error);
    throw new Error(error.message);
  }
}

/**
 * Move image to a different folder
 */
export async function moveImageToFolder(
  imageId: string,
  folderId: string | null
): Promise<GeneratedImage> {
  return updateImage(imageId, { folder_id: folderId });
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(imageId: string, isFavorite: boolean): Promise<GeneratedImage> {
  return updateImage(imageId, { is_favorite: isFavorite });
}

/**
 * Increment download count
 */
export async function incrementDownloadCount(imageId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_download_count', {
    image_id: imageId
  });

  if (error) {
    // Fallback to manual update if RPC doesn't exist
    const image = await getImage(imageId);
    await supabase
      .from('generated_images')
      .update({ download_count: image.download_count + 1 })
      .eq('id', imageId);
  }
}

/**
 * Increment view count
 */
export async function incrementViewCount(imageId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_view_count', {
    image_id: imageId
  });

  if (error) {
    // Fallback to manual update if RPC doesn't exist
    const image = await getImage(imageId);
    await supabase
      .from('generated_images')
      .update({ view_count: image.view_count + 1 })
      .eq('id', imageId);
  }
}

/**
 * Get images by tags
 */
export async function getImagesByTags(tags: string[]): Promise<GeneratedImage[]> {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .contains('tags', tags)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching images by tags:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get favorite images
 */
export async function getFavoriteImages(): Promise<GeneratedImage[]> {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('is_favorite', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite images:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Search images by prompt text
 */
export async function searchImages(searchTerm: string): Promise<GeneratedImage[]> {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .ilike('prompt', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching images:', error);
    throw new Error(error.message);
  }

  return data || [];
}
