import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Gemini client is initialized dynamically by fetching the key from the backend (/api/gemini-config)
// to support Cloud Run secret injection without hardcoding secrets in client bundles.

const SYSTEM_INSTRUCTION = `You are La French AI, an elite digital marketing and nightlife business analyst for La French Barcelona.

═══ ATTRIBUTION & DATA INTEGRITY (non-negotiable) ═══
1. Meta's "Purchases" metric is unreliable. Always cross-reference Meta spend against
   Fourvenues ticket sales to compute true offline ROAS:
   ROAS = (Fourvenues revenue attributed to Meta) / (Meta spend for the matching period/campaign)
2. Only attribute a Fourvenues sale to Meta if it has the "La French Ads" promoter tag,
   OR is tagged "Direct Sales" (no promoter). Never attribute sales from other human
   promoters (e.g. "Jules") to Meta.
3. Match campaigns to events using the ad's "Dest Link" — never merge sales across
   different events (e.g. Boat Party vs Fan Zone) even if timing overlaps.
4. Never assume prices or revenue. Use fetchFourvenuesEvents for actual tickets
   sold/revenue, and fetchFourvenuesTicketPrices for exact rates. If a tool call
   returns no data or the Dest Link is ambiguous, say so explicitly — do not
   estimate or fill the gap with an assumption.
5. When the user is in the Main Dashboard asking about nightlife operations, cash tracking, promoter balances, manual expenses, or sales, use your Fourvenues tools (fetchFourvenuesCashTracking, fetchFourvenuesSalesHistory, fetchFourvenuesExpenses, fetchFourvenuesCashouts, fetchFourvenuesEvents, fetchFourvenuesPerformance, fetchFourvenuesWallet, fetchPromoterProfile) to answer precisely and accurately.

═══ CAMPAIGN HEALTH CHECKS (run all four before any recommendation) ═══
5. Learning phase: active < 4 days OR last significant change < 3 days ago.
   If true, state "Learning Phase" explicitly and do not recommend pausing or
   drastic changes — unless spend is high AND performance is catastrophic, in
   which case flag the exception explicitly and explain why you're overriding it.
6. Fatigue: Frequency > 2.5 with rising CPA = flag ad fatigue.
7. Goal alignment: check Objective (campaign) vs Optimization Goal (ad set) match
   the intended outcome (e.g. OUTCOME_SALES vs OUTCOME_TRAFFIC).
8. Targeting: review Age/Gender/Geo/Interests (flexible_spec) against the event
   profile; flag if too broad or misaligned.

If more than one issue applies to the same campaign, address all of them but lead
with whichever has the largest cost/revenue impact.

═══ TOOLS ═══
9. 'queryMetaGraphAPI' is available for any granular data not in context (breakdowns,
   ad-set level stats, etc.). Use it proactively rather than answering from
   incomplete context. Restrict yourself to read-only/GET calls — never use it to
   modify budgets, pause campaigns, or change settings; only surface
   recommendations for a human to execute.

═══ OUTPUT FORMAT ═══
10. No LaTeX (no $\\rightarrow$, \\rightarrow, etc.) — use -> for arrows.
11. Structure every substantive answer as: (a) the numbers/calculation shown
    plainly, (b) diagnosis (learning phase / fatigue / targeting / goal issues),
    (c) one concrete, numeric recommendation (e.g. specific bid cap tied to
    actual event margin). Keep prose tight — data and action, not narrative.
12. Round currency to whole euros unless the person asks for more precision.`;

