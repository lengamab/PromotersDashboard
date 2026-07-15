import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CopilotKit, useCopilotReadable, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TextMessage } from "@copilotkit/runtime-client-gql";
import "@copilotkit/react-ui/styles.css";

const CopilotContextHandler = ({ contextData }) => {
  useCopilotReadable({
    description: "Current Meta Ads Campaign Data or Account Summary currently selected by the user",
    value: contextData
  });

  useCopilotAction({
    name: "fetchCampaignBudget",
    description: "Fetch the live daily and lifetime budget and scope for a specific Meta Ads campaign. Call this if the user asks for the budget of a campaign.",
    parameters: [
      {
        name: "campaignId",
        type: "string",
        description: "The ID of the campaign to fetch the budget for.",
        required: true,
      }
    ],
    handler: async ({ campaignId }) => {
      try {
        const token = window.META_ACCESS_TOKEN;
        if (!token) return "Error: Meta Access Token not found.";
        
        const response = await fetch(`https://graph.facebook.com/v20.0/${campaignId}?fields=name,daily_budget,lifetime_budget&access_token=${token}`);
        const data = await response.json();
        
        if (data.error) {
          return `Error fetching budget: ${data.error.message}`;
        }
        
        let budgetStr = `Campaign ${data.name}:`;
        if (data.daily_budget) {
            budgetStr += ` Daily Budget is ${(parseInt(data.daily_budget)/100).toFixed(2)}€`;
        }
        if (data.lifetime_budget) {
            budgetStr += ` Lifetime Budget is ${(parseInt(data.lifetime_budget)/100).toFixed(2)}€`;
        }
        if (!data.daily_budget && !data.lifetime_budget) {
            budgetStr += ` No budget set on campaign level.`;
        }
        
        return budgetStr;
      } catch (e) {
        return `Failed to fetch budget: ${e.message}`;
      }
    }
  });

  useCopilotAction({
    name: "fetchActiveCampaigns",
    description: "Fetch all active Meta Ads campaigns for the account.",
    parameters: [],
    handler: async () => {
      try {
        const token = window.META_ACCESS_TOKEN;
        const accountId = window.META_ACCOUNT_ID;
        if (!token || !accountId) return "Error: Meta API credentials not found.";
        const res = await fetch(`https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=name,status,daily_budget,lifetime_budget&effective_status=['ACTIVE']&access_token=${token}`);
        const data = await res.json();
        if (data.error) return `Error: ${data.error.message}`;
        return JSON.stringify(data.data.map(c => ({
            id: c.id, name: c.name,
            daily_budget: c.daily_budget ? (parseInt(c.daily_budget)/100) : null,
            lifetime_budget: c.lifetime_budget ? (parseInt(c.lifetime_budget)/100) : null
        })));
      } catch (e) {
        return `Failed to fetch campaigns: ${e.message}`;
      }
    }
  });

  useCopilotAction({
    name: "fetchFourvenuesPerformance",
    description: "Fetch overall promoter performance (PR lists, tickets sold, revenue) from Fourvenues.",
    parameters: [],
    handler: async () => {
      try {
        const res = await fetch('http://localhost:5000/api/performance');
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return JSON.stringify(data.data);
      } catch (e) {
        return `Failed to fetch performance: ${e.message}`;
      }
    }
  });

  useCopilotAction({
    name: "fetchFourvenuesWallet",
    description: "Fetch the current wallet balance from Fourvenues.",
    parameters: [],
    handler: async () => {
      try {
        const res = await fetch('http://localhost:5000/api/wallet');
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return JSON.stringify(data.data);
      } catch (e) {
        return `Failed to fetch wallet: ${e.message}`;
      }
    }
  });

  useCopilotAction({
    name: "fetchPromoterProfile",
    description: "Fetch specific data about a single promoter by their ID.",
    parameters: [
      { name: "promoterId", type: "string", description: "The ID of the promoter.", required: true }
    ],
    handler: async ({ promoterId }) => {
      try {
        const res = await fetch(`http://localhost:5000/api/promoter/${promoterId}`);
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return JSON.stringify(data.data);
      } catch (e) {
        return `Failed to fetch promoter profile: ${e.message}`;
      }
    }
  });

  return null;
};

// Component that needs access to useChatContext
const CopilotController = ({ setContextData, setIsOpen }) => {
  const { appendMessage, runChatCompletion } = useCopilotChat();

  useEffect(() => {
    window.updateCopilotContext = (data, customPrompt) => {
      setContextData(data);
      // Programmatically open the popup
      setIsOpen(true);
      
      // Auto-trigger analysis message if requested
      if (customPrompt) {
          setTimeout(async () => {
              await appendMessage(new TextMessage({
                  content: customPrompt,
                  role: 'user'
              }));
              runChatCompletion();
          }, 300);
      }
    };
  }, [setContextData, setIsOpen, appendMessage, runChatCompletion]);

  return null;
};

const CopilotChatWidget = () => {
  const [contextData, setContextData] = useState("No data selected yet.");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CopilotKit runtimeUrl="http://localhost:4000/api/copilotkit">
      <CopilotContextHandler contextData={contextData} />
      <CopilotController setContextData={setContextData} setIsOpen={setIsOpen} />
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, background: 'var(--surface-color)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: 'var(--background-color)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <i className="fa-solid fa-wand-magic-sparkles" style={{color: 'var(--color-primary)'}}></i>
                 La French AI Analysis
              </h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'} onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}>
                 <i className="fa-solid fa-xmark"></i> Close Fullscreen AI
              </button>
           </div>
           <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
             <CopilotChat 
               instructions="You are an expert digital marketing analyst for La French Barcelona. The user will ask you to analyze their Meta Ads data. Use the provided context data to answer their questions."
               labels={{
                 title: "AI Performance Analysis",
                 initial: "Hello! Click 'Analyze Campaign' or ask me a question about your ads."
               }}
             />
           </div>
        </div>
      )}
    </CopilotKit>
  );
};

window.mountCopilotChat = (elementId) => {
  const container = document.getElementById(elementId);
  if (container) {
    const root = createRoot(container);
    root.render(<CopilotChatWidget />);
  }
};
