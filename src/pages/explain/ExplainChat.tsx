import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { renderSlideMarkdown } from '@/lib/markdownRenderer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, Home, Send } from 'lucide-react';
import { useExplain } from '@/hooks/useExplain';

export function ExplainChat() {
  const navigate = useNavigate();
  const {
    confirmedTopic,
    chatMessages,
    chatInput,
    setChatInput,
    chatStreaming,
    chatEndRef,
    sendChat,
  } = useExplain();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home" aria-label="Home" className="group hover:bg-transparent">
              <Home size={16} strokeWidth={1.75} className="group-hover:fill-current" />
            </Button>
            <span className="font-bold text-sm text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
              Discussion · {confirmedTopic}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/mock-test')}
              size="sm"
              className="px-3 py-1.5 text-xs"
            >
              <FlaskConical size={13} /> Take Test
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-foreground text-background rounded-br-md">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <Card className="max-w-[85%] px-4 py-3 text-sm rounded-bl-md">
                  <div
                    className="explanation-content slide-content"
                    dangerouslySetInnerHTML={{ __html: renderSlideMarkdown(msg.content) }}
                  />
                </Card>
              )}
            </div>
          ))}
          {chatStreaming && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <Card className="rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </Card>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
              }}
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-0 resize-none"
              rows={1}
              disabled={chatStreaming}
            />
            <Button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatStreaming}
              className="px-4 py-3 disabled:opacity-30"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}