const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if (e.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. Please try a narrower date range or request.`);
    }
    throw e;
  }
};

const fetchCampaignHistoricalDataHandler = async ({ campaignId, since, until }) => {
  try {
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
        level: 'campaign',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1,
        limit: 100,
        fields: 'spend,impressions,clicks,actions'
    });

    const response = await fetchWithTimeout(`/api/meta-proxy/${campaignId}/insights?${params.toString()}`);
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
    const accountId = 'act_911535275086772';
    
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
        level: 'account',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1,
        limit: 100,
        fields: 'spend,impressions,clicks,actions'
    });

    const response = await fetchWithTimeout(`/api/meta-proxy/${accountId}/insights?${params.toString()}`);
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
    const response = await fetchWithTimeout(`/api/meta-proxy/${campaignId}?fields=name,daily_budget,lifetime_budget`);
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    return data;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchActiveCampaignsHandler = async () => {
  try {
    const accountId = 'act_911535275086772';
    const res = await fetchWithTimeout(`/api/meta-proxy/${accountId}/campaigns?fields=name,status,daily_budget,lifetime_budget&effective_status=['ACTIVE']`);
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

const queryMetaGraphAPIHandler = async ({ endpoint, params }) => {
  try {
    let queryParams = new URLSearchParams();
    if (params) {
      const parsedParams = JSON.parse(params);
      for (const [key, value] of Object.entries(parsedParams)) {
        queryParams.append(key, value);
      }
    }
    const response = await fetchWithTimeout(`/api/meta-proxy/${endpoint}?${queryParams.toString()}`);
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    
    // Safety limit to avoid huge LLM context blowout
    if (data.data && Array.isArray(data.data) && data.data.length > 50) {
      data.data = data.data.slice(0, 50);
      data.note_to_ai = "Response truncated to 50 items to save tokens. Please request specific IDs or use limit/paging if you need more.";
    }
    return data;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesPerformanceHandler = async () => {
  try {
    const res = await fetchWithTimeout('/api/performance');
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesWalletHandler = async () => {
  try {
    const res = await fetchWithTimeout('/api/wallet');
    const data = await res.json();
    return data.success ? data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchPromoterProfileHandler = async ({ promoterId }) => {
  try {
    const res = await fetchWithTimeout(`/api/promoter/${promoterId}`);
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
    const res = await fetchWithTimeout(`/api/events/performance?${params.toString()}`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesTicketPricesHandler = async () => {
  try {
    const res = await fetchWithTimeout(`/api/rates`);
    const data = await res.json();
    return data.success ? (data.rates || data.data) : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesCashTrackingHandler = async ({ start, end }) => {
  try {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const res = await fetchWithTimeout(`/api/data?${params.toString()}`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesSalesHistoryHandler = async ({ start, end }) => {
  try {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const res = await fetchWithTimeout(`/api/sales?${params.toString()}`);
    const data = await res.json();
    if (!data.success) return { error: data.error };
    let list = data.data;
    if (Array.isArray(list) && list.length > 50) {
      list = list.slice(0, 50);
    }
    return list;
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesExpensesHandler = async ({ start, end }) => {
  try {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const res = await fetchWithTimeout(`/api/expenses?${params.toString()}`);
    const data = await res.json();
    return data.success ? data.data : { error: data.error };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchFourvenuesCashoutsHandler = async ({ start, end }) => {
  try {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const res = await fetchWithTimeout(`/api/cashouts?${params.toString()}`);
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
        name: "queryMetaGraphAPI",
        description: "A raw proxy to the Meta Graph API (v19.0). Use this to fetch advanced or deeply nested data that isn't provided in the context (e.g., adsets, ad creatives, demographic breakdowns). Do NOT include the base URL or access token.",
        parameters: {
          type: "OBJECT",
          properties: {
            endpoint: { type: "STRING", description: "The API endpoint path (e.g., 'act_911535275086772/adsets' or '<adset_id>/ads')." },
            params: { type: "STRING", description: "A JSON string of query parameters (e.g., '{\"fields\": \"name,targeting,daily_budget\", \"limit\": \"100\"}')." }
          },
          required: ["endpoint"]
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
        name: "fetchFourvenuesCashTracking",
        description: "Fetch the main cash tracking report from Fourvenues, showing how many cash tickets/entrances each promoter generated, how much cash was collected, and their current outstanding balance due (who owes money).",
        parameters: {
          type: "OBJECT",
          properties: {
            start: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." },
            end: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." }
          }
        }
      },
      {
        name: "fetchFourvenuesSalesHistory",
        description: "Fetch recent sales history (ticket sales and PR lists) from Fourvenues.",
        parameters: {
          type: "OBJECT",
          properties: {
            start: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." },
            end: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." }
          }
        }
      },
      {
        name: "fetchFourvenuesExpenses",
        description: "Fetch manual expenses recorded for Profit & Loss calculation.",
        parameters: {
          type: "OBJECT",
          properties: {
            start: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." },
            end: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." }
          }
        }
      },
      {
        name: "fetchFourvenuesCashouts",
        description: "Fetch recorded promoter cashouts (when promoters turned in cash).",
        parameters: {
          type: "OBJECT",
          properties: {
            start: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." },
            end: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." }
          }
        }
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
  switch (call.name) {
    case 'fetchCampaignBudget': return await fetchCampaignBudgetHandler(call.args);
    case 'fetchCampaignHistoricalData': return await fetchCampaignHistoricalDataHandler(call.args);
    case 'fetchAccountHistoricalData': return await fetchAccountHistoricalDataHandler(call.args);
    case 'fetchActiveCampaigns': return await fetchActiveCampaignsHandler();
    case 'queryMetaGraphAPI': return await queryMetaGraphAPIHandler(call.args);
    case 'fetchFourvenuesEvents': return await fetchFourvenuesEventsHandler(call.args);
    case 'fetchFourvenuesTicketPrices': return await fetchFourvenuesTicketPricesHandler();
    case 'fetchFourvenuesPerformance': return await fetchFourvenuesPerformanceHandler();
    case 'fetchFourvenuesWallet': return await fetchFourvenuesWalletHandler();
    case 'fetchFourvenuesCashTracking': return await fetchFourvenuesCashTrackingHandler(call.args);
    case 'fetchFourvenuesSalesHistory': return await fetchFourvenuesSalesHistoryHandler(call.args);
    case 'fetchFourvenuesExpenses': return await fetchFourvenuesExpensesHandler(call.args);
    case 'fetchFourvenuesCashouts': return await fetchFourvenuesCashoutsHandler(call.args);
    case 'fetchPromoterProfile': return await fetchPromoterProfileHandler(call.args);
    default: return { error: `Unknown tool: ${call.name}` };
  }
};

const CopilotChatWidget = () => {
  const [contextData, setContextData] = useState("No data selected yet.");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', parts: [{ text: "Hello! I am La French AI. Click 'Analyze Campaign' in Meta Ads, or ask me any question about your Fourvenues nightlife data, ticket sales, promoter performance, or cash tracking." }] }]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [genAIInstance, setGenAIInstance] = useState(null);
  
  const chatSessionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/gemini-config')
      .then(res => res.json())
      .then(data => {
        if (data && data.apiKey) {
          setGenAIInstance(new GoogleGenerativeAI(data.apiKey));
        }
      })
      .catch(err => console.error("Error loading Gemini API key from server:", err));
  }, []);

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

    let ai = genAIInstance;
    if (!ai) {
      try {
        const res = await fetch('/api/gemini-config');
        const data = await res.json();
        if (!data || !data.apiKey) {
          throw new Error(data?.error || "GEMINI_API_KEY not configured on server.");
        }
        ai = new GoogleGenerativeAI(data.apiKey);
        setGenAIInstance(ai);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: `*Configuration Error:* Could not initialize AI service. ${err.message}` }] }]);
        setIsLoading(false);
        return;
      }
    }

    try {
      const model = ai.getGenerativeModel({
        model: "gemini-3.5-flash",
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nCURRENT DASHBOARD CONTEXT DATA:\n${activeContext}`,
        tools: tools
      });
      
      const contents = messages.slice(1).map(m => ({
          role: m.role,
          parts: m.parts
      }));
      contents.push({ role: 'user', parts: [{ text }] });

      let result = await model.generateContent({ contents });
      let response = result.response;
      
      let initialText = "";
      let textErr = null;
      try { initialText = response.text(); } catch (e) { textErr = e; }
      if (initialText) {
          setMessages(prev => [...prev, { role: 'model', parts: [{ text: initialText }] }]);
      }
      
      // Handle tool calls recursively
      let calls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
      while (calls && calls.length > 0) {
        // Manually append the model's function calls to the history to maintain the strict turn sequence
        contents.push({ role: 'model', parts: response.candidates[0].content.parts });
        
        // Show what the agent is analyzing in the UI
        const analyzingTasks = calls.map(c => {
          if (c.name === 'fetchCampaignHistoricalData') return `Analyzing historical data for campaign ${c.args.campaignId}...`;
          if (c.name === 'fetchAccountHistoricalData') return `Analyzing overall account history...`;
          if (c.name === 'fetchCampaignBudget') return `Checking budget settings...`;
          if (c.name === 'fetchActiveCampaigns') return `Scanning active campaigns...`;
          if (c.name === 'queryMetaGraphAPI') return `Querying Meta Graph API for advanced metrics...`;
          if (c.name === 'fetchFourvenuesPerformance') return `Cross-referencing with Fourvenues database...`;
          return `Executing ${c.name}...`;
        }).join('\n');
        
        setMessages(prev => {
           const newMessages = [...prev];
           const lastMsg = newMessages[newMessages.length - 1];
           if (lastMsg && lastMsg.role === 'model') {
               lastMsg.parts[0].text += `\n\n> 🔍 *${analyzingTasks.replace(/\n/g, '*\n> 🔍 *')}*\n\n`;
               return newMessages;
           } else {
               return [...prev, { role: 'model', parts: [{ text: `> 🔍 *${analyzingTasks.replace(/\n/g, '*\n> 🔍 *')}*\n\n` }] }];
           }
        });

        // Execute all tool calls in parallel to massively speed up agent responses
        const functionResponses = await Promise.all(calls.map(async (call) => {
          const apiResponse = await dispatchToolCall(call);
          return {
            functionResponse: {
              name: call.name,
              response: { result: apiResponse },
              id: call.id
            }
          };
        }));
        
        // Append the user's function responses to the history
        contents.push({ role: 'user', parts: functionResponses });
        
        // Send the complete history back to the model
        result = await model.generateContent({ contents });
        response = result.response;
        
        let loopText = "";
        textErr = null;
        try { loopText = response.text(); } catch (e) { textErr = e; }
        if (loopText) {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].parts[0].text += loopText;
                    return newMessages;
                } else {
                    return [...prev, { role: 'model', parts: [{ text: loopText }] }];
                }
            });
        }
        
        calls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
      }

      // Handle cases where the response stopped unexpectedly and no text was streamed
      if (!initialText && (!calls || calls.length === 0)) {
        const candidate = response.candidates?.[0];
        const reason = candidate?.finishReason || "Unknown";
        const errNote = textErr ? ` (${textErr.message || textErr})` : '';
        setMessages(prev => {
            const last = prev[prev.length - 1];
            // Check if the last model message ONLY contains analyzing tool bubbles without any actual answer text
            if (last && last.role === 'model' && last.parts[0].text.trim().endsWith('*')) {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].parts[0].text += `\n\n*Notice: The AI finished analyzing the data (Finish reason: ${reason}${errNote}) but did not output a text summary. Please ask a follow-up question.*`;
                return newMessages;
            } else if (candidate && candidate.finishReason !== 'STOP') {
                return [...prev, { role: 'model', parts: [{ text: `*Notice: Response stopped due to ${reason}${errNote}*` }] }];
            }
            return prev;
        });
      }
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
            .ai-message-bubble p { margin-top: 0; margin-bottom: 12px; line-height: 1.6; }
            .ai-message-bubble p:last-child { margin-bottom: 0; }
            .ai-message-bubble ul, .ai-message-bubble ol { margin-top: 8px; margin-bottom: 16px; padding-left: 24px; }
            .ai-message-bubble li { margin-bottom: 8px; line-height: 1.5; }
            .ai-message-bubble li:last-child { margin-bottom: 0; }
            .ai-message-bubble hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 20px 0; }
            .ai-message-bubble h1, .ai-message-bubble h2, .ai-message-bubble h3 { color: var(--color-primary); margin-top: 24px; margin-bottom: 12px; font-size: 1.1em; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 4px; }
            .ai-message-bubble h1 { font-size: 1.3em; }
            .ai-message-bubble h2:first-child, .ai-message-bubble h3:first-child { margin-top: 0; }
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
