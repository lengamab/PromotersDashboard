const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA");
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    await model.generateContent("hello");
    console.log("Success with gemini-1.5-flash");
  } catch (e) {
    console.error("Error with gemini-1.5-flash:", e.message);
  }
}
run();
