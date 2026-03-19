// Airbnb Insight AI - Configuration
// 
// HOW TO USE:
// 1. Copy this file and rename it to: config.js
// 2. Replace the placeholder values with your actual credentials
// 3. The extension will auto-load your API key on startup
//
// SECURITY NOTE:
// - Never commit config.js to version control
// - Keep your API key private
// - config.js is listed in .gitignore

const CONFIG = {
  // Your OpenAI API Key
  // Get one at: https://platform.openai.com/api-keys
  OPENAI_API_KEY: '',
  
  // Your default travel preferences (optional)
  // These will be used to personalise the match score
  // Example: "I need fast WiFi for remote work, prefer quiet neighbourhoods, and value cleanliness"
  USER_PREFERENCES: '',
  
  // OpenAI model to use
  // Options: 'gpt-4o-mini' (fast & cheap), 'gpt-4o' (more capable), 'gpt-4-turbo'
  MODEL: 'gpt-4o-mini',
  
  // Maximum tokens for AI response
  MAX_TOKENS: 1500
};

// Don't modify below this line
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}
