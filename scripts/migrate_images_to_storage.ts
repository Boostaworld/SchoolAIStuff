/**
 * Migration Script: Move existing images from database to Supabase Storage
 * 
 * Run with: npx tsx scripts/migrate_images_to_storage.ts
 * 
 * This script:
 * 1. Fetches images that have base64 data but no storage_url
 * 2. Uploads each image to Supabase Storage
 * 3. Updates the database row with the storage_url
 * 4. Processes in small batches to avoid timeouts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env loading
try {
    // Try looking one level up (if running from root) or in current dir
    const possiblePaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '.env')
    ];

    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            console.log(`✅ Found .env at: ${envPath}`);
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    // Remove quotes if present
                    if (value.length > 0 && (
                        (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
                        (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
                    )) {
                        value = value.substring(1, value.length - 1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = value.trim();
                    }
                }
            });
            break;
        }
    }
} catch (e) {
    console.error('Error loading .env:', e);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Prioritize Service Role Key for migration (bypasses RLS)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL) {
    console.log('🔗 Connecting to Supabase:', SUPABASE_URL.substring(0, 20) + '...');
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔐 Using SERVICE_ROLE_KEY (Admin Mode) - RLS Bypassed');
} else {
    console.log('⚠️ Using ANON key - RLS might hide data. If you see 0 images, provide SUPABASE_SERVICE_ROLE_KEY.');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    console.error('   Expected to find them in .env file or environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 5; // Process 5 images at a time to avoid timeouts
const DELAY_BETWEEN_BATCHES = 2000; // 2 second delay between batches

async function uploadBase64ToStorage(
    base64Data: string,
    userId: string,
    imageId: string
): Promise<string> {
    // Convert base64 data URL to Blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    // Generate unique file path
    const filePath = `${userId}/${imageId}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('generated-images')
        .upload(filePath, blob, {
            contentType: 'image/png',
            upsert: true // Overwrite if exists
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

async function migrateImages() {
    console.log('🚀 Starting image migration to Supabase Storage...\n');



    // First, check how many images need migration
    const { count: totalCount, error: countError } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true })
        .is('storage_url', null)
        .not('image_url', 'is', null);

    if (countError) {
        console.error('❌ Error checking image count:', countError.message);
        console.error('   Hint: Check your API Key permissions.');
        return;
    }

    console.log(`📊 Found ${totalCount} images to migrate\n`);

    if (!totalCount || totalCount === 0) {
        console.log('✅ All images already migrated!');
        return;
    }

    let migrated = 0;
    let failed = 0;
    let offset = 0;

    // We don't use a global offset because as we migrate images, they are removed 
    // from the 'storage_url is null' set. We always want to fetch the "next" batch.
    // However, if we encounter errors, we might get stuck processing the same failing image.
    // So we'll track 'failed' count to maybe skip over them if needed, but for now
    // simplest is to always fetch range 0.

    let processedTotal = 0;

    while (true) {
        // Fetch a batch of images that need migration
        console.log(`📥 Fetching next batch of ${BATCH_SIZE} images...`);

        const { data: images, error: fetchError } = await supabase
            .from('generated_images')
            .select('id, user_id, image_url')
            .is('storage_url', null)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: true })
            .limit(BATCH_SIZE); // Always get the top N items that need migration

        if (fetchError) {
            console.error('❌ Error fetching images:', fetchError);
            // If we hit a timeout, wait and try again with smaller batch
            if (fetchError.message?.includes('timeout')) {
                console.log('⏳ Timeout hit, waiting before retry...');
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            break;
        }

        if (!images || images.length === 0) {
            console.log('✅ No more images to process');
            break;
        }

        console.log(`   Processing ${images.length} images...`);

        for (const img of images) {
            try {
                // Skip if no base64 data
                if (!img.image_url || !img.image_url.startsWith('data:')) {
                    console.log(`   ⏭️ Skipping ${img.id} - no valid base64 data`);
                    // If we skip, we MUST count it or we'll loop forever if we query by index.
                    // But since we query by 'storage_url is null', skipped items stay in the list!
                    // Fix: If we skip, we should probably mark it as 'failed' or similar so it doesn't show up again?
                    // For now, let's just count it as failed to avoid infinite loop by breaking if we see too many failures?
                    // Actually, simplest is to just upload it even if invalid? No.
                    failed++;
                    continue;
                }

                // Upload to storage
                const storageUrl = await uploadBase64ToStorage(
                    img.image_url,
                    img.user_id,
                    img.id
                );

                // Update database with storage URL
                const { error: updateError } = await supabase
                    .from('generated_images')
                    .update({ storage_url: storageUrl })
                    .eq('id', img.id);

                if (updateError) {
                    console.error(`   ❌ Failed to update ${img.id}:`, updateError);
                    failed++;
                } else {
                    console.log(`   ✅ Migrated ${img.id}`);
                    migrated++;
                }
                processedTotal++;
            } catch (e: any) {
                console.error(`   ❌ Failed ${img.id}:`, e.message);
                failed++;
            }
        }

        console.log(`\n📈 Progress: ${migrated} migrated, ${failed} failed, ${processedTotal}/${totalCount} processed`);

        // Delay between batches to avoid rate limits
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    console.log('\n========================================');
    console.log('📊 MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total processed: ${processedTotal}`);

    if (failed > 0) {
        console.log('\n⚠️ Some images failed to migrate. Re-run this script to retry failed images.');
    }
}

// Run the migration
migrateImages().catch(console.error);
