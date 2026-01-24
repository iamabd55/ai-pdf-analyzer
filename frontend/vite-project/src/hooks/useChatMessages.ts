import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import supabase from '../utils/supabase';
import { formatAIResponse } from '../utils/formatAIResponse';

export interface Message {
    id: string;
    type: 'user' | 'ai';
    text: string;
    timestamp: string;
    isAnalyzing?: boolean;
}

interface UseChatMessagesProps {
    documentId: string;
}

export const useChatMessages = ({ documentId }: UseChatMessagesProps) => {
    const { user } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // 🔹 Load existing messages from Supabase on mount
    useEffect(() => {
        if (!documentId || !user) return;

        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('chats')  // ✅ Changed from 'chat_messages'
                    .select('*')
                    .eq('file_id', documentId)  // ✅ Changed from 'document_id'
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data.length === 0) {
                    // Initial greeting if no messages
                    setMessages([{
                        id: 'init',
                        type: 'ai',
                        text: "Hello! I'm ready to answer questions based on your document. Ask me anything from the PDF.",
                        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    }]);
                } else {
                    // Map Supabase messages to local Message type
                    const mapped: Message[] = data.map((msg: any) => ({
                        id: msg.id,
                        type: msg.role === 'assistant' ? 'ai' : 'user',  // ✅ Changed from msg.sender
                        text: msg.content,  // ✅ Changed from msg.message
                        timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    }));
                    setMessages(mapped);
                }
            } catch (err) {
                console.error('Failed to fetch chat messages:', err);
            }
        };

        fetchMessages();
    }, [documentId, user]);

    // 🔹 Send a new message
    const handleSendMessage = async (text: string) => {
        if (!user || !documentId) return;

        setIsProcessing(true);

        try {
            // 1️⃣ Add user message to Supabase
            const { data: userMsg, error: userError } = await supabase
                .from('chats')  // ✅ Changed from 'chat_messages'
                .insert([{ 
                    file_id: documentId,  // ✅ Changed from document_id
                    user_id: user.id, 
                    role: 'user',  // ✅ Changed from sender
                    content: text  // ✅ Changed from message
                }])
                .select('*')
                .single();

            if (userError) throw userError;

            const newUserMessage: Message = {
                id: userMsg.id,
                type: 'user',
                text: userMsg.content,  // ✅ Changed from userMsg.message
                timestamp: new Date(userMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, newUserMessage]);

            // 2️⃣ Call AI backend
            const response = await fetch('https://ai-pdf-analyzer-production.up.railway.app/ask-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: text, 
                    document_id: documentId,
                    user_id: user.id  // ✅ Pass user_id to backend
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const safeAnswer = typeof data.answer === 'string' && data.answer.trim()
                ? data.answer
                : "I couldn't find this information in the document.";

            // 3️⃣ Store AI message in Supabase
            const { data: aiMsg, error: aiError } = await supabase
                .from('chats')  // ✅ Changed from 'chat_messages'
                .insert([{ 
                    file_id: documentId,  // ✅ Changed from document_id
                    user_id: user.id, 
                    role: 'assistant',  // ✅ Changed from sender: 'ai'
                    content: formatAIResponse(  // ✅ Changed from message
                        safeAnswer
                    ) 
                }])
                .select('*')
                .single();

            if (aiError) throw aiError;

            const newAiMessage: Message = {
                id: aiMsg.id,
                type: 'ai',
                text: aiMsg.content,  // ✅ Changed from aiMsg.message
                timestamp: new Date(aiMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, newAiMessage]);

        } catch (err) {
            console.error('Error sending message:', err);

            const errorMessage: Message = {
                id: `err-${Date.now()}`,
                type: 'ai',
                text: 'Sorry, I encountered an error processing your question. Please try again.',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // 🔹 Clear chat locally (optional: could also delete from Supabase)
    const handleClearChat = () => {
        setMessages([{
            id: 'init',
            type: 'ai',
            text: "Hello! I'm ready to answer questions based on your document. Ask me anything from the PDF.",
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    return { messages, isProcessing, handleSendMessage, handleClearChat };
};
