import supabase from './supabase';

export interface ChatMessage {
  id: string;
  document_id: string;
  user_id: string;
  sender: 'user' | 'ai';
  message: string;
  created_at: string;
}

// Fetch all messages for a document
export const fetchMessages = async (documentId: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ChatMessage[];
};

// Add a new message
export const addMessage = async (documentId: string, userId: string, sender: 'user' | 'ai', message: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ document_id: documentId, user_id: userId, sender, message }])
    .select('*')
    .single();

  if (error) throw error;
  return data as ChatMessage;
};
