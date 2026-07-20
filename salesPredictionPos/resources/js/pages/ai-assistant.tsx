import { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    Trash2,
    Copy,
    Download,
    Terminal,
    AlertCircle,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load: fetch history
    useEffect(() => {
        fetchHistory();
    }, []);

    // Auto scroll to bottom
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
                // Initialize with a welcome message if history is empty
                setMessages([
                    {
                        role: 'assistant',
                        content: "👋 **Welcome to the Smart POS AI Assistant!**\n\nI can retrieve store parameters, explain predictive ML charts, help create inventories, and query expiration reports. How can I help you operate the system today?"
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
                    { role: 'assistant', content: '⚠️ Error: Encountered issues getting response from AI service.' }
                ]);
            }
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '⚠️ Connection Error: Please verify backend server is online.' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!confirm('Are you sure you want to clear this conversation history?')) return;
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
                    content: "🧹 Conversation history cleared. Ask me anything about inventory, sales, or predictions!"
                }
            ]);
        } catch (e) {
            console.error('Error clearing chat history', e);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const exportConversation = () => {
        const text = messages.map(m => `[${m.role.toUpperCase()}]:\n${m.content}\n`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-assistant-conversation-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const suggestions = [
        "Today's Sales",
        "Low Stock Products",
        "What products expire soon?",
        "How does sales prediction work?",
        "RMSE definition",
        "Explain POS checkout"
    ];

    return (
        <AppLayout breadcrumbs={[{ title: 'AI Assistant', href: '/ai-assistant' }]}>
            <Head title="AI Operations Assistant - Smart POS" />

            <div className="flex flex-col h-[calc(100vh-8rem)] p-4 max-w-5xl mx-auto w-full">
                {/* Header Action Bar */}
                <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                            <Bot className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                <span>POS Operations Agent</span>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px] uppercase font-black">
                                    Online
                                </Badge>
                            </h2>
                            <p className="text-[10px] text-muted-foreground leading-none mt-1">
                                Generative POS assistance, metrics analysis, and reorder guides.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={exportConversation} variant="ghost" size="icon" title="Export conversation" className="size-9 rounded-xl">
                            <Download className="size-4" />
                        </Button>
                        <Button onClick={handleClearChat} variant="ghost" size="icon" title="Clear chat history" className="size-9 rounded-xl text-destructive hover:bg-destructive/10">
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4 min-h-0">
                    {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={index} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                    {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                                </div>
                                <div className="space-y-1">
                                    <div className={`p-4 rounded-2xl text-xs leading-relaxed border shadow-xs relative group ${
                                        isUser
                                            ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                                            : 'bg-card text-foreground border-border/60 rounded-tl-none'
                                    }`}>
                                        {/* Content formatted with basic custom markdown/newlines */}
                                        <div className="whitespace-pre-line prose prose-xs dark:prose-invert">
                                            {msg.content}
                                        </div>

                                        {/* Copy button */}
                                        <button
                                            onClick={() => copyToClipboard(msg.content, index)}
                                            className={`absolute -bottom-7 ${isUser ? 'right-2' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground`}
                                        >
                                            {copiedIndex === index ? (
                                                <>
                                                    <Check className="size-3 text-emerald-500" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="size-3" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="flex gap-3 max-w-[80%] mr-auto">
                            <div className="size-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Bot className="size-4 animate-bounce" />
                            </div>
                            <div className="bg-card text-foreground border border-border/60 p-4 rounded-2xl rounded-tl-none shadow-xs text-xs flex items-center gap-2">
                                <Sparkles className="size-3.5 text-indigo-500 animate-spin" />
                                <span className="text-muted-foreground font-medium">Assistant compiling context...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions / Quick action bubbles */}
                {messages.length <= 1 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {suggestions.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendMessage(sug)}
                                className="px-3 py-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted/60 text-[11px] font-bold text-foreground transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                                <Sparkles className="size-3 text-blue-500" />
                                <span>{sug}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Text input area */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(input);
                    }}
                    className="mt-4 flex gap-2"
                >
                    <Input
                        type="text"
                        placeholder="Ask me how to restock, query predictions, or operating guides..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 h-11 rounded-xl bg-card border-border/60 text-xs pl-4 shadow-xs"
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="size-3.5" />
                        <span>Send</span>
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
