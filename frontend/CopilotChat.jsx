import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

const CopilotContextHandler = ({ contextData }) => {
  useCopilotReadable({
    description: "Current Meta Ads Campaign Data or Account Summary currently selected by the user",
    value: contextData
  });
  return null;
};

const CopilotChatWidget = () => {
  const [contextData, setContextData] = useState("No data selected yet.");

  useEffect(() => {
    window.updateCopilotContext = (data) => {
      setContextData(data);
      // Automatically open the popup when context is updated
      const toggleButton = document.querySelector('.copilot-kit-popup-button');
      if (toggleButton && !document.querySelector('.copilot-kit-popup-window')) {
          toggleButton.click();
      }
    };
  }, []);

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
      />
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
