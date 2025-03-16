import { useState } from 'react';
import { Send } from 'lucide-react';
import { useChairStore } from '../store/chairStore';

const SUGGESTION_CHIPS = [
  'Make the seat wider',
  'Increase backrest angle',
  'Change to metal material',
  'Make it taller',
];

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { messages, addMessage } = useChairStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage({ text: input, sender: 'user' });
    // Simulate bot response
    setTimeout(() => {
      addMessage({
        text: "I've updated the chair based on your request.",
        sender: 'bot',
      });
    }, 1000);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTION_CHIPS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your customization request..."
            className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}