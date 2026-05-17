import React from 'react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
      <div className="chat-bubble-header">
        <span className="chat-bubble-avatar">{isUser ? '👤' : '🤖'}</span>
        <span className="chat-bubble-role">{isUser ? 'You' : 'AI Assistant'}</span>
        {message.created_at && (
          <span className="chat-bubble-time">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="chat-bubble-content">
        {message.content}
      </div>
    </div>
  );
}
