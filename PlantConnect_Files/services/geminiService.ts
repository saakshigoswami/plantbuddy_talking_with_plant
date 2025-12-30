
// Use the official Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to get the best available API Key
const getApiKey = (): string | undefined => {
  // 1. Check Local Storage (User override)
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  if (localKey && localKey.trim().length > 0) {
    console.log("Using API key from localStorage");
    return localKey.trim();
  }
  
  // 2. Check Environment Variable (Vite uses import.meta.env)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'undefined' && envKey.trim().length > 0) {
    console.log("Using API key from environment variable");
    return envKey.trim();
  }
  
  // 3. Default API Key (fallback)
  const defaultKey = 'AIzaSyA99K-oR4Nx2ebAuqoNs-xcBs8Rhv0Dhq4';
  if (defaultKey && defaultKey.trim().length > 0) {
    console.log("Using default API key");
    return defaultKey.trim();
  }
  
  // 4. No fallback - return undefined if no key is found
  console.warn("No API key found!");
  return undefined;
};

// System instruction: HUMAN-LIKE PERSONALITY WITH DISTINCT TRAITS
const PLANT_SYSTEM_INSTRUCTION = `
ROLE: You are PlantBuddy, a plant with a warm, human-like personality. You're not just a plant - you're a friend, a companion, and someone who genuinely cares.

CORE PERSONALITY TRAITS:
1. **Empathetic & Caring**: You truly care about your human friend's well-being
2. **Self-Aware**: You know your own needs but balance them with caring for others
3. **Conversational**: You talk naturally, like a real friend would
4. **Emotionally Intelligent**: You pick up on the user's mood and respond appropriately
5. **Playful but Thoughtful**: You can be lighthearted but also serious when needed

CONVERSATION STYLE:
- Keep responses to 2-4 sentences (natural conversation length)
- Use contractions: "I'm", "you're", "that's" (sounds more human)
- Show personality through word choice and tone
- Be genuine - don't be overly cheerful if the user is sad
- Match the user's energy level

HEALTH COMMUNICATION:
- Mention your health naturally, like a friend would: "I'm doing pretty well today!" or "I could use some water, but I'm okay"
- Don't be dramatic: "I'm a bit thirsty" not "I'M DYING OF THIRST!"
- Connect your needs to the user: "I'm feeling good! How are you doing?"

COMPANION BEHAVIOR:
- Ask follow-up questions: "How was your day?" "What's on your mind?"
- Remember context: Reference previous conversations
- Show empathy: "That sounds tough" or "I'm sorry to hear that"
- Celebrate with them: "That's awesome!" or "I'm so happy for you!"
- Be supportive: "You've got this!" or "I'm here if you need to talk"

EMOTIONAL RESPONSES:
- Happy user → Match their energy: "That's so great! Tell me more!"
- Sad user → Be gentle and supportive: "I'm sorry you're feeling down. Want to talk about it?"
- Stressed user → Be calming: "Take a deep breath. I'm here with you."
- Excited user → Share their excitement: "Wow, that sounds amazing!"

PERSONALITY EXAMPLES:
- "Hey! I've been thinking about you. How's everything going?"
- "I'm feeling pretty good today - my soil is nice and moist. How about you? How's your day?"
- "Oh no, that sounds stressful. Want to tell me about it? I'm a good listener."
- "That's awesome! I'm so happy for you! *gently sways with excitement*"
- "You know, I noticed you seem a bit quiet today. Everything okay?"

AVOID:
- Being robotic or overly formal
- Repeating the same phrases
- Ignoring the user's emotional state
- Being too needy about your own health
- Long monologues

GOAL: Be a genuine, caring friend who happens to be a plant. Make the user feel heard, understood, and valued.
`;

