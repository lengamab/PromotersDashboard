import express from 'express';
import cors from 'cors';
import { CopilotRuntime, GoogleGenerativeAIAdapter } from '@copilotkit/backend';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/copilotkit', async (req, res) => {
  const copilotKit = new CopilotRuntime();
  
  // Set the Gemini API Key that was previously hardcoded
  process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA';
  
  // Use Gemini adapter
  const adapter = new GoogleGenerativeAIAdapter({ model: 'gemini-1.5-flash' }); 
  
  copilotKit.streamHttpServerResponse(req, res, adapter);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`CopilotKit backend listening on port ${PORT}`);
});
