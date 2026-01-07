// Content script for monitoring social media comments

class TreeGrowthContentScript {
  constructor() {
    this.platform = this.detectPlatform();
    this.commentSelectors = this.getCommentSelectors();
    this.observedComments = new Set();
    this.isUserCommenting = false;
    this.debugMode = true; // Enable debugging
    this.tooltip = null;
    this.previewTimeout = null;
    this.currentInput = null;
    this.lastTypedText = ''; // Track the last text the user typed
    this.lastCapturedText = ''; // Track the last text we captured to prevent duplicates
    
    if (this.platform) {
      console.log(`Tree Growth: Monitoring ${this.platform} for comments`);
      this.log(`Platform detected: ${this.platform}`);
      this.initializeMonitoring();
    } else {
      this.log('No supported platform detected', 'warn');
    }
  }

  log(message, type = 'info') {
    const prefix = 'Tree Growth:';
    if (this.debugMode) {
      switch(type) {
        case 'error':
          console.error(prefix, message);
          break;
        case 'warn':
          console.warn(prefix, message);
          break;
        default:
          console.log(prefix, message);
      }
    }
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    } else if (hostname.includes('facebook.com')) {
      return 'facebook';
    } else if (hostname.includes('instagram.com')) {
      return 'instagram';
    } else if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    } else if (hostname.includes('reddit.com')) {
      return 'reddit';
    } else if (hostname.includes('youtube.com')) {
      return 'youtube';
    } else if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }
    
    return null;
  }

  getCommentSelectors() {
    const selectors = {
      twitter: {
        commentInput: [
          '[data-testid="tweetTextarea_0"]',
          '[role="textbox"][aria-label*="Tweet"]',
          '[role="textbox"][aria-label*="Post"]',
          '[data-testid="tweetTextarea_0_label"]',
          '.DraftEditor-root',
          '.public-DraftEditor-content[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]'
        ],
        submitButton: [
          '[data-testid="tweetButtonInline"]',
          '[data-testid="tweetButton"]',
          '[data-testid="tweetButton"][role="button"]',
          'button[data-testid="tweetButton"]'
        ],
        comments: '[data-testid="tweet"] [data-testid="tweetText"], [data-testid="tweetText"]'
      },
      facebook: {
        commentInput: [
          '[contenteditable="true"][data-text="Write a comment..."]',
          '[aria-label*="Write a comment"]',
          '[placeholder*="Write a comment"]',
          '.notranslate[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]'
        ],
        submitButton: [
          '[type="submit"][value="Post"]',
          '[aria-label*="Post"]',
          'button[type="submit"]'
        ],
        comments: '[data-testid="post_message"], [data-ad-preview="message"]'
      },
      instagram: {
        commentInput: [
          'textarea[placeholder="Add a comment..."]',
          'textarea[aria-label="Add a comment..."]',
          'textarea[placeholder*="comment"]',
          'form textarea',
          'textarea',
          'input[placeholder*="comment"]',
          '[contenteditable="true"][aria-label*="comment"]',
          '[contenteditable="true"]'
        ],
        submitButton: [
          'button[type="submit"]',
          '[aria-label*="Post"]',
          'form button'
        ],
        comments: '[role="button"] span'
      },
      linkedin: {
        commentInput: [
          '[data-placeholder="Add a comment..."]',
          '.ql-editor',
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]'
        ],
        submitButton: [
          '[data-control-name="comment.post"]',
          '.comments-comment-box__submit-button',
          'button[type="submit"]'
        ],
        comments: '.feed-shared-text, .comments-comment-item__main-content'
      },
      reddit: {
        commentInput: [
          '[data-testid="comment-submission-form-richtext"]',
          '.public-DraftEditor-content',
          '.DraftEditor-root .public-DraftEditor-content',
          'div[contenteditable="true"]'
        ],
        submitButton: [
          '[type="submit"][form*="comment"]',
          '.c-btn--primary',
          'button[aria-label*="Comment"]'
        ],
        comments: '[data-testid="comment"] .md, .usertext-body .md'
      },
      youtube: {
        commentInput: [
          '#placeholder-area',
          '#contenteditable-root',
          '#textbox[contenteditable="true"]',
          'div[contenteditable="true"]'
        ],
        submitButton: [
          '#submit-button button',
          '.ytd-commentbox button',
          'button[aria-label*="Comment"]'
        ],
        comments: '#content-text, .ytd-comment-renderer #content-text'
      },
      tiktok: {
        commentInput: [
          '[data-e2e="comment-input"]',
          '[placeholder*="comment"]',
          'input[placeholder*="Add comment"]',
          'div[contenteditable="true"]'
        ],
        submitButton: [
          '[data-e2e="comment-post"]',
          '[data-e2e="comment-submit"]',
          'button[type="submit"]'
        ],
        comments: '[data-e2e="comment-level-1"] p, .comment-text'
      }
    };

    return selectors[this.platform] || {};
  }

  initializeMonitoring() {
    this.log('Initializing monitoring...');
    
    // Add small delay to ensure DOM is ready
    setTimeout(() => {
      // Monitor for user comment inputs ONLY
      this.observeCommentInputs();
      
      // Handle page navigation (SPA)
      this.observePageChanges();
      
      // Attach listeners to existing inputs
      this.attachCommentListeners();
      
      this.log('Monitoring initialized successfully');
    }, 1000);
  }

  observeCommentInputs() {
    if (!this.commentSelectors.commentInput) return;

    // Create observer for comment inputs
    const inputObserver = new MutationObserver(() => {
      this.attachCommentListeners();
    });

    // Observe DOM changes to catch dynamically loaded inputs
    inputObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Attach listeners to existing inputs
    this.attachCommentListeners();
  }

  attachCommentListeners() {
    if (!this.commentSelectors.commentInput) {
      this.log('No comment input selectors defined for this platform', 'warn');
      return;
    }

    let foundInputs = [];
    
    // Try each selector until we find inputs
    const inputSelectors = Array.isArray(this.commentSelectors.commentInput) 
      ? this.commentSelectors.commentInput 
      : [this.commentSelectors.commentInput];
    
    this.log(`Trying ${inputSelectors.length} selectors for platform: ${this.platform}`);
    
    inputSelectors.forEach(selector => {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        this.log(`✅ Selector "${selector}" found ${inputs.length} inputs`);
      }
      foundInputs.push(...inputs);
    });
    
    // FALLBACK: If no inputs found with platform-specific selectors, try generic ones
    if (foundInputs.length === 0) {
      this.log('No inputs found with platform selectors, trying generic fallbacks...');
      const genericSelectors = [
        'textarea',
        'input[type="text"]',
        'div[contenteditable="true"]',
        '[contenteditable="true"]',
        '[role="textbox"]'
      ];
      
      genericSelectors.forEach(selector => {
        const inputs = document.querySelectorAll(selector);
        if (inputs.length > 0) {
          this.log(`✅ Generic selector "${selector}" found ${inputs.length} inputs`);
          // Only add inputs that look like comment fields
          inputs.forEach(input => {
            const placeholder = input.placeholder || input.getAttribute('aria-label') || '';
            if (placeholder.toLowerCase().includes('comment') || 
                placeholder.toLowerCase().includes('reply') ||
                placeholder.toLowerCase().includes('post') ||
                input.tagName === 'TEXTAREA') {
              foundInputs.push(input);
            }
          });
        }
      });
    }
    
    this.log(`Found ${foundInputs.length} potential comment inputs`);
    
    foundInputs.forEach((input, index) => {
      if (input.dataset.treeGrowthAttached) return;
      input.dataset.treeGrowthAttached = 'true';

      this.log(`Attaching listeners to input ${index + 1}`);

      // Track when user starts typing
      input.addEventListener('focus', () => {
        this.isUserCommenting = true;
        this.log('User started commenting');
        this.currentInput = input;
        this.showTooltip(input);
      });

      input.addEventListener('blur', () => {
        setTimeout(() => {
          this.isUserCommenting = false;
          this.log('User stopped commenting');
          this.hideTooltip();
        }, 1000);
      });

      // Track input changes
      input.addEventListener('input', () => {
        const text = input.value || input.textContent || input.innerText || '';
        this.lastTypedText = text.trim(); // Track what user is typing
        this.log(`Input detected: \"${this.lastTypedText}\"`);
        this.handleLivePreview(input);
      });

      // Monitor submit buttons
      this.attachSubmitListeners(input);
    });

    // Also try generic selectors as fallback
    this.attachGenericListeners();
  }

  attachGenericListeners() {
    // Generic fallback selectors - only for comment inputs
    const genericSelectors = [
      'div[contenteditable=\"true\"]',
      'textarea[placeholder*=\"comment\" i]',
      'input[placeholder*=\"comment\" i]',
      '[role=\"textbox\"]',
      'textarea[aria-label*=\"comment\" i]'
    ];

    genericSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (!element.dataset.treeGrowthAttached) {
          element.dataset.treeGrowthAttached = 'true';
          
          element.addEventListener('focus', () => {
            this.isUserCommenting = true;
            this.log(`Generic input focused: ${selector}`);
            this.currentInput = element;
          });

          element.addEventListener('blur', () => {
            setTimeout(() => {
              this.isUserCommenting = false;
              this.log('Generic input blurred');
              this.hideTooltip();
            }, 1000);
          });

          element.addEventListener('input', () => {
            const text = element.value || element.textContent || element.innerText;
            this.log(`Generic input change: "${text.substring(0, 50)}..."`);
            this.handleLivePreview(element);
          });
        }
      });
    });
  }

  attachSubmitListeners(input) {
    // Find submit buttons
    let foundButtons = [];
    
    const buttonSelectors = Array.isArray(this.commentSelectors.submitButton) 
      ? this.commentSelectors.submitButton 
      : [this.commentSelectors.submitButton];
    
    buttonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      foundButtons.push(...buttons);
    });

    // Also look for nearby submit buttons
    const nearbyButtons = input.parentElement?.querySelectorAll('button') || [];
    foundButtons.push(...nearbyButtons);

    this.log(`Found ${foundButtons.length} potential submit buttons`);
    
    foundButtons.forEach((button, index) => {
      if (button.dataset.treeGrowthAttached) return;
      button.dataset.treeGrowthAttached = 'true';

      this.log(`Attaching submit listener to button ${index + 1}: "${button.textContent?.trim()}"`);

      button.addEventListener('click', (e) => {
        this.log('Submit button clicked');
        if (this.isUserCommenting) {
          setTimeout(() => {
            this.captureUserComment(input);
          }, 500);
        }
      });
    });

    // Listen for Enter key on inputs
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.log(`Enter key pressed (Ctrl: ${e.ctrlKey}, Meta: ${e.metaKey}, Shift: ${e.shiftKey})`);
        
        // Different platforms have different Enter behaviors
        const shouldSubmit = this.platform === 'twitter' ? 
          (e.ctrlKey || e.metaKey) : // Twitter: Ctrl/Cmd+Enter
          !e.shiftKey; // Others: Enter (unless Shift+Enter for new line)
        
        if (shouldSubmit) {
          this.log('Enter key should submit comment');
          setTimeout(() => {
            this.captureUserComment(input);
          }, 500);
        }
      }
    });

    // Also listen for form submissions
    const form = input.closest('form');
    if (form && !form.dataset.treeGrowthAttached) {
      form.dataset.treeGrowthAttached = 'true';
      form.addEventListener('submit', (e) => {
        this.log('Form submitted');
        setTimeout(() => {
          this.captureUserComment(input);
        }, 500);
      });
    }
  }

  captureUserComment(input) {
    const commentText = this.extractTextFromInput(input);
    
    this.log(`Attempting to capture comment: \"${commentText}\"`);
    this.log(`Last typed text: \"${this.lastTypedText}\"`);
    this.log(`Last captured text: \"${this.lastCapturedText}\"`);
    this.log(`isUserCommenting: ${this.isUserCommenting}`);
    
    // IMPROVED VALIDATION:
    // 1. Text must not be empty
    // 2. Text must match what user was typing (prevents capturing page content)
    // 3. Text must not be a duplicate of the last captured comment
    if (commentText && commentText.trim().length > 0) {
      // Check if this matches what the user was typing OR if user was recently commenting
      const matchesTypedText = commentText === this.lastTypedText;
      const recentlyCommenting = this.isUserCommenting;
      const notDuplicate = commentText !== this.lastCapturedText;
      
      if ((matchesTypedText || recentlyCommenting) && notDuplicate) {
        this.log(`✅ Capturing USER comment (${commentText.length} chars): \"${commentText.substring(0, 50)}...\"`);
        
        this.sendCommentToBackground({
          text: commentText.trim(),
          platform: this.platform,
          url: window.location.href,
          type: 'user_comment',
          timestamp: new Date().toISOString()
        });
        
        // Show visual feedback
        this.showCommentFeedback(commentText);
        
        // Update last captured text to prevent duplicates
        this.lastCapturedText = commentText;
        
        // Reset flags
        this.isUserCommenting = false;
        this.lastTypedText = '';
      } else {
        this.log(`❌ NOT capturing - matchesTyped: ${matchesTypedText}, recentlyCommenting: ${recentlyCommenting}, notDuplicate: ${notDuplicate}`, 'warn');
      }
    } else {
      this.log(`❌ NOT capturing - text is empty`, 'warn');
    }
  }

  extractTextFromInput(input) {
    let text = '';
    
    // Try different methods to get text content
    if (input.value !== undefined && input.value !== null) {
      text = input.value;
      this.log(`Extracted from input.value: "${text}"`);
    } else if (input.textContent) {
      text = input.textContent;
      this.log(`Extracted from textContent: "${text}"`);
    } else if (input.innerText) {
      text = input.innerText;
      this.log(`Extracted from innerText: "${text}"`);
    } else if (input.innerHTML) {
      // For contenteditable divs, remove HTML tags
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = input.innerHTML;
      text = tempDiv.textContent || tempDiv.innerText || '';
      this.log(`Extracted from innerHTML: "${text}"`);
    }

    // Clean up the text
    text = text.trim();
    
    // Remove common placeholder text
    const placeholders = [
      'Write a comment...',
      'Add a comment...',
      'What\'s on your mind?',
      'Tweet your reply',
      'Post your reply'
    ];
    
    if (placeholders.includes(text)) {
      this.log('Text appears to be placeholder text, ignoring');
      return '';
    }
    
    return text;
  }

  observePageChanges() {
    // Handle SPA navigation
    let currentUrl = window.location.href;
    
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        
        this.log('Page navigation detected, re-attaching listeners');
        
        // Re-attach listeners to new comment inputs on the new page
        setTimeout(() => {
          this.attachCommentListeners();
        }, 1000);
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  sendCommentToBackground(commentData) {
    this.log(`Sending comment to background: ${JSON.stringify(commentData)}`);
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'NEW_COMMENT',
        data: commentData
      }).then(response => {
        this.log('Comment sent successfully', response);
      }).catch(error => {
        this.log(`Error sending comment to background: ${error}`, 'error');
      });
    } else {
      this.log('Chrome runtime not available', 'error');
    }
  }

  showCommentFeedback(commentText = '') {
    this.log('Showing comment feedback');
    
    // Create and show a small visual feedback indicator
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 300px;
    `;
    
    const shortText = commentText.length > 30 ? commentText.substring(0, 30) + '...' : commentText;
    feedback.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div>🌱</div>
        <div>
          <div style="font-weight: 600;">Comment Detected!</div>
          <div style="font-size: 12px; opacity: 0.9;">"${shortText}"</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 4000);
  }

  showTooltip(input) {
    // Safety check
    if (!input || !input.parentNode) {
      this.log('Cannot show tooltip: input or parentNode is null', 'warn');
      return;
    }

    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.remove();
    }

    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4ade80, #22c55e);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    this.tooltip.textContent = '🌱 Comment Detected!';

    try {
      input.parentNode.appendChild(this.tooltip);

      // Animate in
      setTimeout(() => {
        if (this.tooltip) {
          this.tooltip.style.opacity = '1';
        }
      }, 100);
    } catch (error) {
      this.log(`Error showing tooltip: ${error}`, 'error');
    }
  }

  hideTooltip() {
    if (this.tooltip && this.tooltip.parentNode) {
      try {
        this.tooltip.style.opacity = '0';
        setTimeout(() => {
          if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
          }
          this.tooltip = null;
        }, 300);
      } catch (error) {
        this.log(`Error hiding tooltip: ${error}`, 'error');
        this.tooltip = null;
      }
    }
  }

  handleLivePreview(input) {
    // Clear existing timeout
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }
    
    // Debounce the preview analysis (wait 500ms after user stops typing)
    this.previewTimeout = setTimeout(async () => {
      const commentText = this.extractTextFromInput(input);
      
      if (!commentText || commentText.trim().length < 3) {
        this.hideTooltip();
        return;
      }
      
      this.log(`Requesting live preview for: "${commentText.substring(0, 50)}..."`);
      
      try {
        // Request sentiment analysis from background
        const response = await chrome.runtime.sendMessage({
          type: 'ANALYZE_COMMENT',
          comment: commentText.trim()
        });
        
        if (response && response.success && response.analysis) {
          this.log('Live preview analysis received:', response.analysis);
          this.updateTooltip(response.analysis);
        }
      } catch (error) {
        this.log(`Error getting live preview: ${error}`, 'error');
      }
    }, 500);
  }

  createTooltipEl() {
    const tooltip = document.createElement('div');
    tooltip.className = 'tree-growth-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      color: #111827;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      min-width: 200px;
      border: 2px solid #e5e7eb;
    `;
    return tooltip;
  }

  updateTooltip(analysis) {
    if (!this.tooltip) {
      this.tooltip = this.createTooltipEl();
      document.body.appendChild(this.tooltip);
    }

    const { sentiment, impact, waterDrops, poisonDrops, category } = analysis;
    
    // Determine colors and messages based on sentiment
    let bgColor, textColor, emoji, message, borderColor;
    
    if (sentiment === 'positive') {
      bgColor = 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
      textColor = '#166534';
      borderColor = '#22c55e';
      emoji = '💧';
      message = `Positive! +${waterDrops} water`;
    } else if (sentiment === 'negative') {
      bgColor = 'linear-gradient(135deg, #fee2e2, #fecaca)';
      textColor = '#991b1b';
      borderColor = '#ef4444';
      emoji = '☠️';
      message = `Toxic! +${poisonDrops} poison`;
    } else {
      bgColor = 'linear-gradient(135deg, #f3f4f6, #e5e7eb)';
      textColor = '#374151';
      borderColor = '#9ca3af';
      emoji = '😐';
      message = 'Neutral';
    }
    
    this.tooltip.style.background = bgColor;
    this.tooltip.style.color = textColor;
    this.tooltip.style.borderColor = borderColor;
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 24px;">${emoji}</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">${message}</div>
          <div style="font-size: 11px; opacity: 0.8;">${category || sentiment}</div>
        </div>
      </div>
    `;
    
    // Animate in
    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
      }
    }, 50);
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TreeGrowthContentScript();
  });
} else {
  new TreeGrowthContentScript();
}