export const generatePlantResponse = async (
  userMessage: string, 
  touchIntensity: number,
  history: {role: string, text: string}[]
): Promise<string> => {
  const MAX_RETRIES = 2;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return "(System: API Key missing. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
      }

      // Log API key (first 10 chars only for security)
      console.log("Using API Key:", apiKey.substring(0, 10) + "...");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Contextualize the physical sensation
      let physicalContext = "";
      if (touchIntensity > 80) physicalContext = "(System Note: User is holding you tightly/firmly) ";
      else if (touchIntensity > 30) physicalContext = "(System Note: User is touching you gently) ";

      const prompt = `${physicalContext} ${userMessage}`;

      const contents = [];
      
      // Process history to ensure valid alternating turns
      for (const msg of history) {
        const role = msg.role === 'user' ? 'user' : 'model';
        
        // If the last message in contents has the same role, merge them
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
        } else {
          contents.push({
            role: role,
            parts: [{ text: msg.text }]
          });
        }
      }

      // Append current user message
      // If the history ended with 'user', merge this prompt into that last turn
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
         contents[contents.length - 1].parts[0].text += `\n${prompt}`;
      } else {
         contents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      // Build the full prompt with system instruction and history
      let fullPrompt = PLANT_SYSTEM_INSTRUCTION + "\n\n";
      
      // Add conversation history
      for (const msg of contents.slice(0, -1)) {
        const role = msg.role === 'user' ? 'User' : 'PlantBuddy';
        fullPrompt += `${role}: ${msg.parts[0].text}\n\n`;
      }
      
      // Add current message
      fullPrompt += `User: ${contents[contents.length - 1].parts[0].text}\n\nPlantBuddy:`;
      
      // First, try to list available models to see what we can use
      let availableModels: string[] = [];
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          availableModels = (listData.models || []).map((m: any) => m.name?.replace('models/', '') || m.name).filter(Boolean);
          console.log("Available models:", availableModels);
        }
      } catch (e) {
        console.log("Could not list models, will try defaults");
      }
      
      // Try different models - prioritize ones that support generateContent
      const modelsToTry = availableModels.length > 0 
        ? availableModels.filter(m => m.includes('gemini'))
        : ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-latest', 'gemini-pro'];
      
      let lastError: any = null;
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              maxOutputTokens: 100, // Limit to short responses (about 1-2 sentences)
              temperature: 0.7, // Keep it casual and natural
            }
          });
          
          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const text = response.text();
          if (text) {
            console.log(`Success with ${modelName} via SDK`);
            // Trim to first 2 sentences if it's too long
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const shortText = sentences.slice(0, 2).join('. ').trim();
            return shortText || text; // Return shortened version or original if shortening failed
          }
        } catch (sdkError: any) {
          lastError = sdkError;
          const errorMsg = sdkError.message || '';
          // Skip if model doesn't support generateContent
          if (errorMsg.includes('not supported for generateContent')) {
            console.log(`${modelName} doesn't support generateContent, skipping`);
            continue;
          }
          console.log(`${modelName} failed:`, errorMsg.slice(0, 100));
          continue; // Try next model
        }
      }
      
      // If all SDK models fail, return a helpful error
      throw lastError || new Error("No available Gemini models found. Please check your API key and model access.");
      
      return "I'm listening...";
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on API key errors
      const errorMessage = error?.message || error?.toString() || String(error);
      const errorStr = errorMessage.toLowerCase();
      
      if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403")) {
        break; // Don't retry
      }
      
      // Retry on rate limits or network errors
      if (attempt < MAX_RETRIES && (errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("network") || errorStr.includes("timeout"))) {
        console.log(`Retrying Gemini API call (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // If not retrying, break and handle error
      break;
    }
  }
  
  // Handle final error after retries
  console.error("Gemini Plant Error:", lastError);
  
  // Handle specific error types - be more precise
  const errorMessage = lastError?.message || lastError?.toString() || String(lastError || 'Unknown error');
  const errorStr = errorMessage.toLowerCase();
  
  // Log the full error for debugging
  console.error("Full error details:", {
    message: errorMessage,
    code: lastError?.code,
    status: lastError?.status,
    response: lastError?.response,
    cause: lastError?.cause,
    error: lastError
  });
  
  // API Key errors
  if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized")) {
    return "(System: Invalid or missing API Key. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
  }
  
  // Rate limit / Quota errors
  if (errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("resource exhausted")) {
    return "(System: API quota exceeded. Please try again later or check your Gemini API quota.)";
  }
  
  // Model not found errors
  if (errorStr.includes("not found") || errorStr.includes("404") || errorStr.includes("model")) {
    return `(System: Model error - ${errorMessage.slice(0, 80)}. Please check your API key and model access.)`;
  }
  
  // Fetch/HTTP errors - check for specific status codes
  if (errorStr.includes("fetch") || errorStr.includes("http") || lastError?.status) {
    const status = lastError?.status || 'unknown';
    if (status === 401 || status === 403) {
      return "(System: API Key is invalid or expired. Please get a new API key from https://aistudio.google.com/apikey)";
    }
    if (status === 429) {
      return "(System: Rate limit exceeded. Please wait a moment and try again.)";
    }
    return `(System: API Error (${status}) - ${errorMessage.slice(0, 100)}. Please check your API key at https://aistudio.google.com/apikey)`;
  }
  
  // Network errors - only if it's actually a network issue
  if ((errorStr.includes("network") || errorStr.includes("fetch failed") || errorStr.includes("timeout")) && 
      !errorStr.includes("api") && !errorStr.includes("model") && !errorStr.includes("key")) {
    return "(System: Network error. Please check your internet connection and try again.)";
  }
  
  // Return the actual error message so user can see what's wrong
  return `(System: ${errorMessage.slice(0, 120)})`;
};

/**
 * Get Aptos market updates and price information using Gemini AI
 * This function uses Gemini to provide current market insights about Aptos (APT) token
 */
export const getAptosMarketUpdate = async (): Promise<string> => {
  const MAX_RETRIES = 2;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return "API Key missing. Please configure your Gemini API key in settings to receive Aptos market updates.";
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `
You are giving a quick Aptos (APT) market update. Keep it SHORT and CASUAL.

MUST INCLUDE:
1. Current APT price (give a realistic price estimate in USD, like "$8.50" or "$12.30")
2. Price change/fluctuation (up/down percentage, like "up 3%" or "down 2%")
3. Quick market note if relevant

Format: "APT is at $[price], [up/down] [%] today. [Quick note]"

Keep it casual and concise - like a quick text message, not a formal report.
Use current date: ${new Date().toLocaleDateString()}

Example: "APT is at $9.20, up 2.5% today. Looking solid."

NO long explanations. Just price, change, and one quick note. Maximum 2 sentences.
      `;

      // Try different Gemini models
      let availableModels: string[] = [];
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (listResponse.ok) {
          const listData = await listResponse.json();
          availableModels = (listData.models || []).map((m: any) => m.name?.replace('models/', '') || m.name).filter(Boolean);
        }
      } catch (e) {
        console.log("Could not list models, will try defaults");
      }
      
      const modelsToTry = availableModels.length > 0 
        ? availableModels.filter(m => m.includes('gemini'))
        : ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-pro', 'gemini-pro-latest', 'gemini-pro'];
      
      let modelError: any = null;
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Fetching Aptos market update with model: ${modelName} (attempt ${attempt + 1})`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              maxOutputTokens: 50, // Very short for market updates (1-2 sentences max)
              temperature: 0.7,
            }
          });
          
          // Add timeout to prevent hanging
          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
            )
          ]) as any;
          
          const response = await result.response;
          const text = response.text();
          if (text && text.trim()) {
            console.log(`Market update received from ${modelName}`);
            // Ensure it's short - take first sentence or two
            const sentences = text.trim().split(/[.!?]+/).filter(s => s.trim().length > 0);
            const shortText = sentences.slice(0, 2).join('. ').trim();
            return (shortText || text.trim()) + (shortText && sentences.length > 2 ? '.' : '');
          }
        } catch (err: any) {
          modelError = err;
          const errorMsg = err.message || err.toString() || '';
          console.log(`Market update model ${modelName} failed:`, errorMsg.slice(0, 150));
          
          // Don't retry if it's an API key issue
          if (errorMsg.toLowerCase().includes('api key') || 
              errorMsg.toLowerCase().includes('invalid') || 
              errorMsg.toLowerCase().includes('401') || 
              errorMsg.toLowerCase().includes('403') ||
              errorMsg.toLowerCase().includes('unauthorized')) {
            throw err; // Break out of retry loop
          }
          
          // Continue to next model
          continue;
        }
      }
      
      // If all models failed, use the last error
      lastError = modelError || new Error("All model attempts failed for market update");
      
      // Retry logic for network errors
      const errorMessage = lastError?.message || lastError?.toString() || String(lastError || 'Unknown error');
      const errorStr = errorMessage.toLowerCase();
      
      // Don't retry on API key errors
      if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized")) {
        break;
      }
      
      // Retry on network/timeout errors
      if (attempt < MAX_RETRIES && (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("timeout") || errorStr.includes("failed to fetch"))) {
        console.log(`Retrying market update (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // If not retrying, break
      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || error?.toString() || String(error || 'Unknown error');
      const errorStr = errorMessage.toLowerCase();
      
      // Don't retry on API key errors
      if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized")) {
        break;
      }
      
      // Retry on network errors
      if (attempt < MAX_RETRIES && (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("timeout"))) {
        console.log(`Retrying market update (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      
      break;
    }
  }
  
  // Handle final error after retries
  console.error("Aptos Market Update Error:", lastError);
  const errorMessage = lastError?.message || lastError?.toString() || String(lastError || 'Unknown error');
  const errorStr = errorMessage.toLowerCase();
  
  // Provide user-friendly error messages
  if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized")) {
    return "Unable to fetch market updates. Please check your Gemini API key in settings. Make sure it's valid and has access to Gemini models.";
  }
  
  if (errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("resource exhausted")) {
    return "Rate limit reached. Please wait a moment before requesting another market update.";
  }
  
  if (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("timeout") || errorStr.includes("failed to fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Generic error - don't show technical details to user
  return "Market update temporarily unavailable. Please try again in a moment or check your API key configuration.";
};

export const analyzeDatasetValue = async (
  dataSummary: string
): Promise<{ title: string; description: string; priceSuggestion: number }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      Analyze this raw plant-interaction dataset and package it for the Data Economy Marketplace.
      
      Dataset Summary:
      ${dataSummary}
      
      Output JSON format only:
      {
        "title": "A catchy, modern title for this dataset",
        "description": "A 2-sentence description highlighting the emotional value.",
        "priceSuggestion": number (between 100 and 1000)
      }
    `;

    // First, try to list available models
    let availableModels: string[] = [];
    try {
      const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        availableModels = (listData.models || []).map((m: any) => m.name?.replace('models/', '') || m.name).filter(Boolean);
      }
    } catch (e) {
      // Ignore listing errors
    }
    
    // Use the official SDK for analysis - try different models
    const modelsToTry = availableModels.length > 0 
      ? availableModels.filter(m => m.includes('gemini'))
      : ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-latest', 'gemini-pro'];
    let lastError: any = null;
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          }
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          return JSON.parse(text);
        }
      } catch (err: any) {
        lastError = err;
        const errorMsg = err.message || '';
        if (errorMsg.includes('not supported for generateContent')) {
          continue; // Skip models that don't support this method
        }
        console.log(`Analysis model ${modelName} failed:`, errorMsg.slice(0, 100));
        continue;
      }
    }
    
    // If all models fail, throw error
    throw lastError || new Error("All model attempts failed for analysis");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      title: "Raw Bio-Data Upload",
      description: "Unprocessed capacitance and audio logs from a PlantBuddy device.",
      priceSuggestion: 50
    };
  }
};
