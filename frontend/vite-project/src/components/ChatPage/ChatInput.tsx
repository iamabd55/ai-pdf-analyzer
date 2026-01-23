import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (input.trim() && !disabled) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-linear-to-t from-[#f8f9fc] via-[#f8f9fc]/95 to-transparent">
            <div className="max-w-full md:max-w-4xl mx-auto relative group">
                <div className="absolute inset-0 bg-bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg focus-within:border-bg-primary transition-all flex items-center p-1.5 md:p-2">
                    
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={disabled}
                        className="flex-1 border-none focus:ring-0 text-sm md:text-[15px] px-4 md:px-4 py-2 md:py-3 placeholder:text-gray-400 bg-transparent"
                        placeholder={disabled ? "Please wait..." : "Ask a question about your PDF..."}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || !input.trim()}
                        className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center shadow-md shadow-bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-[9px] md:text-[11px] text-gray-400 mt-2 md:mt-3">
                    DeepRead AI can make mistakes. Please verify important data.
                </p>
            </div>
        </div>
    );
};

export default ChatInput;