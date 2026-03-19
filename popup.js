// Airbnb Insight AI - Popup Script
// Handles UI interactions and OpenAI API calls

class AirbnbInsightAI {
  constructor() {
    this.apiKey = '';
    this.preferences = '';
    this.currentListing = null;
    this.analysisResults = null;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.checkCurrentTab();
  }

  // Load saved settings from storage
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['openaiApiKey', 'userPreferences'], (result) => {
        this.apiKey = result.openaiApiKey || '';
        this.preferences = result.userPreferences || '';
        
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('preferences').value = this.preferences;
        
        resolve();
      });
    });
  }

  // Save settings to storage
  async saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const preferences = document.getElementById('preferences').value.trim();
    
    return new Promise((resolve) => {
      chrome.storage.local.set({
        openaiApiKey: apiKey,
        userPreferences: preferences
      }, () => {
        this.apiKey = apiKey;
        this.preferences = preferences;
        this.showToast('Settings saved!', 'success');
        resolve();
      });
    });
  }

  // Bind event listeners
  bindEvents() {
    // Settings toggle
    document.getElementById('settingsToggle').addEventListener('click', () => {
      document.getElementById('settingsPanel').classList.toggle('open');
    });

    // API key visibility toggle
    document.getElementById('toggleApiKey').addEventListener('click', () => {
      const input = document.getElementById('apiKey');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      this.startAnalysis();
    });

    // Retry button
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.startAnalysis();
    });

    // Re-analyze button
    document.getElementById('reanalyzeBtn').addEventListener('click', () => {
      this.startAnalysis();
    });

    // Copy insights button
    document.getElementById('copyInsightsBtn').addEventListener('click', () => {
      this.copyInsights();
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  // Check if current tab is an Airbnb listing
  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('airbnb.com/rooms/') && !tab.url.includes('airbnb.co.uk/rooms/')) {
        this.showState('notAirbnbState');
        return;
      }

      // Get listing info from content script
      chrome.tabs.sendMessage(tab.id, { action: 'getListingInfo' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, try injecting
          this.showState('notAirbnbState');
          return;
        }

        if (response && response.success) {
          this.currentListing = response.data;
          this.displayListingPreview();
          this.showState('readyState');
        } else {
          this.showState('notAirbnbState');
        }
      });
    } catch (error) {
      console.error('Error checking tab:', error);
      this.showState('notAirbnbState');
    }
  }

  // Display listing preview
  displayListingPreview() {
    if (!this.currentListing) return;

    document.getElementById('listingTitle').textContent = 
      this.currentListing.title || 'Airbnb Listing';
    
    const ratingSpan = document.getElementById('listingRating').querySelector('span:last-child');
    ratingSpan.textContent = this.currentListing.rating || '--';
    
    document.getElementById('listingReviews').textContent = 
      `${this.currentListing.reviewCount || '--'} reviews`;
  }

  // Start the analysis process
  async startAnalysis() {
    if (!this.apiKey) {
      document.getElementById('settingsPanel').classList.add('open');
      this.showToast('Please enter your OpenAI API key', 'error');
      return;
    }

    this.showState('loadingState');
    this.updateProgress(10, 'Connecting to page...');

    try {
      // Scrape reviews from the page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      this.updateProgress(20, 'Scraping reviews...');
      
      const scrapedData = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'scrapeReviews' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Could not connect to page. Please refresh and try again.'));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Failed to scrape reviews'));
          }
        });
      });

      this.updateProgress(40, 'Processing reviews...');
      
      const reviews = scrapedData.reviews || [];
      const reviewCount = reviews.length;

      if (reviewCount === 0) {
        throw new Error('No reviews found on this page. Try scrolling down to load reviews first.');
      }

      document.getElementById('reviewCount').textContent = `${reviewCount} reviews analyzed`;

      this.updateProgress(60, 'Analyzing with AI...');

      // Call OpenAI API
      const analysis = await this.analyzeWithOpenAI(scrapedData);
      
      this.updateProgress(90, 'Generating insights...');

      // Display results
      this.analysisResults = analysis;
      this.displayResults(analysis);
      
      this.updateProgress(100, 'Complete!');
      
      setTimeout(() => {
        this.showState('resultsState');
      }, 300);

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError(error.message);
    }
  }

  // Call OpenAI API for analysis
  async analyzeWithOpenAI(data) {
    const reviews = data.reviews || [];
    const listingInfo = data.listingInfo || {};
    const amenities = data.amenities || [];

    // Prepare review text
    const reviewTexts = reviews
      .map((r, i) => `Review ${i + 1}: ${r.text}`)
      .join('\n\n');

    const systemPrompt = `You are an expert travel advisor AI that analyzes Airbnb reviews to help travelers make informed decisions. You provide honest, balanced, and insightful analysis.

Your task is to analyze the reviews and provide:
1. A match score (0-100) based on how well this property might suit the user's preferences
2. A brief summary of the overall guest experience
3. Key pros (things guests love)
4. Key cons (things guests complain about)
5. Insider tips for potential guests
6. Key themes mentioned in reviews (with sentiment)

${this.preferences ? `The user's travel preferences are: ${this.preferences}` : 'Analyze for a general traveler looking for a comfortable stay.'}

Respond in valid JSON format only.`;

    const userPrompt = `Analyze these Airbnb reviews:

Listing: ${listingInfo.title || 'Unknown'}
Location: ${listingInfo.location || 'Unknown'}
Rating: ${listingInfo.rating || 'N/A'}
Amenities: ${amenities.slice(0, 10).join(', ') || 'Not specified'}

REVIEWS:
${reviewTexts}

Provide your analysis in this exact JSON format:
{
  "matchScore": <number 0-100>,
  "verdict": "<one sentence verdict>",
  "summary": "<2-3 sentence summary of guest experiences>",
  "pros": ["<pro 1>", "<pro 2>", "<pro 3>", "<pro 4>"],
  "cons": ["<con 1>", "<con 2>", "<con 3>"],
  "tips": "<practical tips for future guests based on reviews>",
  "themes": [
    {"name": "<theme>", "sentiment": "positive|negative|neutral", "count": <approximate count>}
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
      }
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    try {
      // Clean the response (remove markdown code blocks if present)
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      return JSON.parse(cleanedContent);
    } catch (e) {
      console.error('JSON parse error:', e, content);
      throw new Error('Failed to parse AI response');
    }
  }

  // Display analysis results
  displayResults(analysis) {
    // Match score animation
    const score = analysis.matchScore || 0;
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreVerdict = document.getElementById('scoreVerdict');

    // Add gradient definition to SVG if not exists
    const svg = scoreCircle.closest('svg');
    if (!svg.querySelector('#score-gradient')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF385C"/>
          <stop offset="100%" stop-color="#00A699"/>
        </linearGradient>
      `;
      svg.insertBefore(defs, svg.firstChild);
    }

    // Animate score
    const circumference = 326.73;
    const offset = circumference - (score / 100) * circumference;
    
    setTimeout(() => {
      scoreCircle.style.strokeDashoffset = offset;
    }, 100);

    // Animate number
    this.animateNumber(scoreNumber, 0, score, 1000);
    
    scoreVerdict.textContent = analysis.verdict || 'Analysis complete';

    // Summary
    document.getElementById('summaryText').textContent = analysis.summary || 'No summary available.';

    // Pros
    const prosList = document.getElementById('prosList');
    prosList.innerHTML = '';
    (analysis.pros || []).forEach(pro => {
      const li = document.createElement('li');
      li.textContent = pro;
      prosList.appendChild(li);
    });

    // Cons
    const consList = document.getElementById('consList');
    consList.innerHTML = '';
    (analysis.cons || []).forEach(con => {
      const li = document.createElement('li');
      li.textContent = con;
      consList.appendChild(li);
    });

    // Tips
    document.getElementById('tipsContent').innerHTML = `<p>${analysis.tips || 'No specific tips available.'}</p>`;

    // Themes
    const themesCloud = document.getElementById('themesCloud');
    themesCloud.innerHTML = '';
    (analysis.themes || []).forEach(theme => {
      const tag = document.createElement('span');
      tag.className = `theme-tag ${theme.sentiment}`;
      tag.innerHTML = `
        ${theme.name}
        <span class="theme-count">${theme.count || ''}</span>
      `;
      themesCloud.appendChild(tag);
    });
  }

  // Animate number counting up
  animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeOut);
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  // Update loading progress
  updateProgress(percent, message) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    if (message) {
      document.getElementById('loadingSubtitle').textContent = message;
    }
  }

  // Show a specific state panel
  showState(stateId) {
    const states = ['notAirbnbState', 'readyState', 'loadingState', 'resultsState', 'errorState'];
    
    states.forEach(state => {
      const el = document.getElementById(state);
      if (state === stateId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  // Switch between tabs
  switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  // Show error state
  showError(message) {
    document.getElementById('errorTitle').textContent = 'Analysis Failed';
    document.getElementById('errorMessage').textContent = message;
    this.showState('errorState');
  }

  // Show toast notification
  showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Copy insights to clipboard
  async copyInsights() {
    if (!this.analysisResults) return;

    const text = `
🏠 Airbnb Insight AI Analysis
${this.currentListing?.title || 'Listing'}

📊 Match Score: ${this.analysisResults.matchScore}/100
${this.analysisResults.verdict}

📝 Summary:
${this.analysisResults.summary}

✅ Pros:
${(this.analysisResults.pros || []).map(p => `• ${p}`).join('\n')}

⚠️ Cons:
${(this.analysisResults.cons || []).map(c => `• ${c}`).join('\n')}

💡 Tips:
${this.analysisResults.tips}
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Insights copied to clipboard!', 'success');
    } catch (error) {
      this.showToast('Failed to copy', 'error');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AirbnbInsightAI();
});
