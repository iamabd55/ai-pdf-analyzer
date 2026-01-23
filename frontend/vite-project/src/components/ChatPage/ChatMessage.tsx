import React from 'react';
import { User, Book, Search } from 'lucide-react';

interface Message {
    id: string;
    type: 'user' | 'ai';
    text: string;
    timestamp: string;
    isAnalyzing?: boolean;
}

interface ChatMessageProps {
    message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.type === 'user';

    return (
        <div className={`flex gap-3 md:gap-4 ${isUser ? 'max-w-[90%] md:max-w-4xl ml-auto flex-row-reverse' : 'max-w-[90%] md:max-w-4xl'}`}>
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                isUser ? 'bg-gray-200 text-gray-600' : 'bg-bg-primary text-white'
            }`}>
                {isUser ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Book className="w-4 h-4 md:w-5 md:h-5" />}
            </div>
            <div className={`flex flex-col gap-1.5 md:gap-2 ${isUser ? 'items-end' : ''}`}>
                <div className={`p-3.5 md:p-4 rounded-2xl shadow-sm text-sm md:text-[15px] ${
                    isUser
                        ? 'bg-[#e3efff] rounded-tr-none'
                        : 'bg-white border border-gray-100 rounded-tl-none'
                }`}>
                    {message.isAnalyzing ? (
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 italic">
                            <Search className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
                            Analyzing document...
                        </div>
                    ) : (
                        <div
                            className="ai-response-content"
                            dangerouslySetInnerHTML={{ __html: message.text }}
                        />
                    )}
                </div>
                <span className={`text-[9px] md:text-[10px] text-gray-400 font-medium ${isUser ? 'mr-1' : 'ml-1'}`}>
                    {message.timestamp}
                </span>
            </div>
        </div>
    );
};

export default ChatMessage;