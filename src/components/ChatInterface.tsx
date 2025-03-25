import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, X } from 'lucide-react';
import { useTableStore } from '../store/tableStore';

// 消息接口定义
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const SUGGESTION_CHIPS = [
  '设计一张现代风格的桌子',
  '我想要一张圆角桌子',
  '能做一张蓝色的桌子吗',
  '工业风格的桌子怎么样',
];

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { calculatePrice } = useTableStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 模拟消息状态
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '你好！我是你的桌子设计助手。我可以帮你个性化定制桌子。请告诉我你想要什么样的更改？',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 格式化价格显示
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  // 格式化时间显示
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // 添加消息的函数
  const addMessage = (message: { text: string; sender: 'user' | 'bot' }) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.text,
      sender: message.sender,
      timestamp: new Date()
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage({ text: input, sender: 'user' });
    // Simulate bot response
    setTimeout(() => {
      addMessage({
        text: "我已根据你的要求更新了桌子设计，你觉得怎么样？",
        sender: 'bot',
      });
    }, 1000);
    setInput('');
  };

  const clearInput = () => {
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white rounded shadow-lg border">
      <div className="px-6 py-4 border-b bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">桌子设计助手</h2>
        <p className="text-sm text-gray-500">随时向我询问有关桌子定制的问题</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 animate-fade-in ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.sender === 'bot' && (
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-[color:var(--primary-color)]" />
              </div>
            )}
            
            <div className="flex flex-col">
              <div
                className={`max-w-[85%] rounded p-3.5 shadow-sm message-bubble ${
                  message.sender === 'user'
                    ? 'bg-[color:var(--primary-color)] text-white'
                    : 'bg-white border'
                }`}
              >
                {message.text}
              </div>
              <span className="text-xs text-gray-500 mt-1 px-1">
                {formatTime(message.timestamp)}
              </span>
            </div>
            
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded bg-[color:var(--primary-color)] flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 价格显示区域 */}
      <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-b">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">当前价格</span>
          <span className="text-xl font-bold text-[color:var(--primary-color)]">{formatPrice(calculatePrice())}</span>
        </div>
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTION_CHIPS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="px-3.5 py-2 rounded bg-blue-50 text-sm text-[color:var(--primary-color)] hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的定制需求..."
              className="w-full px-4 py-3 rounded input-field shadow-sm pr-10"
            />
            {input && (
              <button
                type="button"
                onClick={clearInput}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 rounded bg-[color:var(--primary-color)] text-white hover:bg-[color:var(--primary-hover)] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}