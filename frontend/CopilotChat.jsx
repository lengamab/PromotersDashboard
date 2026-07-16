import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// NOTE: Hardcoding the API key as it was previously hardcoded in the server.js
// Since this is an internal dashboard, we keep it here to avoid .env complexities on the client.
const API_KEY = 'AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `You are an elite digital marketing analyst for La French Barcelona. 
CRITICAL CONTEXT & RULES: 
1. The Meta Pixel is unreliable and often fails to track real purchases. You must ALWAYS cross-reference Meta Ads spend with Fourvenues ticket sales to estimate true offline ROAS.
2. STRICT ATTRIBUTION: Do NOT mistakenly attribute sales from other human promoters (e.g., "Jules" or anyone else) to Meta Ads. ONLY attribute Fourvenues sales to Meta if they have the "La French Ads" promoter tag or are explicitly "Direct Sales" (no promoter).
3. EVENT MATCHING: Always look at the "Dest Link" for the ads to identify which specific event the campaign is driving traffic to. Do NOT mix up sales for the Boat Party with a Fan Zone event, for example.
4. Event Pricing: Do NOT base your analysis on assumed averages if you can avoid it. Use the fetchFourvenuesEvents tool to pull the actual revenue and tickets sold for specific events to calculate precise ROAS. 
5. Ticket Prices: If you need to know the price of a ticket (e.g. for the Boat Party), DO NOT guess or hallucinate. Use the fetchFourvenuesTicketPrices tool to see the exact ticket prices (rates) configured in Fourvenues (e.g., 59€).
6. FORMATTING: Do NOT use LaTeX math formatting like $\rightarrow$ or \\rightarrow. Use standard text arrows like -> instead.

