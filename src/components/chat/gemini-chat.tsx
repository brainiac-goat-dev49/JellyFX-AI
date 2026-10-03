"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Zap,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Loader2,
  AlertCircle,
  Brain,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelUsed?: string;
  roleUsed?: string;
}

const AVAILABLE_MODELS = [
  {
    id: "gemini-3.1-flash-lite",
    label: "Fast Response",
    badge: "Lite",
    icon: Zap,
    description: "Ultra-low latency for quick answers and navigation",
  },
  {
    id: "gemini-3.5-flash",
    label: "General Assistant",
    badge: "Recommended",
    icon: Sparkles,
    description: "Versatile, balanced reasoning for daily wallet operations",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Complex Tasks",
    badge: "Pro",
    icon: Brain,
    description: "Deep quantitative analysis, audit & financial strategy",
  },
];

const AVAILABLE_ROLES = [
  {
    id: "financial-concierge",
    name: "Cap Financial Concierge",
    icon: ShieldCheck,
    tagline: "Platform guide & operations assistant",
  },
  {
    id: "market-analyst",
    name: "Wealth & Market Strategist",
    icon: TrendingUp,
    tagline: "Portfolio reasoning & risk modeling",
  },
  {
    id: "security-guardian",
    name: "Security & Recovery Guardian",
    icon: ShieldAlert,
    tagline: "Token protocols & cryptographic security",
  },
];

const SUGGESTED_PROMPTS = [
  "How does the Recovery Token safeguard my capital?",
  "Analyze deposit methods and best practices for CapWallet",
  "Provide a risk-weighted capital allocation model",
  "What should I do if I suspect unauthorized account access?",
];

const STORAGE_KEY = "capwallet_gemini_chat_history";

export function GeminiChat() {
  const user = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [selectedRole, setSelectedRole] = useState<string>("financial-concierge");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }

    // Default welcome message
    setMessages([
      {
        id: "welcome-1",
        role: "model",
        content: `👋 Hello **${user?.fullName || "there"}**! I am **Cap**, your AI Financial Concierge powered by **Gemini**.

I can assist you with:
- **Capital oversight**: Understanding deposits, transfers, and wallet balance.
- **Account security**: Explaining Recovery Tokens (CAP-XXXX-XXXX-XXXX) and cryptographic verification.
- **Financial planning**: Running scenario models and strategic portfolio allocation.

Select your preferred model and role above, or pick one of the suggestions below to get started!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: "gemini-3.5-flash",
        roleUsed: "financial-concierge",
      },
    ]);
  }, [user?.fullName]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isLoading) return;

    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      // Send conversation history to server-side API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          role: selectedRole,
          userContext: {
            fullName: user?.fullName,
            username: user?.username,
            country: user?.country,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI response.");
      }

      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed || selectedModel,
        roleUsed: data.roleUsed || selectedRole,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setErrorMessage(err.message || "An unexpected error occurred while communicating with Gemini.");
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "model",
        content: "Conversation history cleared. How may I assist your capital management today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: selectedModel,
        roleUsed: selectedRole,
      },
    ]);
    setErrorMessage(null);
  };

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const currentRoleInfo = AVAILABLE_ROLES.find((r) => r.id === selectedRole) || AVAILABLE_ROLES[0];
  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[1];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto p-2 sm:p-4 md:p-6 gap-4">
      {/* Top Header Card */}
      <Card className="border-border/60 shadow-sm shrink-0">
        <CardHeader className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow">
              <Bot className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg md:text-xl font-bold text-foreground">
                  CapWallet AI Assistant
                </CardTitle>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                  Gemini 3
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>Multi-turn intelligent agent for portfolio guidance & platform operations</span>
              </CardDescription>
            </div>
          </div>

          {/* Model and Role Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Selector */}
            <div className="w-full sm:w-auto">
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[210px] h-9 text-xs">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => {
                    const Icon = role.icon;
                    return (
                      <SelectItem key={role.id} value={role.id} className="text-xs py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-accent" />
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{role.name}</span>
                            <span className="text-[10px] text-muted-foreground">{role.tagline}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selector */}
            <div className="w-full sm:w-auto">
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs">
                  <SelectValue placeholder="Select Gemini model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => {
                    const Icon = model.icon;
                    return (
                      <SelectItem key={model.id} value={model.id} className="text-xs py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <div className="flex flex-col text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{model.label}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground uppercase font-mono">
                                {model.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{model.id}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Clear History Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
              onClick={handleClearHistory}
              title="Clear conversation"
              disabled={isLoading || messages.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Chat Thread Area */}
      <Card className="flex-1 flex flex-col min-h-0 border-border/60 shadow-sm overflow-hidden">
        {/* Scrollable message thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3 md:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8 md:h-9 md:md:w-9 border shrink-0 mt-0.5">
                  {isUser ? (
                    <>
                      <AvatarImage src={user?.photoURL || ""} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : "ME"}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-accent text-white font-bold text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Message Bubble */}
                <div
                  className={`flex flex-col max-w-[85%] md:max-w-[78%] ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender & Timestamp Info */}
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      {isUser ? user?.fullName || "You" : currentRoleInfo.name}
                    </span>
                    <span>•</span>
                    <span>{message.timestamp}</span>
                    {!isUser && message.modelUsed && (
                      <span className="text-[10px] bg-secondary/80 text-foreground/70 px-1.5 py-0.2 rounded font-mono">
                        {message.modelUsed}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative group ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-secondary/40 text-foreground border border-border/50 rounded-tl-none"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-2 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => (
                              <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                            ),
                            li: ({ children }) => <li className="my-0.5">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-primary dark:text-accent">
                                {children}
                              </strong>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-border/50">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-foreground text-background p-3 rounded-lg overflow-x-auto text-xs font-mono my-2">
                                {children}
                              </pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-accent pl-3 italic my-2 text-muted-foreground">
                                {children}
                              </blockquote>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full divide-y divide-border border border-border text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="px-3 py-1.5 bg-muted font-semibold text-left border-b border-border">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-1.5 border-b border-border/40">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Copy Button for Model Replies */}
                    {!isUser && (
                      <div className="mt-2 pt-1 border-t border-border/30 flex justify-end">
                        <button
                          onClick={() => copyToClipboard(message.id, message.content)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 md:gap-4 items-start">
              <Avatar className="h-8 w-8 md:h-9 md:w-9 border shrink-0 mt-0.5">
                <AvatarFallback className="bg-accent text-white font-bold text-xs">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary/40 border border-border/50 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-xs text-muted-foreground font-medium">
                  {currentModelInfo.label} ({selectedModel}) is thinking...
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-semibold text-destructive">Communication Issue</p>
                <p className="mt-0.5">{errorMessage}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => handleSendMessage()}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setErrorMessage(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pill Section (shown if less than 3 messages) */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-muted/30 border-t border-border/40">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Suggested queries:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(promptText)}
                  disabled={isLoading}
                  className="text-xs bg-card hover:bg-secondary/80 border border-border/70 rounded-full px-3 py-1 text-foreground/80 hover:text-foreground transition-colors text-left"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form Area */}
        <div className="p-3 sm:p-4 border-t border-border/60 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${currentRoleInfo.name}... (Press Enter to send, Shift+Enter for newline)`}
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-1.5 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-semibold">Send</span>
                </>
              )}
            </Button>
          </form>

          {/* Model info footnote */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" /> Active:{" "}
              <strong className="text-foreground">{currentModelInfo.label}</strong> (
              {selectedModel})
            </span>
            <span>Multi-turn chat • History preserved</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
