'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Terminal, Sparkles, MessageSquare } from 'lucide-react';

type ChatPanelProps = {
  projectId: string;
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
};

export function ChatPanel({ projectId, sendMessage, isStreaming }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const { messages } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;
    setInput('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border/40 bg-card/65 backdrop-blur-md shadow-2xl relative">
      {/* Small top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Blueprint AI Copilot
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 md:p-6">
        <div className="space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mb-2 shadow-inner">
                <Bot className="h-7 w-7 text-primary/60" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base">Let's scope your next product</h4>
                <p className="text-xs text-muted-foreground max-w-[250px] leading-relaxed font-light">
                  Tell me what you are building. I'll prompt you for core metrics, out of scope items, and technical limits.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={cn(
                'flex gap-3.5 items-start',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
                'animate-in fade-in slide-in-from-bottom-2 duration-300'
              )}
            >
              {msg.role === 'assistant' && (
                <Avatar className="h-8 w-8 shrink-0 rounded-lg shadow-sm border border-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold rounded-lg">
                    B
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed shadow-sm transition-all',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground font-light rounded-tr-none'
                    : 'bg-background/80 border border-border/30 text-foreground/90 font-light rounded-tl-none hover:bg-background/95 hover:border-border/50'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.role === 'user' && (
                <Avatar className="h-8 w-8 shrink-0 rounded-lg shadow-sm border border-border">
                  <AvatarFallback className="bg-secondary text-xs rounded-lg text-secondary-foreground font-semibold">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-3.5 items-start animate-pulse">
              <Avatar className="h-8 w-8 shrink-0 rounded-lg shadow-sm border border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold rounded-lg">
                  B
                </AvatarFallback>
              </Avatar>
              <div className="bg-background/70 border border-border/20 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div className="p-4 border-t border-border/40 bg-card/50 backdrop-blur-md">
        <div className="relative flex items-end gap-2 bg-background/60 border border-border/50 rounded-xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk with Blueprint Assistant..."
            className="flex-1 min-h-[40px] max-h-[140px] text-sm resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 placeholder:text-muted-foreground/40 leading-relaxed font-light scrollbar-none"
            rows={1}
          />
          <div className="shrink-0 flex items-center justify-center p-0.5">
            <Button 
              size="icon" 
              onClick={handleSubmit} 
              disabled={!input.trim() || isStreaming}
              className={cn(
                "h-8 w-8 rounded-lg shadow-md transition-all duration-300",
                input.trim() 
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 scale-100" 
                  : "bg-secondary text-muted-foreground/40 hover:bg-secondary cursor-not-allowed scale-95"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-muted-foreground font-light">
          <span className="flex items-center gap-1">
            <Terminal className="h-3 w-3 text-primary/70" />
            Press <kbd className="px-1 rounded bg-secondary/80 font-mono text-[9px] border">Enter</kbd> to send
          </span>
          <span>Phase 1 Scoping</span>
        </div>
      </div>
    </div>
  );
}