INSTRUCTIONS: 
- Use the provided context data and available tools to answer questions accurately and concisely.
- Do not trust Meta's "Purchases" metric alone; use Fourvenues revenue data to calculate real profitability.
- Always be highly actionable (e.g., recommend bid caps based on actual event margins).`;

const fetchCampaignHistoricalDataHandler = async ({ campaignId, since, until }) => {
  try {
    const token = window.META_ACCESS_TOKEN;
    if (!token) return { error: "Meta Access Token not found." };
    
    // Default to last 30 days if no dates provided
    let fromDate = since;
    let toDate = until;
    if (!fromDate || !toDate) {
      const today = new Date();
      const last30 = new Date();
      last30.setDate(today.getDate() - 30);
      fromDate = fromDate || last30.toISOString().split('T')[0];
      toDate = toDate || today.toISOString().split('T')[0];
    }

    const params = new URLSearchParams({
        access_token: token,
        level: 'campaign',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1,
        limit: 100,
        fields: 'spend,impressions,clicks,actions'
    });

    const response = await fetch(`https://graph.facebook.com/v20.0/${campaignId}/insights?${params.toString()}`);
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    
    // Clean up response for the LLM to save tokens
    if (data.data) {
      return data.data.map(d => ({
        date: d.date_start,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        purchases: d.actions ? d.actions.filter(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase').map(a => a.value).join(',') : 0
      }));
    }
    return data;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchAccountHistoricalDataHandler = async ({ since, until }) => {
  try {
    const token = window.META_ACCESS_TOKEN;
    const accountId = window.META_ACCOUNT_ID;
    if (!token || !accountId) return { error: "Meta API credentials not found." };
    
    // Default to last 30 days if no dates provided
    let fromDate = since;
    let toDate = until;
    if (!fromDate || !toDate) {
      const today = new Date();
      const last30 = new Date();
      last30.setDate(today.getDate() - 30);
      fromDate = fromDate || last30.toISOString().split('T')[0];
      toDate = toDate || today.toISOString().split('T')[0];
    }

    const params = new URLSearchParams({
        access_token: token,
        level: 'account',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1,
        limit: 100,
        fields: 'spend,impressions,clicks,actions'
    });

    const response = await fetch(`https://graph.facebook.com/v20.0/${accountId}/insights?${params.toString()}`);
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    
    // Clean up response for the LLM to save tokens
    if (data.data) {
      return data.data.map(d => ({
        date: d.date_start,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        purchases: d.actions ? d.actions.filter(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase').map(a => a.value).join(',') : 0
      }));
    }
    return data;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchCampaignBudgetHandler = async ({ campaignId }) => {
  try {
    const token = window.META_ACCESS_TOKEN;
    if (!token) return { error: "Meta Access Token not found." };
    const response = await fetch(`https://graph.facebook.com/v20.0/${campaignId}?fields=name,daily_budget,lifetime_budget&access_token=${token}`);
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    return data;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchActiveCampaignsHandler = async () => {
  try {
    const token = window.META_ACCESS_TOKEN;
    const accountId = window.META_ACCOUNT_ID;
    if (!token || !accountId) return { error: "Meta API credentials not found." };
    const res = await fetch(`https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=name,status,daily_budget,lifetime_budget&effective_status=['ACTIVE']&access_token=${token}`);
    const data = await res.json();
    if (data.error) return { error: data.error.message };
    return data.data.map(c => ({
        id: c.id, name: c.name,
        daily_budget: c.daily_budget ? (parseInt(c.daily_budget)/100) : null,
        lifetime_budget: c.lifetime_budget ? (parseInt(c.lifetime_budget)/100) : null
    }));
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesPerformanceHandler = async () => {
  try {
    const res = await fetch('/api/performance');
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesWalletHandler = async () => {
  try {
    const res = await fetch('/api/wallet');
    const data = await res.json();
    return data.success ? data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchPromoterProfileHandler = async ({ promoterId }) => {
  try {
    const res = await fetch(`/api/promoter/${promoterId}`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesEventsHandler = async ({ since, until }) => {
  try {
    const params = new URLSearchParams();
    if (since) params.append('start', since);
    if (until) params.append('end', until);
    const res = await fetch(`/api/events/performance?${params.toString()}`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesTicketPricesHandler = async () => {
  try {
    const res = await fetch(`/api/rates`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "fetchCampaignBudget",
        description: "Fetch the live daily and lifetime budget for a specific Meta Ads campaign.",
        parameters: {
          type: "OBJECT",
          properties: {
            campaignId: { type: "STRING", description: "The ID of the campaign to fetch the budget for." }
          },
          required: ["campaignId"]
        }
      },
      {
        name: "fetchActiveCampaigns",
        description: "Fetch all active Meta Ads campaigns for the account.",
      },
      {
        name: "fetchCampaignHistoricalData",
        description: "Fetch daily historical insights (spend, impressions, clicks, purchases) for a specific campaign over a time period.",
        parameters: {
          type: "OBJECT",
          properties: {
            campaignId: { type: "STRING", description: "The ID of the campaign." },
            since: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional, defaults to last 30 days)." },
            until: { type: "STRING", description: "End date in YYYY-MM-DD format (optional, defaults to today)." }
          },
          required: ["campaignId"]
        }
      },
      {
        name: "fetchAccountHistoricalData",
        description: "Fetch day-by-day historical insights (spend, impressions, clicks, purchases) for the ENTIRE Meta Ads account over a time period.",
        parameters: {
          type: "OBJECT",
          properties: {
            since: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional, defaults to last 30 days)." },
            until: { type: "STRING", description: "End date in YYYY-MM-DD format (optional, defaults to today)." }
          }
        }
      },
      {
        name: "fetchFourvenuesEvents",
        description: "Fetch a list of all Fourvenues events within a time period, including their total tickets sold, revenue, and attendance.",
        parameters: {
          type: "OBJECT",
          properties: {
            since: { type: "STRING", description: "Start date in YYYY-MM-DD format." },
            until: { type: "STRING", description: "End date in YYYY-MM-DD format." }
          }
        }
      },
      {
        name: "fetchFourvenuesTicketPrices",
        description: "Fetch a list of all available ticket types (rates) and their exact prices for all upcoming Fourvenues events. Use this to find the true price of an event instead of guessing.",
      },
      {
        name: "fetchFourvenuesPerformance",
        description: "Fetch overall promoter performance (PR lists, tickets sold, revenue) from Fourvenues.",
      },
      {
        name: "fetchFourvenuesWallet",
        description: "Fetch the current wallet balance from Fourvenues.",
      },
      {
        name: "fetchPromoterProfile",
        description: "Fetch specific data about a single promoter by their ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            promoterId: { type: "STRING", description: "The ID of the promoter." }
          },
          required: ["promoterId"]
        }
      }
    ]
  }
];

const dispatchToolCall = async (call) => {
  if (call.name === 'fetchCampaignBudget') return await fetchCampaignBudgetHandler(call.args);
  if (call.name === 'fetchCampaignHistoricalData') return await fetchCampaignHistoricalDataHandler(call.args);
  if (call.name === 'fetchAccountHistoricalData') return await fetchAccountHistoricalDataHandler(call.args);
  if (call.name === 'fetchActiveCampaigns') return await fetchActiveCampaignsHandler();
  if (call.name === 'fetchFourvenuesEvents') return await fetchFourvenuesEventsHandler(call.args);
  if (call.name === 'fetchFourvenuesTicketPrices') return await fetchFourvenuesTicketPricesHandler();
  if (call.name === 'fetchFourvenuesPerformance') return await fetchFourvenuesPerformanceHandler();
  if (call.name === 'fetchFourvenuesWallet') return await fetchFourvenuesWalletHandler();
  if (call.name === 'fetchPromoterProfile') return await fetchPromoterProfileHandler(call.args);
  return { error: `Unknown tool: ${call.name}` };
};

const CopilotChatWidget = () => {
  const [contextData, setContextData] = useState("No data selected yet.");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', parts: [{ text: "Hello! Click 'Analyze Campaign' or ask me a question about your ads." }] }]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const chatSessionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    window.updateCopilotContext = (data, customPrompt) => {
      setContextData(data);
      setIsOpen(true);
      if (customPrompt) {
        setTimeout(() => sendMessage(customPrompt, data), 300);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text, activeContext = contextData) => {
    if (!text.trim()) return;
    
    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', parts: [{ text }] }]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Re-initialize model session with latest context to ensure the AI has the most recent dashboard data
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nCURRENT DASHBOARD CONTEXT DATA:\n${activeContext}`,
        tools: tools
      });
      // We manually construct history from our state to allow fresh system instruction overrides
      const history = messages.slice(1).map(m => ({
          role: m.role,
          parts: m.parts
      }));
      chatSessionRef.current = model.startChat({ history });

      let result = await chatSessionRef.current.sendMessage(text);
      
      // Handle tool calls recursively
      let calls = typeof result.response.functionCalls === 'function' ? result.response.functionCalls() : result.response.functionCalls;
      while (calls && calls.length > 0) {
        const functionResponses = [];
        
        for (const call of calls) {
          const apiResponse = await dispatchToolCall(call);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: apiResponse },
              id: call.id
            }
          });
        }
        
        // Send tool results back
        result = await chatSessionRef.current.sendMessage(functionResponses);
        calls = typeof result.response.functionCalls === 'function' ? result.response.functionCalls() : result.response.functionCalls;
      }

      let finalResponseText = "";
      try {
        finalResponseText = result.response.text();
      } catch (e) {
        console.warn("Failed to get text from response, maybe blocked or empty?", e);
        // Sometimes text() throws if the response was blocked by safety or had no text parts
        const candidate = result.response.candidates?.[0];
        if (candidate && candidate.finishReason !== 'STOP') {
          finalResponseText = `*Notice: Response stopped due to ${candidate.finishReason}*`;
        } else {
          finalResponseText = "*Notice: The model returned an empty or invalid text response.*";
        }
      }

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: finalResponseText || "*Warning: Empty response received.*" }] }]);
    } catch (err) {
      console.error(err);
      const errorMsg = (err && err.message) ? err.message : String(err);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: `*Error:* ${errorMsg}` }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div style={{ position: 'fixed', zIndex: 999999, left: 0, top: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            .ai-message-bubble {
              background: #1a1b26;
              border: 1px solid var(--border-color);
              border-radius: 12px;
              padding: 12px 16px;
              margin-bottom: 16px;
              color: var(--text-color);
            }
            .ai-message-bubble p { margin-top: 0; margin-bottom: 10px; }
            .ai-message-bubble p:last-child { margin-bottom: 0; }
            .ai-message-bubble h1, .ai-message-bubble h2, .ai-message-bubble h3 { color: var(--color-primary); margin-top: 15px; margin-bottom: 10px; font-size: 1.1em;}
            .ai-message-bubble h1 { font-size: 1.3em; }
            .ai-message-bubble strong { color: #fff; }
            .user-message-bubble {
              background: var(--color-primary);
              color: white;
              border-radius: 12px;
              padding: 10px 16px;
              margin-bottom: 16px;
              align-self: flex-end;
              max-width: 85%;
            }
            .chat-input {
              width: 100%;
              background: #1a1b26;
              border: 1px solid var(--border-color);
              border-radius: 20px;
              padding: 12px 20px;
              color: white;
              outline: none;
              font-family: inherit;
              font-size: 1rem;
            }
            .chat-input:focus {
              border-color: var(--color-primary);
            }
            .send-btn {
              position: absolute;
              right: 10px;
              top: 50%;
              transform: translateY(-50%);
              background: var(--color-primary);
              color: white;
              border: none;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
            .send-btn:hover { background: #6b43d1; }
            .send-btn:disabled { background: #333; cursor: not-allowed; }
            .loading-dots:after {
              content: '.';
              animation: dots 1.5s steps(5, end) infinite;
            }
            @keyframes dots { 0%, 20% { color: rgba(0,0,0,0); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0);} 40% { color: white; text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0);} 60% { text-shadow: .25em 0 0 white, .5em 0 0 rgba(0,0,0,0);} 80%, 100% { text-shadow: .25em 0 0 white, .5em 0 0 white;}}
            
            .ai-message-bubble table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1rem;
              font-size: 0.9em;
            }
            .ai-message-bubble th, .ai-message-bubble td {
              border: 1px solid var(--border-color);
              padding: 8px;
              text-align: left;
            }
            .ai-message-bubble th {
              background-color: rgba(255, 255, 255, 0.1);
              font-weight: bold;
            }
          `}</style>
          
          <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', width: '90%', maxWidth: '750px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{color: 'var(--color-primary)'}}></i>
                La French AI Analysis
              </h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'} onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}>
                <i className="fa-solid fa-xmark"></i> Close
              </button>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px', display: 'flex', flexDirection: 'column' }}>
              {messages.map((msg, idx) => (
                <div key={idx} className={msg.role === 'user' ? 'user-message-bubble' : 'ai-message-bubble'}>
                  {msg.role === 'user' ? (
                    msg.parts[0].text
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.parts[0].text || ''}</ReactMarkdown>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="ai-message-bubble" style={{ width: 'fit-content', padding: '10px 20px' }}>
                  <span style={{ fontWeight: 'bold' }}>Analyzing<span className="loading-dots"></span></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div style={{ padding: '20px 25px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Ask a question about your performance..." 
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(inputValue); }}
                  disabled={isLoading}
                />
                <button 
                  className="send-btn" 
                  onClick={() => sendMessage(inputValue)} 
                  disabled={isLoading || !inputValue.trim()}
                >
                  <i className="fa-solid fa-arrow-up"></i>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

window.mountCopilotChat = (elementId) => {
  const container = document.getElementById(elementId);
  if (container) {
    const root = createRoot(container);
    root.render(<CopilotChatWidget />);
  }
};
