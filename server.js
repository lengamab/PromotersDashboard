import express from 'express';
import cors from 'cors';
import { CopilotRuntime, GoogleGenerativeAIAdapter } from '@copilotkit/runtime';
import { copilotRuntimeNodeExpressEndpoint } from '@copilotkit/runtime';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const copilotKit = new CopilotRuntime();

// Set the Gemini API Key that was previously hardcoded
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA';

const handler = copilotRuntimeNodeExpressEndpoint({
    endpoint: '/api/copilotkit',
    runtime: copilotKit,
    serviceAdapter: new GoogleGenerativeAIAdapter({ model: 'gemini-1.5-flash' })
});

app.use('/api/copilotkit', (req, res, next) => {
    // Restore the URL so CopilotKit's internal Hono router matches the path correctly
    req.url = req.originalUrl;
    return handler(req, res, next);
});

const PORT = 4000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`CopilotKit backend listening on 127.0.0.1:${PORT}`);
});
