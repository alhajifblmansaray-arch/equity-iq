import { FormEvent, useRef, useState, useEffect } from 'react';
import { AlertCircle, ArrowUp, Loader2, MessageSquare, Sparkles } from '../lib/icons';
import { research } from '../lib/api';
import { useAiJob } from '../contexts/AiJobsContext';
import type { ResearchReport } from '../types';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

export default function ThesisCard({ data }: { data: ResearchReport }) {
  // Thesis generation lives in the shared store (survives tab switches); the
  // follow-up chat stays local to this card.
  const { status, data: thesis, error, run } = useAiJob<{ text: string; model: string }>('thesis', data.ticker);
  const loading = status === 'loading';
  const text = thesis?.text ?? null;
  const model = thesis?.model ?? '';
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat]);

  function generate() {
    run(() => research.thesis(data.ticker).then((r) => ({ text: r.text, model: r.model })));
  }

  async function sendChat(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || chatBusy) return;
    const next: ChatTurn[] = [...chat, { role: 'user', content: q }, { role: 'assistant', content: '…', pending: true }];
    setChat(next);
    setInput('');
    setChatBusy(true);
    try {
      // Send the full history excluding the placeholder pending assistant turn
      const history = next
        .filter((m) => !m.pending)
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await research.chat(data.ticker, history);
      setChat((cur) => {
        const copy = [...cur];
        const lastIdx = copy.length - 1;
        copy[lastIdx] = { role: 'assistant', content: resp.reply };
        return copy;
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not get a reply.';
      setChat((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = { role: 'assistant', content: msg };
        return copy;
      });
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div
      className="rounded-3xl p-7 animate-fadeUp animate-delay-9"
      style={{ background: 'color-mix(in srgb, var(--amber) 8%, var(--surface))' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-amber" />
            <span className="eyebrow text-amber">AI thesis</span>
          </div>
          <h3 className="section-title">Read between the numbers</h3>
        </div>
        {!text && (
          <button onClick={generate} disabled={loading} className="btn-primary text-sm disabled:opacity-60">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Thinking…
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5" /> Generate
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div
          className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-3 mb-3"
          style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      {text ? (
        <>
          <div className="space-y-4 text-[15px] leading-relaxed text-ink whitespace-pre-line">
            {text}
          </div>

          {/* Chat thread */}
          {chat.length > 0 && (
            <div className="mt-6 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {chat.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                      turn.role === 'user'
                        ? 'text-cream'
                        : ''
                    }`}
                    style={
                      turn.role === 'user'
                        ? { background: 'var(--ink)' }
                        : { background: 'color-mix(in srgb, var(--amber) 12%, var(--surface))' }
                    }
                  >
                    {turn.pending ? (
                      <span className="inline-flex items-center gap-2 text-ink-tertiary">
                        <Loader2 size={13} className="animate-spin" /> Thinking…
                      </span>
                    ) : (
                      turn.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Chat input */}
          <form onSubmit={sendChat} className="mt-5">
            <div
              className="flex items-end gap-2 rounded-3xl p-1.5 pr-1.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
            >
              <MessageSquare size={15} className="text-ink-tertiary ml-3 mb-2.5 flex-shrink-0" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChat(e as any);
                  }
                }}
                placeholder={`Ask a follow-up about ${data.ticker}…`}
                rows={1}
                className="flex-1 bg-transparent resize-none py-2.5 px-1 text-[14px] leading-relaxed focus:outline-none min-h-[40px] max-h-32"
              />
              <button
                type="submit"
                disabled={chatBusy || !input.trim()}
                className="rounded-full w-9 h-9 flex items-center justify-center transition active:scale-95 disabled:opacity-40 flex-shrink-0"
                style={{ background: 'var(--ink)', color: 'var(--cream)' }}
                aria-label="Send"
              >
                {chatBusy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-tertiary mt-2 px-1">
              <span>Generated by {model || 'Claude'}.</span>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="hover:text-ink transition disabled:opacity-50"
              >
                {loading ? 'Regenerating…' : 'Regenerate thesis'}
              </button>
            </div>
          </form>
        </>
      ) : !error && !loading ? (
        <p className="text-ink-secondary text-[15px] leading-relaxed">
          Press <strong>Generate</strong> to get a plain-English three-paragraph thesis - and then ask
          follow-up questions in plain English. The model has the full report as context.
        </p>
      ) : null}
    </div>
  );
}
