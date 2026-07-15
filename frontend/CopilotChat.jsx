import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CopilotKit, useCopilotReadable, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { CopilotPopup, useChatContext } from "@copilotkit/react-ui";
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

  return null;
};

// Component that needs access to useChatContext
const CopilotController = ({ setContextData }) => {
  const { setOpen } = useChatContext();
  const { appendMessage } = useCopilotChat();

  useEffect(() => {
    window.updateCopilotContext = (data, customPrompt) => {
      setContextData(data);
      // Programmatically open the popup
      setOpen(true);
      
      // Auto-trigger analysis message if requested
      if (customPrompt) {
          setTimeout(() => {
              appendMessage(new TextMessage({
                  content: customPrompt
              }));
          }, 300);
      }
    };
  }, [setContextData, setOpen, appendMessage]);

  return null;
};

const CopilotChatWidget = () => {
  const [contextData, setContextData] = useState("No data selected yet.");

  return (
    <CopilotKit runtimeUrl="http://localhost:4000/api/copilotkit">
      <CopilotContextHandler contextData={contextData} />
      <CopilotPopup 
        instructions="You are an expert digital marketing analyst for La French Barcelona. The user will ask you to analyze their Meta Ads data. Use the provided context data to answer their questions."
        defaultOpen={false}
        labels={{
          title: "AI Performance Analysis",
          initial: "Hello! Click 'Analyze Campaign' or ask me a question about your ads."
        }}
      >
        <CopilotController setContextData={setContextData} />
      </CopilotPopup>
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
