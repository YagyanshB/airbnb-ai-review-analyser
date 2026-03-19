// Airbnb Insight AI - Content Script
// Scrapes reviews from Airbnb listing pages

(function() {
  'use strict';

  // Message listener for popup requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeReviews') {
      scrapeListingData()
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'getListingInfo') {
      const info = getBasicListingInfo();
      sendResponse({ success: true, data: info });
      return true;
    }
  });

  // Get basic listing information from the page
  function getBasicListingInfo() {
    const info = {
      title: '',
      location: '',
      rating: '',
      reviewCount: 0,
      price: '',
      host: '',
      propertyType: '',
      url: window.location.href
    };

    // Title
    const titleEl = document.querySelector('h1');
    if (titleEl) info.title = titleEl.textContent.trim();

    // Rating and review count
    const ratingEl = document.querySelector('[data-testid="pdp-reviews-highlight-banner-host-rating"]');
    if (ratingEl) {
      const text = ratingEl.textContent;
      const ratingMatch = text.match(/(\d+\.?\d*)/);
      if (ratingMatch) info.rating = ratingMatch[1];
    }

    // Alternative rating selector
    if (!info.rating) {
      const altRating = document.querySelector('span[aria-hidden="true"]');
      if (altRating) {
        const match = altRating.textContent.match(/(\d+\.?\d*)\s*·/);
        if (match) info.rating = match[1];
      }
    }

    // Review count
    const reviewCountEl = document.querySelector('[data-testid="pdp-reviews-highlight-banner-host-review-count"]');
    if (reviewCountEl) {
      const countMatch = reviewCountEl.textContent.match(/(\d+)/);
      if (countMatch) info.reviewCount = parseInt(countMatch[1]);
    }

    // Price
    const priceEl = document.querySelector('[data-testid="book-it-default"] span[aria-hidden="true"]');
    if (priceEl) info.price = priceEl.textContent.trim();

    // Host name
    const hostEl = document.querySelector('[data-testid="host-profile"] h2, [data-section-id="HOST_PROFILE"] h2');
    if (hostEl) {
      const hostText = hostEl.textContent;
      const hostedBy = hostText.match(/Hosted by (.+)/i);
      if (hostedBy) info.host = hostedBy[1].trim();
    }

    // Property type from breadcrumb or title
    const breadcrumb = document.querySelector('nav[aria-label="Breadcrumb"]');
    if (breadcrumb) {
      const links = breadcrumb.querySelectorAll('a');
      if (links.length > 0) {
        info.propertyType = links[links.length - 1].textContent.trim();
      }
    }

    // Location
    const locationEl = document.querySelector('[data-section-id="LOCATION_DEFAULT"] h2');
    if (locationEl) {
      const locText = locationEl.textContent;
      const whereMatch = locText.match(/Where you['']ll be/i);
      if (!whereMatch) info.location = locText.trim();
    }
    
    // Alternative location
    if (!info.location) {
      const subtitleEl = document.querySelector('h1 + div span');
      if (subtitleEl) info.location = subtitleEl.textContent.trim();
    }

    return info;
  }

  // Scrape all reviews from the page
  async function scrapeListingData() {
    const data = {
      listingInfo: getBasicListingInfo(),
      reviews: [],
      amenities: [],
      highlights: []
    };

    // Scrape amenities
    const amenityEls = document.querySelectorAll('[data-section-id="AMENITIES_DEFAULT"] button div');
    amenityEls.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length > 2 && !text.includes('Show all')) {
        data.amenities.push(text);
      }
    });

    // Scrape highlights (what guests loved)
    const highlightEls = document.querySelectorAll('[data-section-id="REVIEWS_DEFAULT"] [role="listitem"]');
    highlightEls.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length > 5) {
        data.highlights.push(text);
      }
    });

    // Try to get reviews from the review section
    data.reviews = await scrapeVisibleReviews();

    // If not enough reviews, try clicking "Show all reviews" button
    if (data.reviews.length < 5) {
      const showAllBtn = findShowAllReviewsButton();
      if (showAllBtn) {
        // Notify popup that we need to open modal
        data.needsModal = true;
        data.reviewsScraped = data.reviews.length;
      }
    }

    return data;
  }

  // Scrape reviews visible on the page
  async function scrapeVisibleReviews() {
    const reviews = [];
    
    // Multiple selectors for review containers
    const reviewSelectors = [
      '[data-testid="pdp-reviews-modal-scrollable-panel"] [role="listitem"]',
      '[data-section-id="REVIEWS_DEFAULT"] [role="listitem"]',
      '[data-testid="review"]',
      '[class*="review"] [class*="comment"]'
    ];

    for (const selector of reviewSelectors) {
      const reviewEls = document.querySelectorAll(selector);
      
      reviewEls.forEach(el => {
        const review = extractReviewData(el);
        if (review && review.text && review.text.length > 20) {
          // Avoid duplicates
          if (!reviews.find(r => r.text === review.text)) {
            reviews.push(review);
          }
        }
      });

      if (reviews.length >= 5) break;
    }

    return reviews;
  }

  // Extract data from a single review element
  function extractReviewData(el) {
    const review = {
      text: '',
      author: '',
      date: '',
      rating: null
    };

    // Get review text - try multiple approaches
    const textEls = el.querySelectorAll('span[class*="comment"], span[class*="review"], div > span');
    textEls.forEach(textEl => {
      const text = textEl.textContent.trim();
      // Get the longest text as the review
      if (text.length > review.text.length && text.length > 20) {
        review.text = text;
      }
    });

    // If no text found, try getting all text content
    if (!review.text) {
      const allText = el.textContent.trim();
      // Remove common UI elements
      const cleaned = allText
        .replace(/Show more/gi, '')
        .replace(/Translate/gi, '')
        .replace(/Report/gi, '')
        .trim();
      if (cleaned.length > 20) {
        review.text = cleaned.substring(0, 1000); // Limit length
      }
    }

    // Author name
    const authorEl = el.querySelector('h2, h3, [class*="author"], [class*="name"]');
    if (authorEl) {
      review.author = authorEl.textContent.trim().split('\n')[0];
    }

    // Date
    const dateEl = el.querySelector('[class*="date"], time, [class*="secondary"]');
    if (dateEl) {
      const dateText = dateEl.textContent.trim();
      if (dateText.match(/\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|ago/i)) {
        review.date = dateText;
      }
    }

    return review;
  }

  // Find the "Show all reviews" button
  function findShowAllReviewsButton() {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      if (text.includes('show all') && text.includes('review')) {
        return btn;
      }
    }
    return null;
  }

  // Expand and scrape all reviews from modal
  async function scrapeAllReviewsFromModal() {
    const reviews = [];
    const modal = document.querySelector('[data-testid="pdp-reviews-modal-scrollable-panel"], [role="dialog"]');
    
    if (!modal) return reviews;

    // Scroll through the modal to load more reviews
    let previousCount = 0;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const reviewEls = modal.querySelectorAll('[role="listitem"], [class*="review"]');
      
      reviewEls.forEach(el => {
        const review = extractReviewData(el);
        if (review && review.text && review.text.length > 20) {
          if (!reviews.find(r => r.text === review.text)) {
            reviews.push(review);
          }
        }
      });

      if (reviews.length === previousCount) {
        attempts++;
      } else {
        attempts = 0;
        previousCount = reviews.length;
      }

      // Scroll down in modal
      modal.scrollTop = modal.scrollHeight;
      await new Promise(r => setTimeout(r, 500));

      // Stop if we have enough reviews
      if (reviews.length >= 50) break;
    }

    return reviews;
  }

  console.log('Airbnb Insight AI content script loaded');
})();
