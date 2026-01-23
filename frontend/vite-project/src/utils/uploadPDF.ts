// src/helpers/uploadPDF.ts
import supabase from './supabase';

export const uploadPDF = async (file: File, userId: string) => {
  // Create unique filename with timestamp to avoid conflicts
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}_${file.name}`;
  const filePath = `${userId}/${uniqueFileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false // Don't overwrite existing files
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }

  // Save metadata in DB
  const { error: dbError, data: fileData } = await supabase
    .from('files')
    .insert([{ 
      user_id: userId, 
      file_name: file.name, // Keep original name for display
      storage_path: data.path 
    }])
    .select('*')
    .single();

  if (dbError) {
    console.error('Database insert error:', dbError);
    throw dbError;
  }

  return fileData; // contains id, file_name, storage_path
};