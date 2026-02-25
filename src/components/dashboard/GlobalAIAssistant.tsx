"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, Bot, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function GlobalAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([
      { role: "assistant", content: "Hello! I'm your Playbook AI Assistant. How can I help you with your assessments today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [...messages, userMsg] })
        });

        if (res.ok) {
            const data = await res.json();
            setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
        } else {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request." }]);
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
        setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
      setInput(suggestion);
  };


  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-transform duration-200 border-2 border-white/20 animate-in fade-in zoom-in duration-300"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:w-[400px] p-0 flex flex-col h-full border-l shadow-2xl z-50">
            <SheetHeader className="p-4 border-b bg-muted/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shrink-0">
                    <Bot className="h-6 w-6" />
                 </div>
                 <div className="text-left">
                   <SheetTitle className="text-lg">Playbook Assistant</SheetTitle>
                   <SheetDescription className="text-xs">Institutional Intelligence Layer</SheetDescription>
                 </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <Avatar className={cn("h-8 w-8 border shrink-0", msg.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground")}>
                     <AvatarFallback>{msg.role === "user" ? "ME" : <Bot className="h-4 w-4" />}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-white border rounded-bl-none text-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                  <div className="flex gap-3">
                      <Avatar className="h-8 w-8 border shrink-0 bg-primary text-primary-foreground">
                          <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="p-3 rounded-2xl bg-white border rounded-bl-none text-foreground flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                  </div>
              )}
            </div>

            <div className="p-4 bg-background border-t flex-shrink-0">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                {["Analyze latest quiz", "Draft feedback for Juma", "Check risk students"].map((suggestion, i) => (
                  <button
                    key={i}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border shrink-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask anything about your sessions..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="rounded-full bg-muted/30 focus-visible:ring-primary/20"
                  disabled={loading}
                />
                <Button size="icon" className="rounded-full shrink-0" onClick={handleSend} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
