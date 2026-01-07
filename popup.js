// Main popup script for Tree Growth extension

// This is a simple loader that will be replaced by the React build output
// In a real extension, you would build your React app and include the bundled JS here

// For now, we'll create a simple interface until the React app is properly bundled
class TreeGrowthPopup {
  constructor() {
    this.data = null;
    this.isMonitoring = true;
    this.currentPlatform = '';
    this.isSignedUp = false;
    this.userData = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      await this.detectCurrentPlatform();
      this.render();
      this.setupEventListeners();
      this.setupStorageListener();
      
      // Listen for real-time updates
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'COMMENT_PROCESSED') {
          this.loadData().then(() => this.render());
        }
      });
      
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.renderError();
    }
  }

  setupStorageListener() {
    // Listen for storage changes (live updates even if no runtime message arrives)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.treeGrowthData) {
        this.loadData().then(() => this.render());
      }
    });
  }

  async loadData() {
    try {
      // Check if user is signed up
      const result = await chrome.storage.local.get(['treeGrowth_userData']);
      if (result.treeGrowth_userData) {
        this.userData = result.treeGrowth_userData;
        this.isSignedUp = true;
      }

      const response = await chrome.runtime.sendMessage({ type: 'GET_USER_DATA' });
      if (response.success) {
        this.data = response.data;
        this.isMonitoring = response.data.isMonitoring !== false;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  async detectCurrentPlatform() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const hostname = new URL(tab.url).hostname.toLowerCase();
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
          this.currentPlatform = 'Twitter/X';
        } else if (hostname.includes('facebook.com')) {
          this.currentPlatform = 'Facebook';
        } else if (hostname.includes('instagram.com')) {
          this.currentPlatform = 'Instagram';
        } else if (hostname.includes('linkedin.com')) {
          this.currentPlatform = 'LinkedIn';
        } else if (hostname.includes('reddit.com')) {
          this.currentPlatform = 'Reddit';
        } else if (hostname.includes('youtube.com')) {
          this.currentPlatform = 'YouTube';
        } else if (hostname.includes('tiktok.com')) {
          this.currentPlatform = 'TikTok';
        }
      }
    } catch (error) {
      console.error('Error detecting platform:', error);
    }
  }

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    // NEW USER - Not signed up yet
    if (!this.isSignedUp) {
      this.renderNewUserLauncher();
      return;
    }

    // EXISTING USER - Show quick stats and launch button
    this.renderExistingUserLauncher();
  }

  renderNewUserLauncher() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div style="
        height: 100%;
        display: flex;
        flex-direction: column;
        background: linear-gradient(to bottom right, #f0fdf4, #dbeafe, #f3e8ff);
        padding: 0;
      ">
        <!-- Header -->
        <div style="
          background: white;
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        ">
          <div style="
            width: 56px;
            height: 56px;
            background: linear-gradient(to bottom right, #4ade80, #3b82f6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            font-size: 28px;
          ">
            🌱
          </div>
          <h1 style="
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 6px 0;
          ">
            Tree Growth Game
          </h1>
          <p style="
            font-size: 13px;
            color: #6b7280;
            margin: 0;
            line-height: 1.4;
          ">
            Transform your social media habits by<br>growing trees with positive comments
          </p>
        </div>

        <!-- Content -->
        <div style="
          flex: 1;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        ">
          <!-- Features -->
          <div style="
            background: white;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #e5e7eb;
          ">
            <h3 style="
              font-size: 14px;
              font-weight: 600;
              color: #111827;
              margin: 0 0 12px 0;
            ">
              How it works:
            </h3>
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
              <div style="display: flex; gap: 10px;">
                <span style="font-size: 18px;">💧</span>
                <div>
                  <strong style="color: #111827;">Positive comments</strong>
                  <div style="color: #6b7280;">Add water drops to grow your tree</div>
                </div>
              </div>
              <div style="display: flex; gap: 10px;">
                <span style="font-size: 18px;">☠️</span>
                <div>
                  <strong style="color: #111827;">Toxic comments</strong>
                  <div style="color: #6b7280;">Add poison that harms your tree</div>
                </div>
              </div>
              <div style="display: flex; gap: 10px;">
                <span style="font-size: 18px;">🎫</span>
                <div>
                  <strong style="color: #111827;">Weekly top 50</strong>
                  <div style="color: #6b7280;">Earn lottery tickets for prizes</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Platform Notice -->
          ${this.currentPlatform ? `
            <div style="
              background: #dbeafe;
              border: 1px solid #60a5fa;
              border-radius: 8px;
              padding: 12px;
              font-size: 12px;
              color: #1e40af;
              text-align: center;
            ">
              📱 Currently on <strong>${this.currentPlatform}</strong><br>
              Your comments will be tracked automatically
            </div>
          ` : ''}

          <!-- CTA Button -->
          <button 
            id="open-signup"
            style="
              width: 100%;
              padding: 16px;
              background: linear-gradient(to right, #22c55e, #16a34a);
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-top: auto;
            "
          >
            <span style="font-size: 20px;">🌱</span>
            Sign Up & Start Growing
          </button>
        </div>
      </div>
    `;

    // Setup event listener
    document.getElementById('open-signup')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    });
  }

  renderExistingUserLauncher() {
    const app = document.getElementById('app');
    if (!app) return;

    const hasTree = this.data?.trees && this.data.trees.length > 0;
    const currentTree = hasTree ? this.data.trees.find(t => t.id === this.data.selectedTree) : null;
    const weeklyStats = this.data?.weeklyStats || { positiveComments: 0, negativeComments: 0, totalComments: 0 };
    const tickets = this.data?.tickets || 0;

    app.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; background: #f8fafc;">
        <!-- Header -->
        <div style="
          background: white;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          text-align: center;
        ">
          <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">
            🌱 Tree Growth
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            Welcome back, ${this.userData?.username || 'Grower'}!
          </div>
        </div>

        <!-- Extension Status -->
        <div style="
          background: #22c55e;
          color: white;
          padding: 10px 16px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
        ">
          🛡️ Extension Active - Tracking Your Comments
        </div>

        <!-- Quick Stats -->
        <div style="padding: 16px;">
          ${hasTree && currentTree ? `
            <!-- Current Tree -->
            <div style="
              background: white;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
              border: 1px solid #e5e7eb;
              text-align: center;
            ">
              <div style="font-size: 48px; margin-bottom: 8px;">
                ${this.getTreeEmoji(currentTree.type, currentTree.growthProgress || 0)}
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                ${currentTree.type} Tree
              </div>
              <div style="display: flex; gap: 8px; justify-content: center; font-size: 11px; color: #6b7280;">
                <span>❤️ ${Math.round(currentTree.health || 100)}% Health</span>
                <span>•</span>
                <span>🌱 ${Math.round(currentTree.growthProgress || 0)}% Growth</span>
              </div>
            </div>
          ` : ''}

          <!-- Weekly Stats Grid -->
          <div style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          ">
            <div style="
              background: white;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              border: 1px solid #e5e7eb;
            ">
              <div style="font-size: 24px; font-weight: 600; color: #22c55e;">
                ${weeklyStats.positiveComments}
              </div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                Positive This Week
              </div>
            </div>
            <div style="
              background: white;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              border: 1px solid #e5e7eb;
            ">
              <div style="font-size: 24px; font-weight: 600; color: #ef4444;">
                ${weeklyStats.negativeComments}
              </div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                Negative This Week
              </div>
            </div>
            <div style="
              background: white;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              border: 1px solid #e5e7eb;
            ">
              <div style="font-size: 24px; font-weight: 600; color: #6b7280;">
                ${weeklyStats.totalComments}
              </div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                Total Comments
              </div>
            </div>
            <div style="
              background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              border: 1px solid #fde047;
            ">
              <div style="font-size: 24px; font-weight: 600; color: #ca8a04;">
                🎫 ${tickets}
              </div>
              <div style="font-size: 10px; color: #78716c; margin-top: 2px;">
                Lottery Tickets
              </div>
            </div>
          </div>

          ${this.currentPlatform ? `
            <div style="
              background: #dbeafe;
              border: 1px solid #60a5fa;
              border-radius: 8px;
              padding: 10px 12px;
              font-size: 11px;
              color: #1e40af;
              text-align: center;
              margin-bottom: 16px;
            ">
              📱 On <strong>${this.currentPlatform}</strong> - Comments being tracked
            </div>
          ` : ''}

          <!-- Main Action Button -->
          <button 
            id="open-full-app"
            style="
              width: 100%;
              padding: 14px;
              background: linear-gradient(to right, #3b82f6, #2563eb);
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            "
          >
            ${hasTree ? '🌳 View Full Tree Progress' : '🌱 Plant Your First Tree'}
          </button>
        </div>
      </div>
    `;

    // Setup event listener
    document.getElementById('open-full-app')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    });
  }

  getTreeEmoji(treeType, growth) {
    const type = treeType.toLowerCase();
    if (growth < 20) return '🌱';
    if (growth < 40) return '🌿';
    if (growth < 60) return '🌳';
    if (growth < 80) return '🌳';
    
    // Full grown with fruit
    const emojiMap = {
      'apple': '🍎',
      'orange': '🍊',
      'coconut': '🥥',
      'cherry': '🍒',
      'lemon': '🍋',
      'peach': '🍑'
    };
    return emojiMap[type] || '🌳';
  }

  showError() {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          background: #f8fafc;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div style="font-size: 16px; font-weight: 600; color: #ef4444; margin-bottom: 8px;">
            Failed to load extension
          </div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 20px;">
            There was a problem loading your data
          </div>
          <button id="retry-btn" style="
            padding: 10px 20px; 
            background: #3b82f6; 
            color: white;
            border: none;
            border-radius: 6px; 
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          ">
            Retry
          </button>
        </div>
      `;
      
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          location.reload();
        });
      }
    }
  }

  renderTrees() {
    if (!this.data.trees || this.data.trees.length === 0) return '';

    return this.data.trees.map(tree => {
      const isSelected = tree.id === this.data.selectedTree;
      const healthPercent = Math.round(tree.health || 100);
      const growthPercent = Math.round(tree.growthProgress || 0);

      return `
        <div class="tree-card ${isSelected ? 'selected' : ''}">
          <div class="tree-header">
            <div class="tree-name">${tree.type} Tree</div>
            <div class="tree-status">Growing</div>
          </div>

          <div class="tree-visual">
            <div class="tree-emoji">🌱</div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">Health</span>
              <span class="progress-value">${healthPercent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill health" style="width: ${healthPercent}%"></div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">Growth</span>
              <span class="progress-value">${growthPercent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill growth" style="width: ${growthPercent}%"></div>
            </div>
          </div>

          <div class="drops-container">
            <span>💧 ${tree.waterDrops || 0}</span>
            <span>☠️ ${tree.poisonDrops || 0}</span>
          </div>

          ${isSelected ? `
            <button class="tree-button selected">Currently Selected</button>
          ` : `
            <button class="tree-button select" data-tree-id="${tree.id}">Select Tree</button>
          `}
        </div>
      `;
    }).join('');
  }

  renderNoTrees() {
    return `
      <div class="no-trees">
        <h3>No Trees Yet</h3>
        <p>Start by planting your first tree to begin growing!</p>
        <button id="plant-first-tree" class="action-button primary">🌱 Plant Your First Tree</button>
      </div>
    `;
  }

  renderTreeStatus() {
    if (!this.data.selectedTree || this.data.trees.length === 0) {
      return `
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">No Tree Selected</div>
          <div style="font-size: 12px; color: #6b7280;">Select a tree to start growing!</div>
        </div>
      `;
    }

    const tree = this.data.trees.find(t => t.id === this.data.selectedTree);
    if (!tree) return '';

    const statusColor = tree.status === 'growing' ? '#10b981' : '#ef4444';
    const healthColor = tree.health > 60 ? '#10b981' : tree.health > 30 ? '#f59e0b' : '#ef4444';

    return `
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 14px; font-weight: 500;">${tree.type} Tree</span>
          <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
            ${tree.status}
          </span>
        </div>
        
        ${tree.status === 'growing' ? `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 12px; color: #6b7280;">Health</span>
              <span style="font-size: 12px; font-weight: 500;">${tree.health}%</span>
            </div>
            <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 6px;">
              <div style="background: ${healthColor}; height: 6px; border-radius: 4px; width: ${tree.health}%; transition: width 0.3s;"></div>
            </div>
          </div>
          
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 12px; color: #6b7280;">Growth</span>
              <span style="font-size: 12px; font-weight: 500;">${tree.growthProgress || 0}%</span>
            </div>
            <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 6px;">
              <div style="background: #3b82f6; height: 6px; border-radius: 4px; width: ${tree.growthProgress || 0}%; transition: width 0.3s;"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderRecentComments() {
    if (!this.data.commentHistory || this.data.commentHistory.length === 0) {
      return `
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 12px; color: #6b7280;">No recent comments</div>
        </div>
      `;
    }

    const recentComments = this.data.commentHistory.slice(0, 3);
    
    return `
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px;">Recent Activity</div>
        <div style="max-height: 120px; overflow-y: auto;">
          ${recentComments.map(comment => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
              <span style="
                background: ${comment.sentiment === 'positive' ? '#dcfce7' : '#fee2e2'}; 
                color: ${comment.sentiment === 'positive' ? '#166534' : '#dc2626'}; 
                padding: 2px 6px; 
                border-radius: 8px; 
                font-weight: 500;
                min-width: fit-content;
              ">
                ${comment.sentiment === 'positive' ? '💧' : '☠️'} +${comment.impact}
              </span>
              <span style="color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${comment.text.substring(0, 30)}...
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Monitoring toggle
    const monitoringToggle = document.getElementById('monitoring-toggle');
    if (monitoringToggle) {
      monitoringToggle.addEventListener('change', async (e) => {
        this.isMonitoring = e.target.checked;
        await this.toggleMonitoring(this.isMonitoring);
        this.render();
      });
    }

    // Open full app button
    const openFullAppBtn = document.getElementById('open-full-app');
    if (openFullAppBtn) {
      openFullAppBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      });
    }

    // Select tree buttons
    document.querySelectorAll('.tree-button.select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const treeId = e.target.getAttribute('data-tree-id');
        this.selectTree(treeId);
      });
    });

    // Plant new tree button
    const plantBtn = document.getElementById('plant-new-tree');
    if (plantBtn) {
      plantBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      });
    }

    // Plant first tree button
    const plantFirstBtn = document.getElementById('plant-first-tree');
    if (plantFirstBtn) {
      plantFirstBtn.addEventListener('click', () => {
        this.renderFirstTimeSetup();
      });
    }
  }

  async selectTree(treeId) {
    if (!this.data) return;
    
    this.data.selectedTree = treeId;
    
    try {
      await chrome.runtime.sendMessage({ 
        type: 'UPDATE_USER_DATA', 
        data: this.data 
      });
      this.render();
    } catch (error) {
      console.error('Error selecting tree:', error);
    }
  }

  async toggleMonitoring(enabled) {
    if (this.data) {
      const updatedData = { ...this.data, isMonitoring: enabled };
      try {
        await chrome.runtime.sendMessage({ 
          type: 'UPDATE_USER_DATA', 
          data: updatedData 
        });
        this.data = updatedData;
      } catch (error) {
        console.error('Error updating monitoring setting:', error);
      }
    }
  }

  renderSignupForm() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(to bottom right, #f0fdf4, #dbeafe); height: 100%; overflow-y: auto;">
        <div style="background: white; border-radius: 12px; padding: 24px; max-width: 100%; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(to bottom right, #4ade80, #3b82f6); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px;">
              🌱
            </div>
            <h1 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 6px;">
              Welcome to Tree Growth
            </h1>
            <p style="font-size: 12px; color: #6b7280;">
              Create your account to start growing
            </p>
          </div>

          <!-- Info Alert -->
          <div style="background: #dbeafe; border: 1px solid #60a5fa; border-radius: 6px; padding: 10px; margin-bottom: 16px; display: flex; gap: 6px; font-size: 11px; color: #1e40af;">
            <span>📧</span>
            <div>Email is only for lottery prizes. We never share your data.</div>
          </div>

          <!-- Signup Form -->
          <form id="signup-form-popup">
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px;">
                Username
              </label>
              <input 
                type="text" 
                id="username-input-popup"
                placeholder="Enter username"
                required
                minlength="3"
                maxlength="20"
                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;"
              />
              <div id="username-error-popup" style="color: #dc2626; font-size: 10px; margin-top: 3px; display: none;"></div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px;">
                Email
              </label>
              <input 
                type="email" 
                id="email-input-popup"
                placeholder="your.email@example.com"
                required
                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;"
              />
              <div id="email-error-popup" style="color: #dc2626; font-size: 10px; margin-top: 3px; display: none;"></div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
                For lottery prize payments if you win
              </div>
            </div>

            <button 
              type="submit"
              style="width: 100%; padding: 10px; background: linear-gradient(to right, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
              Create Account & Start
            </button>

            <div style="text-align: center; font-size: 10px; color: #6b7280; margin-top: 10px;">
              By signing up, you agree to positive commenting
            </div>
          </form>
        </div>
      </div>
    `;

    // Add form submit handler
    const form = document.getElementById('signup-form-popup');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username-input-popup').value.trim();
        const email = document.getElementById('email-input-popup').value.trim().toLowerCase();
        
        const usernameError = document.getElementById('username-error-popup');
        const emailError = document.getElementById('email-error-popup');
        
        // Reset errors
        usernameError.style.display = 'none';
        emailError.style.display = 'none';
        
        // Validate
        let hasErrors = false;
        
        if (username.length < 3) {
          usernameError.textContent = 'Username must be at least 3 characters';
          usernameError.style.display = 'block';
          hasErrors = true;
        } else if (username.length > 20) {
          usernameError.textContent = 'Username must be less than 20 characters';
          usernameError.style.display = 'block';
          hasErrors = true;
        }
        
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          emailError.textContent = 'Please enter a valid email address';
          emailError.style.display = 'block';
          hasErrors = true;
        }
        
        if (!hasErrors) {
          // Save user data
          const userData = {
            username,
            email,
            signupDate: new Date().toISOString(),
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          await chrome.storage.local.set({ treeGrowth_userData: userData });
          
          // Add to all users list for CSV export
          const result = await chrome.storage.local.get(['treeGrowth_allUsers']);
          const allUsers = result.treeGrowth_allUsers || [];
          allUsers.push(userData);
          await chrome.storage.local.set({ treeGrowth_allUsers: allUsers });
          
          this.userData = userData;
          this.isSignedUp = true;
          await this.loadData();
          this.render();
        }
      });
    }
  }

  renderFirstTimeSetup() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #ffffff; height: 100%; overflow-y: auto;">
        <!-- Welcome Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🌱</div>
          <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #111827;">Welcome to Tree Growth!</h1>
          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
            Transform your social media habits by growing virtual trees with positive comments!
          </p>
        </div>

        <!-- Tree Selection -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: center;">
            Choose Your First Tree
          </h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${this.renderTreeOptions()}
          </div>
        </div>

        <!-- How it Works -->
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0369a1;">How it works:</h4>
          <ul style="margin: 0; padding-left: 16px; color: #0369a1; font-size: 12px; line-height: 1.4;">
            <li>💧 Positive comments add water drops</li>
            <li>☠️ Negative comments add poison drops</li>
            <li>🌳 Water helps your tree grow and stay healthy</li>
            <li>🎫 Earn lottery tickets for weekly top 50</li>
          </ul>
        </div>

        <!-- Action Button -->
        <div style="text-align: center;">
          <button id="complete-onboarding" style="
            width: 100%;
            padding: 12px;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            opacity: 0.5;
          " disabled>
            Start Growing Trees
          </button>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
            Select a tree to get started
          </p>
        </div>
      </div>
    `;

    this.setupFirstTimeListeners();
  }

  renderTreeOptions() {
    const treeTypes = [
      { name: 'Apple', emoji: '🍎', difficulty: 'Easy', weeks: '6-8' },
      { name: 'Orange', emoji: '🍊', difficulty: 'Easy', weeks: '6-8' },
      { name: 'Cherry', emoji: '🍒', difficulty: 'Medium', weeks: '8-10' },
      { name: 'Lemon', emoji: '🍋', difficulty: 'Medium', weeks: '8-10' },
      { name: 'Coconut', emoji: '🥥', difficulty: 'Hard', weeks: '10-12' },
      { name: 'Peach', emoji: '🍑', difficulty: 'Hard', weeks: '10-12' }
    ];

    return treeTypes.map(tree => `
      <button class="tree-option" data-tree-type="${tree.name}" style="
        padding: 16px 12px;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
      ">
        <div style="font-size: 24px; margin-bottom: 8px;">${tree.emoji}</div>
        <div style="font-size: 13px; font-weight: 500; color: #111827; margin-bottom: 4px;">${tree.name}</div>
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${tree.difficulty}</div>
        <div style="font-size: 10px; color: #9ca3af;">${tree.weeks} weeks</div>
      </button>
    `).join('');
  }

  setupFirstTimeListeners() {
    let selectedTreeType = null;

    // Tree selection
    document.querySelectorAll('.tree-option').forEach(button => {
      button.addEventListener('click', (e) => {
        // Remove previous selection
        document.querySelectorAll('.tree-option').forEach(btn => {
          btn.style.borderColor = '#e5e7eb';
          btn.style.background = '#f9fafb';
        });

        // Highlight selected
        button.style.borderColor = '#22c55e';
        button.style.background = '#f0fdf4';

        selectedTreeType = button.getAttribute('data-tree-type');

        // Enable start button
        const startBtn = document.getElementById('complete-onboarding');
        if (startBtn) {
          startBtn.style.opacity = '1';
          startBtn.disabled = false;
        }
      });

      // Hover effects
      button.addEventListener('mouseenter', () => {
        if (!button.style.borderColor.includes('22c55e')) {
          button.style.transform = 'translateY(-2px)';
          button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (!button.style.borderColor.includes('22c55e')) {
          button.style.transform = 'translateY(0)';
          button.style.boxShadow = 'none';
        }
      });
    });

    // Complete onboarding
    const completeBtn = document.getElementById('complete-onboarding');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        if (selectedTreeType) {
          await this.completeOnboarding(selectedTreeType);
        }
      });
    }
  }

  async completeOnboarding(treeType) {
    if (!this.data) return;

    // Create first tree
    const newTree = {
      id: `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: treeType,
      status: 'growing',
      health: 100,
      growthProgress: 0,
      waterDrops: 0,
      poisonDrops: 0,
      plantedDate: new Date().toISOString()
    };

    // Update data
    this.data.trees = [newTree];
    this.data.selectedTree = newTree.id;
    this.data.isFirstTime = false;
    this.data.hasCompletedOnboarding = true;

    try {
      await chrome.runtime.sendMessage({ 
        type: 'UPDATE_USER_DATA', 
        data: this.data 
      });
      
      // Re-render the main interface
      this.render();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TreeGrowthPopup();
  });
} else {
  new TreeGrowthPopup();
}