import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { Shop, Product, Customer } from '../../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  products: Product[];
  customers: Customer[];
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  shop,
  products,
  customers,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Namaste! I am your **Pandit Retail AI Co-Pilot**.
I can assist you with:
- Checking low-stock fireworks & festival restocking recommendations.
- Explaining Indian GST rates (18% for sparklers/fountains, 28% for rockets & aerial cakes).
- PESO safety & green cracker storage guidelines.
- Crafting polite WhatsApp payment reminders for Khata customers.

How may I assist you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const lowStockNames = products
    .filter((p) => p.stockQty <= p.lowStockThreshold && p.active)
    .map((p) => `${p.name} (${p.stockQty} left)`)
    .slice(0, 8);

  const contextData = {
    shopName: shop.name,
    gstin: shop.gstin,
    city: shop.city,
    totalProducts: products.length,
    lowStockItems: lowStockNames,
    totalCustomers: customers.length,
    totalKhataReceivables: customers.reduce((a, c) => a + c.khataBalance, 0),
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          contextData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.details || json.error || 'Gemini service unavailable.');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: json.reply || 'No response generated.' },
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error contacting retail intelligence service: ${err.message || 'Please check API connection.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl h-[620px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-600 rounded-xl text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">Pandit Retail AI Co-Pilot</h3>
                <span className="text-[10px] bg-slate-800 text-orange-400 font-mono px-2 py-0.5 rounded border border-slate-700">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Operational retail intelligence &amp; PESO fireworks safety
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
          <span className="text-slate-400 font-semibold uppercase text-[10px] shrink-0">
            Quick Ask:
          </span>
          <button
            onClick={() => handlePromptClick('Which fireworks are running low on stock and need urgent reordering?')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 whitespace-nowrap"
          >
            Check Low Stock
          </button>
          <button
            onClick={() => handlePromptClick('What are the key PESO safety regulations for storing fireworks in a retail shop?')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 whitespace-nowrap"
          >
            PESO Storage Rules
          </button>
          <button
            onClick={() => handlePromptClick('Give me a polite WhatsApp payment reminder message template for customer Khata debtors.')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 whitespace-nowrap"
          >
            Khata Payment Reminder
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                m.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-900 text-orange-400'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-xl p-3 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-orange-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 whitespace-pre-line'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              <span>Pandit Retail AI is analyzing shop records...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about stock, GST, fireworks safety, or sales tips..."
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-500 text-slate-900"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
