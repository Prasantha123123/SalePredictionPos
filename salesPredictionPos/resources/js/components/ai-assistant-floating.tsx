import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Trash2, ArrowUpRight, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@inertiajs/react';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function AIAssistantFloating() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load: fetch history
    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const fetchHistory = async () => {
        try {
            const response = await fetch('/ai/history');
            const data = await response.json();
            if (data.status === 'success' && data.history.length > 0) {
                setMessages(data.history);
            } else {
                setMessages([
                    {
                        role: 'assistant',
                        content: "👋 Hi! Ask me anything about stock, tomorrow's sales forecasts, or how to operate this POS."
                    }
                ]);
            }
        } catch (e) {
            console.error('Error fetching chat history', e);
        }
    };

    const handleSendMessage = async (textToSend: string) => {
        if (!textToSend.trim() || loading) return;

        const userMsg = textToSend.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await fetch('/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await response.json();
            if (data.status === 'success') {
                setMessages(data.history);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '⚠️ Error getting AI response.' }
                ]);
            }
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '⚠️ Connection Error.' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!confirm('Clear chat history?')) return;
        try {
            await fetch('/ai/clear', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });
            setMessages([
                {
                    role: 'assistant',
                    content: "🧹 Conversation history cleared."
                }
            ]);
        } catch (e) {
            console.error('Error clearing chat history', e);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Expanded Chat Box */}
            {isOpen && (
                <div className="mb-4 w-[340px] sm:w-[380px] h-[480px] rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="size-4 animate-bounce" />
                            <div className="text-xs">
                                <p className="font-bold">Smart POS AI Agent</p>
                                <p className="text-[10px] opacity-80 leading-none mt-0.5">Online Helper</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button onClick={handleClearChat} variant="ghost" size="icon" className="size-7 text-white hover:bg-white/10 rounded-lg">
                                <Trash2 className="size-3.5" />
                            </Button>
                            <Link href="/ai-assistant" onClick={() => setIsOpen(false)} title="Full Page Mode" className="p-1.5 hover:bg-white/10 text-white rounded-lg">
                                <ArrowUpRight className="size-3.5" />
                            </Link>
                            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="size-7 text-white hover:bg-white/10 rounded-lg">
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-muted/10 text-xs">
                        {messages.map((msg, i) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div key={i} className={`flex gap-2 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                                    <div className={`p-3 rounded-2xl border leading-relaxed relative ${isUser
                                            ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                                            : 'bg-card text-foreground border-border/60 rounded-tl-none'
                                        }`}>
                                        <p className="whitespace-pre-line">{msg.content}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="flex gap-2 max-w-[80%] mr-auto">
                                <div className="p-3 bg-card border border-border/60 rounded-2xl rounded-tl-none text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles className="size-3 text-indigo-500 animate-spin" />
                                    <span>Compiling POS query...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input form footer */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage(input);
                        }}
                        className="p-2 border-t border-border/50 flex gap-1.5 bg-card"
                    >
                        <Input
                            type="text"
                            placeholder="Ask about stock, reports, forecasts..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 h-9 rounded-xl text-xs bg-muted/40"
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={loading || !input.trim()}
                            className="size-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                        >
                            <Send className="size-3.5" />
                        </Button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`size-12 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 shrink-0 ${isOpen
                        ? 'bg-rose-600 hover:bg-rose-500 rotate-90'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                    }`}
                title="Toggle Live AI Helper"
            >
                {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5 animate-pulse" />}
            </button>
        </div>
    );
}
