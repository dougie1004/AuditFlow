import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, RefreshCw, ShieldCheck } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: '### 👋 안녕하세요, AuditFlow AI입니다.\n\n9개 감사 영역의 **통제 환경**과 90개의 **테스트 시나리오 결과**를 분석했습니다.\n\n* **주요 위반 사항**에 대해 질문하거나\n* **감사 조서 초안 작성**을 요청하시면\n\n상세히 도와드리겠습니다.', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(input);
      const botMessage: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "AI 서비스 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Markdown Rendering Helpers ---

  const parseBold = (text: string) => {
    // Split by **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const MessageContent: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
    if (isUser) {
      return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    return (
      <div className="space-y-1 text-[15px]">
        {text.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-3" />; // Spacing for empty lines

          // Headers (###)
          if (trimmed.startsWith('###')) {
             return <h3 key={i} className="text-base font-bold text-slate-900 mt-4 mb-2">{parseBold(trimmed.replace(/^#+\s*/, ''))}</h3>;
          }

          // List items (* or -)
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
             const content = trimmed.replace(/^[\*\-]\s*/, '');
             return (
               <div key={i} className="flex items-start gap-3 ml-1">
                 <div className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                 <div className="leading-relaxed text-slate-700">{parseBold(content)}</div>
               </div>
             );
          }

          // Normal text
          return <div key={i} className="leading-relaxed text-slate-700">{parseBold(trimmed)}</div>;
        })}
      </div>
    );
  };

  // ----------------------------------

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight">AuditFlow AI Assistant</h2>
              <p className="text-slate-400 text-xs font-medium">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <button 
             onClick={() => setMessages([messages[0]])}
             className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
             title="대화 초기화"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-100 border border-blue-200' 
                  : 'bg-white border border-slate-200'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-blue-600" /> : <Bot className="w-5 h-5 text-indigo-600" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm relative ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <MessageContent text={msg.text} isUser={msg.role === 'user'} />
              </div>

            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3 ml-14">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-slate-400 text-xs font-medium">답변 생성 중...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="위반 사례의 원인 분석이나 감사 리포트 초안을 요청해보세요..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center mt-3 gap-6">
             <span className="text-[11px] text-slate-400 flex items-center gap-1">
               <ShieldCheck className="w-3 h-3" /> 내부 데이터 보호 중
             </span>
             <span className="text-[11px] text-slate-400">
               AI는 실수를 할 수 있습니다. 증빙을 확인하세요.
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;