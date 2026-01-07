// Extension TreeGarden - Convert React component to vanilla JS

class TreeGrowthExtension {
  constructor() {
    this.data = null;
    this.isSignedUp = false;
    this.userData = null;
    this.selectedTree = null;
    this.treeState = {
      health: 100,
      growth: 0,
      daysGrown: 1,
      totalDays: 56,
      waterDrops: 0,
      toxicDrops: 0,
      hasFruit: false,
      isDead: false,
      isCommitted: false
    };
    this.comments = [];
    this.showCelebration = false;
    this.showLeaderboard = false;
    this.showSocialConnections = false;
    this.showMonthlyLottery = false;
    
    // 🎮 DEMO MODE - Set to true to test lottery with tickets
    this.DEMO_MODE = true;
    this.monthlyTickets = 0; // Will be loaded from storage
    this.weeklyRanking = 99; // Will be calculated from real data
    
    // Social media connections state
    this.platformConnections = {};
    
    this.isSpinning = false;
    this.spinResult = null;
    this.components = new ExtensionComponents();
    this.init();
  }

  async init() {
      try {
        await this.loadData();
        this.render();
        this.hideLoading();
        this.setupStorageListener();
        
        // Listen for real-time updates
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === 'COMMENT_PROCESSED') {
            this.loadData().then(() => this.render());
          }
        });
        
        // NEW: Start periodic backend sync
        if (this.userData?.extensionUserId) {
          // Initial sync
          await this.syncWithBackend();
          
          // Sync every 5 minutes
          setInterval(() => {
            this.syncWithBackend();
          }, 5 * 60 * 1000);
        }
        
      } catch (error) {
        console.error('Error initializing extension app:', error);
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
      console.log('Loading user data...');
      
      // Check if user is signed up
      const result = await chrome.storage.local.get(['treeGrowth_userData', 'platformConnections']);
      if (result.treeGrowth_userData) {
        this.userData = result.treeGrowth_userData;
        this.isSignedUp = true;
      }
      
      // Load platform connections
      if (result.platformConnections) {
        this.platformConnections = result.platformConnections;
      } else {
        // Initialize default connections (Twitter and Instagram connected)
        this.platformConnections = {
          twitter: { connected: true, enabled: true },
          instagram: { connected: true, enabled: false },
          facebook: { connected: false, enabled: false },
          linkedin: { connected: false, enabled: false },
          reddit: { connected: false, enabled: false },
          youtube: { connected: false, enabled: false },
          tiktok: { connected: false, enabled: false }
        };
        await chrome.storage.local.set({ platformConnections: this.platformConnections });
      }

      const response = await chrome.runtime.sendMessage({ type: 'GET_USER_DATA' });
      console.log('Background response:', response);
      
      if (response && response.success) {
        this.data = response.data;
        
        // Load comment history
        if (this.data.commentHistory && this.data.commentHistory.length > 0) {
          this.comments = this.data.commentHistory.map(c => ({
            text: c.text,
            sentiment: c.sentiment,
            impact: c.impact,
            timestamp: c.timestamp,
            platform: c.platform
          }));
        }
        
        // Calculate live monthly tickets (Demo mode gives 4 tickets for testing)
        if (this.DEMO_MODE) {
          this.monthlyTickets = 4;
        } else {
          this.monthlyTickets = this.data.tickets || 0;
        }
        
        // Calculate live weekly ranking (Demo mode gives rank #12 for testing)
        if (this.DEMO_MODE) {
          this.weeklyRanking = 12;
        } else {
          this.weeklyRanking = this.calculateWeeklyRanking(this.data.weeklyStats);
        }
        
        // Initialize selected tree if we have trees
        if (this.data.trees.length > 0 && this.data.selectedTree) {
          this.selectedTree = this.components.getTreeById(
            this.data.trees.find(t => t.id === this.data.selectedTree)?.type?.toLowerCase()
          );
          
          // Update tree state from LIVE data
          const currentTree = this.data.trees.find(t => t.id === this.data.selectedTree);
          if (currentTree) {
            this.treeState = {
              health: currentTree.health || 100,
              growth: currentTree.growthProgress || 0,
              daysGrown: this.calculateDaysGrown(currentTree.plantedDate),
              totalDays: this.getTotalDaysForTree(currentTree.type),
              waterDrops: currentTree.waterDrops || 0,
              toxicDrops: currentTree.poisonDrops || 0,
              hasFruit: (currentTree.growthProgress || 0) >= 90 && (currentTree.health || 100) >= 70,
              isDead: (currentTree.health || 100) <= 0,
              isCommitted: true
            };
            
            console.log('Live tree state loaded:', this.treeState);
          }
        }
      } else {
        console.warn('No response from background script, using default data');
        this.data = this.getDefaultData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.warn('Using default data due to error');
      this.data = this.getDefaultData();
    }
  }

  getDefaultData() {
    return {
      trees: [],
      selectedTree: null,
      isFirstTime: true,
      hasCompletedOnboarding: false,
      weeklyStats: {
        positiveComments: 0,
        negativeComments: 0,
        totalComments: 0,
        currentWeek: new Date().toISOString().slice(0, 10)
      },
      leaderboard: [],
      tickets: 3,
      comments: []
    };
  }

  render() {
    // Show signup form if user hasn't signed up yet
    if (!this.isSignedUp) {
      this.renderSignupForm();
      return;
    }

    // Show first-time setup if no trees
    if (!this.data || this.data.isFirstTime || (!this.data.hasCompletedOnboarding && this.data.trees.length === 0)) {
      this.renderFirstTimeSetup();
      return;
    }

    // Show tree selection if no tree selected
    if (!this.selectedTree) {
      this.renderTreeSelection();
      return;
    }

    // Show different views based on state
    if (this.showLeaderboard) {
      this.renderLeaderboard();
      return;
    }

    if (this.showSocialConnections) {
      this.renderSocialConnections();
      return;
    }

    if (this.showMonthlyLottery) {
      this.renderMonthlyLottery();
      return;
    }

    // Main game view
    this.renderMainGame();
  }

  renderTreeSelection() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = this.components.renderTreeSelection((tree) => {
      this.handleTreeSelection(tree);
    });

    // Attach event listeners after DOM is ready
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      console.log('Attaching tree selection listeners...');
      const cards = document.querySelectorAll('.tree-card');
      const buttons = document.querySelectorAll('.select-tree-btn');
      
      console.log('Found', cards.length, 'tree cards and', buttons.length, 'buttons');
      
      // Button click handlers (higher priority - stop card clicks)
      buttons.forEach((btn, index) => {
        console.log(`Setting up button ${index}:`, btn);
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent card click
          console.log('✅ BUTTON CLICKED!');
          const treeId = btn.getAttribute('data-tree-id');
          console.log('Tree ID:', treeId);
          const tree = this.components.treeTypes.find(t => t.id === treeId);
          console.log('Selected tree from button:', tree);
          if (tree) {
            this.handleTreeSelection(tree);
          } else {
            console.error('Tree not found for ID:', treeId);
          }
        });
        
        // Test if button is visible and clickable
        const rect = btn.getBoundingClientRect();
        console.log(`Button ${index} bounds:`, rect);
      });
      
      // Card click handlers (fallback)
      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          // Only handle if not clicking button
          if (e.target.classList.contains('select-tree-btn')) return;
          console.log('Card clicked (not button)');
          const treeId = card.getAttribute('data-tree-id');
          const tree = this.components.treeTypes.find(t => t.id === treeId);
          console.log('Selected tree from card:', tree);
          if (tree) this.handleTreeSelection(tree);
        });
      });
    }, 100);
  }

  renderMainGame() {
    const app = document.getElementById('app');
    if (!app || !this.selectedTree) return;

    // Calculate real stats from data
    const weeklyStats = this.data?.weeklyStats || { positiveComments: 0, negativeComments: 0, totalComments: 0 };
    const positiveComments = weeklyStats.positiveComments;
    const negativeComments = weeklyStats.negativeComments;
    const totalComments = weeklyStats.totalComments;
    
    // Calculate tickets earned (1 per week in top 50)
    if (!this.DEMO_MODE) {
      this.weeklyRanking = this.calculateUserPosition();
      this.monthlyTickets = this.data?.tickets || 0;
    }
    const currentPosition = this.weeklyRanking;
    const totalUsers = this.getTotalActiveUsers();
    const earnedThisWeekTicket = currentPosition <= 50;

    // Calculate progress
    const daysSinceStart = this.treeState.daysGrown;
    const totalDays = this.treeState.totalDays;

    app.innerHTML = `
      <div class="main-game" style="min-height: 100vh; background: linear-gradient(to bottom right, #f0fdf4, #dbeafe); padding: 1rem;">
        <div style="max-width: 1400px; margin: 0 auto;">
          <!-- Header - Matching React App -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 2rem;">${this.selectedTree.emoji}</span>
              <div>
                <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0;">
                  Growing Your ${this.selectedTree.name}
                </h1>
                <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">
                  Day ${daysSinceStart} of ${totalDays} • Keep growing with thoughtful comments!
                </p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${this.DEMO_MODE ? `
                <span style="
                  padding: 0.25rem 0.75rem;
                  border: 1px solid #f59e0b;
                  border-radius: calc(var(--radius) - 2px);
                  font-size: 0.875rem;
                  background: #fef3c7;
                  color: #92400e;
                  font-weight: 600;
                ">
                  🎮 DEMO MODE
                </span>
              ` : ''}
              <span style="
                padding: 0.25rem 0.75rem;
                border: 1px solid hsl(var(--border));
                border-radius: calc(var(--radius) - 2px);
                font-size: 0.875rem;
                background: white;
              ">
                🔒 Committed
              </span>
              <button class="action-btn" id="social-connections" style="font-size: 0.875rem;">
                📱 Connect Social
              </button>
              <button class="action-btn" id="weekly-rankings" style="font-size: 0.875rem;">
                👥 Weekly Rankings
              </button>
            </div>
          </div>

          <!-- Blue Alert Banner - Matching React App -->
          ${this.treeState.health > 0 && !this.treeState.isDead ? `
            <div style="
              margin-bottom: 1.5rem;
              padding: 1rem 1.5rem;
              background: hsl(221.2 83.2% 96%);
              border: 1px solid hsl(221.2 83.2% 88%);
              border-radius: var(--radius);
              display: flex;
              align-items: flex-start;
              gap: 0.75rem;
            ">
              <span style="font-size: 1rem; flex-shrink: 0;">🔒</span>
              <p style="margin: 0; font-size: 0.875rem; color: hsl(221.2 83.2% 30%);">
                You're committed to growing your ${this.selectedTree.name} for the next ${totalDays} days. 
                Your progress and journey are tied to this tree - make every comment count!
              </p>
            </div>
          ` : ''}

          <!-- Two Column Grid - Matching React App -->
          <div class="main-content-grid">
            <!-- LEFT COLUMN: Tree Visualization + Growth Goals -->
              <div class="left-column">
                <!-- Tree Visualization Card -->
                ${this.components.renderTreeVisualization(
                  this.selectedTree,
                  this.treeState.health,
                  this.treeState.growth,
                  this.treeState.daysGrown,
                  this.treeState.totalDays,
                  this.treeState.waterDrops,
                  this.treeState.toxicDrops,
                  this.treeState.hasFruit
                )}

                <!-- Growth Milestones Card -->
                ${this.components.renderMilestones(
                  this.treeState.growth,
                  this.selectedTree,
                  this.treeState.waterDrops,
                  this.treeState.toxicDrops,
                  this.treeState.daysGrown,
                  this.treeState.totalDays
                )}

                <!-- Growth Goals Card -->
                <div style="
                  background: white;
                  border: 1px solid hsl(var(--border));
                  border-radius: var(--radius);
                  overflow: hidden;
                \">
                  <div style="padding: 1.25rem; border-bottom: 1px solid hsl(var(--border));">
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                      🎯 Growth Goals for Your ${this.selectedTree.name}
                    </h3>
                    <p style="margin: 0; font-size: 0.875rem; color: hsl(var(--muted-foreground));">
                      Complete these goals to make your committed tree bear fruit
                    </p>
                  </div>
                  
                  <div style="padding: 1.25rem;">
                    <!-- Weekly Ranking Badge -->
                    <div style="
                      background: linear-gradient(to right, #dbeafe, #e0e7ff);
                      padding: 1rem;
                      border-radius: var(--radius);
                      border: 1px solid #93c5fd;
                      margin-bottom: 1rem;
                    ">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <div style="
                            background: #2563eb;
                            color: white;
                            padding: 0.5rem 0.75rem;
                            border-radius: 9999px;
                            font-weight: 600;
                            position: relative;
                          ">
                            <span style="margin-right: 0.25rem;">🏆</span>
                            #${currentPosition}
                            <div style="
                              position: absolute;
                              top: -2px;
                              right: -2px;
                              width: 10px;
                              height: 10px;
                              background: #22c55e;
                              border-radius: 9999px;
                              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                            "></div>
                          </div>
                          <div>
                            <div style="font-weight: 500; font-size: 1rem;">Weekly Ranking</div>
                            <div style="font-size: 0.875rem; color: #6b7280;">Among ${this.selectedTree.name} growers</div>
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-size: 1.125rem; font-weight: 700;">${currentPosition > 0 ? `#${currentPosition}` : 'Not ranked'}</div>
                          <div style="font-size: 0.75rem; color: #6b7280;">${currentPosition > 0 ? 'This week' : 'Post comments to rank'}</div>
                        </div>
                      </div>
                      <button
                        id="view-rankings-from-goals"
                        style="
                          width: 100%;
                          padding: 0.5rem 1rem;
                          background: rgba(255, 255, 255, 0.8);
                          border: none;
                          border-radius: calc(var(--radius) - 2px);
                          font-size: 0.75rem;
                          cursor: pointer;
                          font-weight: 500;
                        "
                      >
                        View Full Weekly Rankings
                      </button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                      <!-- Goal: Reach 90% growth -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: hsl(var(--muted)); border-radius: calc(var(--radius) - 2px);">
                        <span style="font-size: 0.875rem;">Reach 90% growth</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span style="font-size: 0.875rem; font-weight: 500;">${Math.round(this.treeState.growth)}%</span>
                          ${this.treeState.growth >= 90 ? '<span style="color: #22c55e;">✓</span>' : ''}
                        </div>
                      </div>

                      <!-- Goal: Maintain 70%+ health -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: hsl(var(--muted)); border-radius: calc(var(--radius) - 2px);">
                        <span style="font-size: 0.875rem;">Maintain 70%+ health</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span style="font-size: 0.875rem; font-weight: 500;">${this.treeState.health >= 70 ? '✓' : '✗'}</span>
                          ${this.treeState.health >= 70 ? '<span style="color: #22c55e;">✓</span>' : ''}
                        </div>
                      </div>

                      <!-- Goal: More water than toxic drops -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: hsl(var(--muted)); border-radius: calc(var(--radius) - 2px);">
                        <span style="font-size: 0.875rem;">More water than toxic drops</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span style="font-size: 0.875rem; font-weight: 500;">${this.treeState.waterDrops}/${this.treeState.toxicDrops}</span>
                          ${this.treeState.waterDrops > this.treeState.toxicDrops ? '<span style="color: #22c55e;">✓</span>' : ''}
                        </div>
                      </div>

                      <!-- Goal: Stay committed -->
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: hsl(var(--muted)); border-radius: calc(var(--radius) - 2px);">
                        <span style="font-size: 0.875rem;">Stay committed to your tree</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span style="
                            padding: 0.125rem 0.5rem;
                            background: hsl(var(--secondary));
                            border: 1px solid hsl(var(--border));
                            border-radius: 9999px;
                            font-size: 0.75rem;
                          \">${this.selectedTree.emoji} ${this.selectedTree.name}</span>
                          <span style="color: #22c55e;">✓</span>
                        </div>
                      </div>
                    </div>

                    <!-- Fruit Achievement Banner -->
                    ${this.treeState.hasFruit ? `
                      <div style="
                        margin-top: 1rem;
                        padding: 0.75rem;
                        background: #dcfce7;
                        border: 1px solid #bbf7d0;
                        border-radius: var(--radius);
                      ">
                        <p style="margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 500; color: #166534;">
                          🎉 Your tree is bearing fruit!
                        </p>
                        <p style="margin: 0; font-size: 0.75rem; color: #15803d;">
                          You've successfully grown a healthy tree with positive comments!
                        </p>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN: Lottery Tickets + This Week's Activity -->
              <div class="right-column">
                
                <!-- Monthly Lottery Tickets Card (Yellow Gradient) -->
                <div style="
                  background: linear-gradient(to right, #fef9c3, #fef3c7);
                  border: 2px solid #fcd34d;
                  border-radius: var(--radius);
                  padding: 1.5rem;
                ">
                  <h3 style="
                    margin: 0 0 1rem 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #92400e;
                  ">
                    🎫 Monthly Lottery Tickets
                  </h3>

                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="text-align: center;">
                      <div style="font-size: 2.5rem; font-weight: 700; color: #92400e;">${this.monthlyTickets}</div>
                      <div style="font-size: 0.875rem; color: #78350f;">Tickets</div>
                    </div>

                    <div style="text-align: center;">
                      <div style="font-size: 1.5rem; font-weight: 700; color: #92400e;">#${this.weeklyRanking}</div>
                      <div style="font-size: 0.875rem; color: #78350f;">This Week</div>
                    </div>

                    <div style="
                      padding: 0.5rem 1rem;
                      background: ${this.monthlyTickets >= 2 ? '#dcfce7' : '#f3f4f6'};
                      color: ${this.monthlyTickets >= 2 ? '#166534' : '#6b7280'};
                      border-radius: 1.5rem;
                      font-weight: 500;
                      font-size: 1.125rem;
                      white-space: nowrap;
                    ">
                      ${this.monthlyTickets >= 2 ? '✓ Eligible' : '○ Need 2+'}
                    </div>
                  </div>

                  <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.875rem; font-weight: 600; margin: 0 0 0.75rem 0; color: #92400e;">
                      This Week's Ticket
                    </h4>
                    <div style="
                      padding: 0.75rem;
                      background: rgba(255, 255, 255, 0.6);
                      border-radius: var(--radius);
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    ">
                      <span style="font-weight: 500; color: #78350f;">Rank #${this.weeklyRanking} • Get to top 50 to earn this week's ticket</span>
                      <span style="
                        padding: 0.25rem 0.75rem;
                        background: ${earnedThisWeekTicket ? '#dcfce7' : '#fee2e2'};
                        color: ${earnedThisWeekTicket ? '#166534' : '#991b1b'};
                        border-radius: 1rem;
                        font-size: 0.875rem;
                        font-weight: 500;
                      ">
                        ${earnedThisWeekTicket ? '🎫 Earned' : '✗ Not earned'}
                      </span>
                    </div>
                  </div>

                  <div style="margin-bottom: 1rem;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #78350f;">
                      Lottery Eligibility: ${this.monthlyTickets}/2 tickets
                    </p>
                    <p style="margin: 0; font-size: 0.75rem; color: #92400e;">
                      ${this.monthlyTickets >= 2 
                        ? '2 more tickets needed to enter monthly lottery' 
                        : 'Collect lottery tickets to spin for $5-$10 gift cards!'
                      }
                    </p>
                  </div>

                  <button
                    id="open-lottery"
                    style="
                      width: 100%;
                      padding: 0.75rem 1.5rem;
                      background: ${this.monthlyTickets >= 2 ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#d1d5db'};
                      color: ${this.monthlyTickets >= 2 ? 'white' : '#9ca3af'};
                      border: none;
                      border-radius: var(--radius);
                      font-size: 1.125rem;
                      font-weight: 600;
                      cursor: ${this.monthlyTickets >= 2 ? 'pointer' : 'not-allowed'};
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 0.5rem;
                    "
                    ${this.monthlyTickets < 2 ? 'disabled' : ''}
                  >
                    ${this.monthlyTickets >= 2 ? '🎁 View Lottery' : '✨ Enter Lottery'}
                  </button>

                  <p style="text-align: center; margin: 1rem 0 0 0; font-size: 0.75rem; color: hsl(var(--muted-foreground));">
                    🏆 December lottery ends in 12 days
                  </p>
                </div>

                <!-- This Week's Activity + Today's Impact Cards -->
                ${this.components.renderWeeklyActivity(this.data.weeklyStats, this.data.commentHistory)}

                <!-- Comment History Card -->
                ${this.components.renderCommentHistory(this.comments)}
              </div>
          </div>
        </div>
      </div>
    `;

    this.attachMainGameListeners();
    // Initialize hover effects for buttons (CSP-compliant)
    this.components.initializeHoverEffects();
  }

  attachMainGameListeners() {
    // Social connections button
    const socialBtn = document.getElementById('social-connections');
    if (socialBtn) {
      socialBtn.addEventListener('click', () => {
        this.showSocialConnections = true;
        this.render();
      });
    }

    // Weekly rankings button
    const rankingsBtn = document.getElementById('weekly-rankings');
    if (rankingsBtn) {
      rankingsBtn.addEventListener('click', () => {
        this.showLeaderboard = true;
        this.render();
      });
    }

    // View rankings from goals card button
    const viewRankingsBtn = document.getElementById('view-rankings-from-goals');
    if (viewRankingsBtn) {
      viewRankingsBtn.addEventListener('click', () => {
        this.showLeaderboard = true;
        this.render();
      });
    }

    // Revive tree button
    const reviveBtn = document.getElementById('revive-tree');
    if (reviveBtn) {
      reviveBtn.addEventListener('click', () => {
        this.reviveSameTree();
      });
    }

    // Open lottery button
    const lotteryBtn = document.getElementById('open-lottery');
    if (lotteryBtn) {
      console.log('Lottery button found, attaching listener');
      lotteryBtn.addEventListener('click', () => {
        console.log('Lottery button clicked!');
        this.showMonthlyLottery = true;
        this.render();
      });
    } else {
      console.log('Lottery button NOT found');
    }
  }

  async exportUsersToCSV() {
    try {
      const result = await chrome.storage.local.get(['treeGrowth_allUsers']);
      const allUsers = result.treeGrowth_allUsers || [];
      
      if (allUsers.length === 0) {
        alert('No user data to export');
        return;
      }

      // Create CSV content
      const headers = ['Username', 'Email', 'Signup Date', 'User ID'];
      const rows = allUsers.map(user => [
        user.username,
        user.email,
        new Date(user.signupDate).toLocaleString(),
        user.id
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Use Chrome downloads API
      chrome.downloads.download({
        url: url,
        filename: `tree-growth-users-${new Date().toISOString().split('T')[0]}.csv`,
        saveAs: true
      });
      
      alert(`Successfully exported ${allUsers.length} user(s) to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    }
  }

  async handleTreeSelection(tree) {
  this.selectedTree = tree;
  
  const dayMapping = {
    'cherry': 49,
    'apple': 56, 
    'peach': 56,
    'orange': 63,
    'lemon': 70,
    'coconut': 84
  };
  
  this.treeState = {
    ...this.treeState,
    health: 100,
    totalDays: dayMapping[tree.id] || 56,
    isCommitted: true
  };

  // Update data
  if (this.data) {
    const newTree = {
      id: `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: tree.name.replace(' Tree', ''),
      status: 'growing',
      health: 100,
      growthProgress: 0,
      waterDrops: 0,
      poisonDrops: 0,
      plantedDate: new Date().toISOString(),
      backendId: null,  // NEW: Will store backend tree ID
      syncedToBackend: false  // NEW: Track sync status
    };
    
    this.data.trees = this.data.trees || [];
    this.data.trees.push(newTree);
    this.data.selectedTree = newTree.id;
    this.data.isFirstTime = false;
    this.data.hasCompletedOnboarding = true;

    // Save to storage
    await chrome.runtime.sendMessage({ 
      type: 'UPDATE_USER_DATA', 
      data: this.data 
    });
    
    // NEW: Plant tree in backend
    if (this.userData?.extensionUserId) {
      console.log('📡 Planting tree in backend...');
      const backendResult = await BackendIntegration.plantTreeBackend(
        this.userData.extensionUserId,
        newTree.type
      );
      
      if (backendResult.success && backendResult.data) {
        // Store backend tree ID
        newTree.backendId = backendResult.data.id;
        newTree.syncedToBackend = true;
        console.log('✅ Tree planted in backend:', backendResult.data.id);
        
        // Update storage with backend ID
        await chrome.runtime.sendMessage({ 
          type: 'UPDATE_USER_DATA', 
          data: this.data 
        });
      } else {
        console.warn('⚠️ Backend tree planting failed:', backendResult.error);
      }
      
      // NEW: Log tree planting analytics
      await BackendIntegration.logAnalyticsEventBackend(
        this.userData.extensionUserId,
        'tree_planted',
        { treeType: newTree.type, timestamp: new Date().toISOString() }
      );
    }
  }

  this.render();
}


  getProgressMessage() {
    if (this.treeState.isDead) {
      return `Your ${this.selectedTree?.name} has died from toxic comments. You can revive it, but you're committed to this tree type!`;
    }
    if (this.treeState.hasFruit) {
      return `Congratulations! Your ${this.selectedTree?.name} is bearing fruit thanks to your positive comments!`;
    }
    if (this.treeState.daysGrown >= this.treeState.totalDays) {
      return "Growing period complete! Keep nurturing with positive comments to bear fruit.";
    }
    return `Day ${this.treeState.daysGrown} of ${this.treeState.totalDays} - Keep growing with thoughtful comments!`;
  }

  calculateDaysGrown(plantedDate) {
    if (!plantedDate) return 1;
    const planted = new Date(plantedDate);
    const now = new Date();
    const diffTime = Math.abs(now - planted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }

  calculateWeeklyRanking(weeklyStats) {
    // Calculate user's ranking based on positive comments
    const positiveComments = weeklyStats?.positiveComments || 0;
    const totalComments = weeklyStats?.totalComments || 0;
    
    // Simple ranking algorithm based on positive comments
    // More positive comments = better ranking
    if (positiveComments >= 50) return Math.floor(Math.random() * 10) + 1; // Top 10
    if (positiveComments >= 30) return Math.floor(Math.random() * 20) + 10; // 10-30
    if (positiveComments >= 15) return Math.floor(Math.random() * 30) + 20; // 20-50
    if (positiveComments >= 5) return Math.floor(Math.random() * 50) + 50; // 50-100
    
    return 99; // Default unranked
  }

  getTotalDaysForTree(treeType) {
    const dayMapping = {
      'Cherry': 49,
      'Apple': 56,
      'Peach': 56, 
      'Orange': 63,
      'Lemon': 70,
      'Coconut': 84
    };
    return dayMapping[treeType] || 56;
  }

  renderSignupForm() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="main-game" style="
        min-height: 600px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(to bottom right, #f0fdf4, #dbeafe, #f3e8ff);
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        ">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              width: 64px;
              height: 64px;
              background: linear-gradient(to bottom right, #4ade80, #3b82f6);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              font-size: 32px;
            ">
              🌱
            </div>
            <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px;">
              Welcome to Tree Growth
            </h1>
            <p style="font-size: 14px; color: #6b7280;">
              Create your account to start growing trees with positive comments
            </p>
          </div>

          <!-- Info Alert -->
          <div style="
            background: #dbeafe;
            border: 1px solid #60a5fa;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            display: flex;
            gap: 8px;
          ">
            <span style="font-size: 16px;">📧</span>
            <div style="font-size: 12px; color: #1e40af;">
              Your email is only used for lottery prize notifications and payments. We never share your data.
            </div>
          </div>

          <!-- Signup Form -->
          <form id="signup-form">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">
                Username
              </label>
              <div style="position: relative;">
                <span style="position: absolute; left: 12px; top: 12px; font-size: 14px; color: #9ca3af;">
                  👤
                </span>
                <input 
                  type="text" 
                  id="username-input"
                  placeholder="Enter your username"
                  required
                  minlength="3"
                  maxlength="20"
                  style="
                    width: 100%;
                    padding: 10px 10px 10px 36px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                  "
                />
              </div>
              <div id="username-error" style="color: #dc2626; font-size: 11px; margin-top: 4px; display: none;"></div>
            </div>

            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">
                Email
              </label>
              <div style="position: relative;">
                <span style="position: absolute; left: 12px; top: 12px; font-size: 14px; color: #9ca3af;">
                  📧
                </span>
                <input 
                  type="email" 
                  id="email-input"
                  placeholder="your.email@example.com"
                  required
                  style="
                    width: 100%;
                    padding: 10px 10px 10px 36px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                  "
                />
              </div>
              <div id="email-error" style="color: #dc2626; font-size: 11px; margin-top: 4px; display: none;"></div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                Required for lottery prize payments if you win
              </div>
            </div>

            <button 
              type="submit"
              style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(to right, #3b82f6, #2563eb);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              "
            >
              <span>✨</span>
              Create Account & Start Growing
            </button>

            <div style="text-align: center; font-size: 11px; color: #6b7280; margin-top: 12px;">
              By signing up, you agree to use positive, constructive comments
            </div>
          </form>
        </div>
      </div>
    `;

    // Add form submit handler
    const form = document.getElementById('signup-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username-input').value.trim();
        const email = document.getElementById('email-input').value.trim().toLowerCase();
        
        const usernameError = document.getElementById('username-error');
        const emailError = document.getElementById('email-error');
        
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
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailError.textContent = 'Please enter a valid email address';
          emailError.style.display = 'block';
          hasErrors = true;
        }
        
            if (!hasErrors) {
      // Generate unique extension user ID
      const extensionUserId = BackendIntegration.generateExtensionUserId();
      
      // Save user data locally
      const userData = {
        extensionUserId,  // NEW: Backend user ID
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
      
      // NEW: Register user in backend
      console.log('📡 Registering user in backend...');
      const backendResult = await BackendIntegration.registerUserBackend(
        username,
        email,
        extensionUserId
      );
      
      if (backendResult.success) {
        console.log('✅ User registered in backend successfully');
      } else {
        console.warn('⚠️ Backend registration failed, continuing with local data:', backendResult.error);
      }
      
      // NEW: Log signup analytics event
      await BackendIntegration.logAnalyticsEventBackend(
        extensionUserId,
        'user_signup',
        { username, timestamp: new Date().toISOString() }
      );
      
      this.userData = userData;
      this.isSignedUp = true;
      this.render();
    }
      });
    }

      
  }

/**
 * Sync local data with backend periodically
 * Call this on init and every 5 minutes
 */
    async syncWithBackend() {
  if (!this.userData?.extensionUserId) {
    console.log('⏭️ Skipping backend sync - no user ID');
    return;
  }
  
  console.log('🔄 Starting periodic backend sync...');
  
  try {
    // Sync comments and trees
    const syncResult = await BackendIntegration.syncUserDataToBackend(
      this.userData.extensionUserId
    );
    
    console.log('✅ Backend sync complete:', syncResult);
    
    // Fetch latest leaderboard data
    const leaderboardResult = await BackendIntegration.getLeaderboardBackend(50);
    if (leaderboardResult.success) {
      console.log('📊 Leaderboard data:', leaderboardResult.data);
      // Update local leaderboard cache if needed
    }
    
    // Fetch user's rank
    const rankResult = await BackendIntegration.getUserRankBackend(
      this.userData.extensionUserId
    );
    if (rankResult.success && rankResult.data) {
      console.log('🏆 User rank:', rankResult.data.rank);
      this.weeklyRanking = rankResult.data.rank || 99;
    }
    
    // Fetch user's tickets
    const ticketsResult = await BackendIntegration.getUserTicketsBackend(
      this.userData.extensionUserId,
      true
    );
    if (ticketsResult.success && ticketsResult.data) {
      console.log('🎫 User tickets:', ticketsResult.data);
      if (!this.DEMO_MODE) {
        this.monthlyTickets = ticketsResult.data.length || 0;
      }
    }
    
  } catch (error) {
    console.error('❌ Backend sync error:', error);
  }
}


  renderFirstTimeSetup() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = this.components.renderTreeSelection((tree) => {
      this.handleTreeSelection(tree);
    });

    // Attach event listeners for first time setup
    document.querySelectorAll('.select-tree-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const treeId = btn.getAttribute('data-tree-id');
        const tree = this.components.treeTypes.find(t => t.id === treeId);
        if (tree) this.handleTreeSelection(tree);
      });
    });
  }

  async startGrowing(treeId) {
    const map = {
      apple: { type: 'Apple', emoji: '🍎', totalDays: 56 },
      orange: { type: 'Orange', emoji: '🍊', totalDays: 63 },
      coconut: { type: 'Coconut', emoji: '🥥', totalDays: 84 },
      cherry: { type: 'Cherry', emoji: '🍒', totalDays: 49 },
      lemon: { type: 'Lemon', emoji: '🍋', totalDays: 70 },
      peach: { type: 'Peach', emoji: '🍑', totalDays: 56 }
    };
    const meta = map[treeId];
    if (!meta) return;

    // Start with 100 health
    const newTree = {
      id: `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: meta.type,
      emoji: meta.emoji,
      totalDays: meta.totalDays,
      status: 'growing',
      health: 100,
      growthProgress: 0,
      waterDrops: 0,
      poisonDrops: 0,
      plantedDate: new Date().toISOString()
    };

    this.data.trees = [newTree];
    this.data.selectedTree = newTree.id;
    this.data.isFirstTime = false;
    this.data.hasCompletedOnboarding = true;

    // Send to background script with proper async handling
    await chrome.runtime.sendMessage({ 
      type: 'UPDATE_USER_DATA', 
      data: this.data 
    });
    
    // Update local state
    this.selectedTree = this.components.getTreeById(treeId);
    this.treeState = {
      health: 100,
      growth: 0,
      daysGrown: 1,
      totalDays: meta.totalDays,
      waterDrops: 0,
      toxicDrops: 0,
      hasFruit: false,
      isDead: false,
      isCommitted: true
    };
    
    this.render();
  }

  renderLeaderboard() {
    const app = document.getElementById('app');
    if (!app) return;

    const treeType = this.selectedTree ? this.selectedTree.name : 'Apple Tree';
    const currentTreeEmoji = this.selectedTree ? this.selectedTree.emoji : '🍎';
    
    // Week offset for navigation (0 = current week, 1 = last week, etc.)
    if (!this.leaderboardWeekOffset) this.leaderboardWeekOffset = 0;
    if (!this.leaderboardActiveTab) this.leaderboardActiveTab = 'weekly';
    
    // Generate leaderboard data with current user's real stats
    const currentUsername = this.userData?.username || 'You';
    const weeklyStats = this.data?.weeklyStats || { positiveComments: 0, negativeComments: 0, totalComments: 0 };
    const userScore = weeklyStats.positiveComments * 100;
    
    // Create current user entry
    const currentUserEntry = {
      rank: this.weeklyRanking,
      username: currentUsername,
      emoji: currentTreeEmoji,
      weeklyComments: weeklyStats.totalComments,
      weeklyPositive: weeklyStats.positiveComments,
      weeklyGrowth: this.treeState.growth >= 100 ? 100 : Math.floor(this.treeState.growth / 10),
      score: userScore,
      health: this.treeState.health,
      growth: this.treeState.growth,
      ticketEarned: this.weeklyRanking <= 50,
      isCurrentUser: true
    };

    // Generate leaderboard data
    const baseLeaderboardData = [];
    
    // If user has no ranking (no activity), only show their entry
    if (this.weeklyRanking === 0) {
      baseLeaderboardData.push(currentUserEntry);
    } else {
      // Add top players before user (simulated based on user's performance)
      for (let i = 1; i < this.weeklyRanking && baseLeaderboardData.length < 5; i++) {
        const relativeScore = userScore + ((this.weeklyRanking - i) * 100);
        const relativeComments = Math.max(weeklyStats.positiveComments + (this.weeklyRanking - i), 1);
        
        baseLeaderboardData.push({
          rank: i,
          username: `User${i}`,
          emoji: currentTreeEmoji,
          weeklyComments: relativeComments,
          weeklyPositive: Math.floor(relativeComments * 0.9),
          weeklyGrowth: Math.min(15, 10 + (this.weeklyRanking - i)),
          score: relativeScore,
          health: Math.min(100, 85 + (this.weeklyRanking - i)),
          growth: Math.min(100, 75 + (this.weeklyRanking - i)),
          ticketEarned: i <= 50
        });
      }
      
      // Add current user
      baseLeaderboardData.push(currentUserEntry);
      
      // Add players after user (simulated based on user's performance)
      for (let i = this.weeklyRanking + 1; i <= this.weeklyRanking + 5; i++) {
        const relativeScore = Math.max(100, userScore - ((i - this.weeklyRanking) * 100));
        const relativeComments = Math.max(1, weeklyStats.positiveComments - (i - this.weeklyRanking));
        
        baseLeaderboardData.push({
          rank: i,
          username: `User${i}`,
          emoji: currentTreeEmoji,
          weeklyComments: relativeComments,
          weeklyPositive: Math.floor(relativeComments * 0.85),
          weeklyGrowth: Math.max(1, 10 - (i - this.weeklyRanking)),
          score: relativeScore,
          health: Math.max(50, this.treeState.health - (i - this.weeklyRanking)),
          growth: Math.max(10, this.treeState.growth - (i - this.weeklyRanking)),
          ticketEarned: i <= 50
        });
      }
    }

    const weekLabel = this.leaderboardWeekOffset === 0 ? 'This Week' : 
                     this.leaderboardWeekOffset === 1 ? 'Last Week' : 
                     `${this.leaderboardWeekOffset} Weeks Ago`;

    const getWeekDates = () => {
      const today = new Date();
      const offset = this.leaderboardWeekOffset * 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - offset); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday
      
      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    };

    const currentUserPosition = this.weeklyRanking;
    const activeGrowers = baseLeaderboardData.length;
    const totalWeeklyComments = baseLeaderboardData.reduce((sum, u) => sum + u.weeklyComments, 0);
    const avgPositivity = baseLeaderboardData.length > 0 ? Math.round((baseLeaderboardData.reduce((sum, u) => sum + (u.weeklyComments > 0 ? (u.weeklyPositive / u.weeklyComments * 100) : 0), 0) / activeGrowers)) : 0;

    const getRankBadge = (rank) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return `#${rank}`;
    };

    const getRankColor = (rank) => {
      if (rank === 1) return '#fbbf24';
      if (rank === 2) return '#9ca3af';
      if (rank === 3) return '#f59e0b';
      return '#6b7280';
    };

    const getSortedData = (sortType) => {
      const data = [...baseLeaderboardData];
      switch(sortType) {
        case 'comments':
          return data.sort((a, b) => b.weeklyComments - a.weeklyComments);
        case 'positivity':
          return data.sort((a, b) => {
            const aRate = (a.weeklyPositive / a.weeklyComments) * 100;
            const bRate = (b.weeklyPositive / b.weeklyComments) * 100;
            return bRate - aRate;
          });
        case 'growth':
          return data.sort((a, b) => b.weeklyGrowth - a.weeklyGrowth);
        default: // weekly score
          return data.sort((a, b) => b.score - a.score);
      }
    };

    const renderLeaderboardTable = (data, category = 'weekly') => {
      return data.map((entry, index) => {
        const displayRank = index + 1;
        const positivityRate = Math.round((entry.weeklyPositive / entry.weeklyComments) * 100);
        
        return `
          <div style="
            background: ${entry.isCurrentUser ? '#f0fdf4' : 'white'};
            border: 1px solid ${entry.isCurrentUser ? '#22c55e' : '#e5e7eb'};
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="
                  font-size: 14px;
                  font-weight: 600;
                  color: ${getRankColor(displayRank)};
                  min-width: 30px;
                ">
                  ${getRankBadge(displayRank)}
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 14px; font-weight: 600; color: ${entry.isCurrentUser ? '#166534' : '#111827'};">
                      ${entry.username}
                    </span>
                    <span style="font-size: 16px;">${entry.emoji}</span>
                    ${entry.ticketEarned ? '<span style="font-size: 12px;">🎫</span>' : ''}
                  </div>
                  <div style="font-size: 11px; color: #6b7280;">
                    ${category === 'comments' ? `${entry.weeklyComments} comments this week` :
                      category === 'positivity' ? `${positivityRate}% positivity rate` :
                      category === 'growth' ? `+${entry.weeklyGrowth}% growth this week` :
                      `${entry.weeklyComments} comments • ${entry.weeklyPositive} positive`}
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: 600;">
                  ${category === 'comments' ? entry.weeklyComments :
                    category === 'positivity' ? `${positivityRate}%` :
                    category === 'growth' ? `+${entry.weeklyGrowth}%` :
                    entry.score.toLocaleString()}
                </div>
                <div style="font-size: 10px; color: #6b7280;">
                  ${category === 'weekly' ? 'points' : 
                    category === 'comments' ? 'total' :
                    category === 'positivity' ? 'rate' : 'growth'}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    const currentData = getSortedData(this.leaderboardActiveTab);

    app.innerHTML = `
      <div class="main-game">
        <!-- Header -->
        <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                📅 ${currentTreeEmoji} ${treeType} - Weekly Rankings
              </h1>
              <p style="font-size: 12px; color: #6b7280;">
                ${weekLabel} • ${getWeekDates()}
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button 
                id="prev-week-btn" 
                class="action-btn-small"
                ${this.leaderboardWeekOffset >= 4 ? 'disabled' : ''}
                style="padding: 6px 12px; font-size: 12px; ${this.leaderboardWeekOffset >= 4 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
              >
                ← Previous
              </button>
              <button 
                id="current-week-btn" 
                class="action-btn-small"
                ${this.leaderboardWeekOffset === 0 ? 'disabled' : ''}
                style="padding: 6px 12px; font-size: 12px; ${this.leaderboardWeekOffset === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
              >
                Current
              </button>
              <button class="action-btn-small" id="back-to-game" style="padding: 6px 12px; font-size: 12px;">
                Back to Garden
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px;">
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 4px;">👥</div>
            <div style="font-size: 18px; font-weight: 600; color: #3b82f6;">${activeGrowers}</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Active ${treeType} Growers</div>
          </div>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 4px;">📈</div>
            <div style="font-size: 18px; font-weight: 600; color: #22c55e;">${totalWeeklyComments}</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Comments This Week</div>
          </div>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 4px;">🎯</div>
            <div style="font-size: 18px; font-weight: 600; color: #a855f7;">${avgPositivity}%</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Weekly Positivity</div>
          </div>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 4px;">🏆</div>
            <div style="font-size: 18px; font-weight: 600; color: #f59e0b;">${currentUserPosition > 0 ? `#${currentUserPosition}` : '-'}</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Your Weekly Rank</div>
            ${currentUserPosition <= 50 ? `
              <div style="
                background: #fef3c7;
                color: #92400e;
                font-size: 9px;
                padding: 2px 6px;
                border-radius: 4px;
                margin-top: 4px;
                display: inline-block;
              ">
                🎫 Lottery Ticket
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Monthly Lottery Alert -->
        <div style="padding: 0 16px 16px 16px;">
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <span style="font-size: 16px;">🎫</span>
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 4px;">
                  Monthly Lottery
                </div>
                <div style="font-size: 11px; color: #92400e;">
                  Top 50 users each week earn a ticket. Collect 2+ tickets to spin for $1, $3 or $5 gift cards!
                </div>
              </div>
              <div style="
                background: #fbbf24;
                color: #78350f;
                font-size: 10px;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 600;
                white-space: nowrap;
              ">
                🎁 December Lottery
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div style="padding: 0 16px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;">
            <button 
              class="tab-btn ${this.leaderboardActiveTab === 'weekly' ? 'active' : ''}" 
              data-tab="weekly"
              style="
                padding: 10px;
                border: 1px solid ${this.leaderboardActiveTab === 'weekly' ? '#3b82f6' : '#e5e7eb'};
                background: ${this.leaderboardActiveTab === 'weekly' ? '#eff6ff' : 'white'};
                color: ${this.leaderboardActiveTab === 'weekly' ? '#1e40af' : '#6b7280'};
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              Weekly Score
            </button>
            <button 
              class="tab-btn ${this.leaderboardActiveTab === 'comments' ? 'active' : ''}" 
              data-tab="comments"
              style="
                padding: 10px;
                border: 1px solid ${this.leaderboardActiveTab === 'comments' ? '#3b82f6' : '#e5e7eb'};
                background: ${this.leaderboardActiveTab === 'comments' ? '#eff6ff' : 'white'};
                color: ${this.leaderboardActiveTab === 'comments' ? '#1e40af' : '#6b7280'};
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              Comments
            </button>
            <button 
              class="tab-btn ${this.leaderboardActiveTab === 'positivity' ? 'active' : ''}" 
              data-tab="positivity"
              style="
                padding: 10px;
                border: 1px solid ${this.leaderboardActiveTab === 'positivity' ? '#3b82f6' : '#e5e7eb'};
                background: ${this.leaderboardActiveTab === 'positivity' ? '#eff6ff' : 'white'};
                color: ${this.leaderboardActiveTab === 'positivity' ? '#1e40af' : '#6b7280'};
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              Positivity
            </button>
            <button 
              class="tab-btn ${this.leaderboardActiveTab === 'growth' ? 'active' : ''}" 
              data-tab="growth"
              style="
                padding: 10px;
                border: 1px solid ${this.leaderboardActiveTab === 'growth' ? '#3b82f6' : '#e5e7eb'};
                background: ${this.leaderboardActiveTab === 'growth' ? '#eff6ff' : 'white'};
                color: ${this.leaderboardActiveTab === 'growth' ? '#1e40af' : '#6b7280'};
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              Growth
            </button>
          </div>
        </div>

        <!-- Leaderboard Content -->
        <div style="padding: 0 16px 16px 16px; max-height: 400px; overflow-y: auto;">
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="margin-bottom: 12px;">
              <h3 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                ${this.leaderboardActiveTab === 'weekly' ? `${weekLabel} Rankings - ${treeType}` :
                  this.leaderboardActiveTab === 'comments' ? `Weekly Comment Volume - ${treeType}` :
                  this.leaderboardActiveTab === 'positivity' ? `Weekly Positivity Champions - ${treeType}` :
                  `Weekly Growth Leaders - ${treeType}`}
              </h3>
              <p style="font-size: 11px; color: #6b7280;">
                ${this.leaderboardActiveTab === 'weekly' ? `Rankings based on weekly comment activity and positivity among ${treeType.toLowerCase()} growers` :
                  this.leaderboardActiveTab === 'comments' ? `${treeType} growers with the most comments this week` :
                  this.leaderboardActiveTab === 'positivity' ? `${treeType} growers with the highest positivity rate this week` :
                  `${treeType} trees with the most growth this week`}
              </p>
            </div>

            ${renderLeaderboardTable(currentData, this.leaderboardActiveTab)}
          </div>

          <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
              Rankings update weekly
            </div>
            <div style="font-size: 10px; color: #9ca3af;">
              Top 50 earn lottery tickets • Resets every Monday
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const backBtn = document.getElementById('back-to-game');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showLeaderboard = false;
        this.leaderboardWeekOffset = 0;
        this.leaderboardActiveTab = 'weekly';
        this.render();
      });
    }

    const prevWeekBtn = document.getElementById('prev-week-btn');
    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => {
        if (this.leaderboardWeekOffset < 4) {
          this.leaderboardWeekOffset++;
          this.render();
        }
      });
    }

    const currentWeekBtn = document.getElementById('current-week-btn');
    if (currentWeekBtn) {
      currentWeekBtn.addEventListener('click', () => {
        this.leaderboardWeekOffset = 0;
        this.render();
      });
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        this.leaderboardActiveTab = tab;
        this.render();
      });
    });
  }

  showCustomDialog(title, message) {
    // Create custom styled dialog matching the screenshot
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${message}</p>
      <button id="dialog-ok-btn" style="
        width: 100%;
        padding: 10px 20px;
        background: linear-gradient(135deg, #a78bfa, #8b5cf6);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      ">OK</button>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Handle click
    const okBtn = dialog.querySelector('#dialog-ok-btn');
    okBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  renderSocialConnections() {
    const app = document.getElementById('app');
    if (!app) return;

    // Social media icon SVGs (matching lucide-react icons from React app)
    const icons = {
      twitter: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>',
      facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
      instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>',
      linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
      reddit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="m18.9 15.5 1.4 1.4"></path><path d="m21.3 12 2-.7"></path><path d="m21.3 12 .7 2"></path><path d="m3.6 15.5-1.4 1.4"></path><path d="m2.7 12-2-.7"></path><path d="m2.7 12-.7 2"></path><path d="m18.9 8.5 1.4-1.4"></path><path d="m21.3 12 2 .7"></path><path d="m21.3 12 .7-2"></path><path d="m3.6 8.5-1.4-1.4"></path><path d="m2.7 12-2 .7"></path><path d="m2.7 12-.7-2"></path></svg>',
      youtube: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><polygon fill="white" points="10 15 15 12 10 9 10 15"></polygon></svg>',
      tiktok: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>'
    };

    // Calculate real platform stats from comment history
    const platformStats = {};
    (this.data.commentHistory || []).forEach(comment => {
      const platform = comment.platform || 'unknown';
      if (!platformStats[platform]) {
        platformStats[platform] = { comments: 0, positive: 0 };
      }
      platformStats[platform].comments++;
      if (comment.sentiment === 'positive') {
        platformStats[platform].positive++;
      }
    });

    // Build platforms array using real data and stored connection state
    const platformsBase = [
      { id: 'twitter', name: 'Twitter/X', icon: icons.twitter, color: '#3b82f6' },
      { id: 'facebook', name: 'Facebook', icon: icons.facebook, color: '#1877f2' },
      { id: 'instagram', name: 'Instagram', icon: icons.instagram, color: '#e4405f' },
      { id: 'linkedin', name: 'LinkedIn', icon: icons.linkedin, color: '#0a66c2' },
      { id: 'reddit', name: 'Reddit', icon: icons.reddit, color: '#ff4500' },
      { id: 'youtube', name: 'YouTube', icon: icons.youtube, color: '#ff0000' },
      { id: 'tiktok', name: 'TikTok', icon: icons.tiktok, color: '#000000' }
    ];
    
    // Merge with stored connection state and real comment data
    const platforms = platformsBase.map(platform => {
      const stats = platformStats[platform.id] || { comments: 0, positive: 0 };
      return {
        ...platform,
        weeklyComments: stats.comments,
        positiveComments: stats.positive,
        lastSync: stats.comments > 0 ? 'Just now' : 'No activity',
        connected: this.platformConnections[platform.id]?.connected || false,
        enabled: this.platformConnections[platform.id]?.enabled || false
      };
    });

    const totalWeeklyComments = this.data.weeklyStats?.totalComments || 0;
    const totalPositiveComments = this.data.weeklyStats?.positiveComments || 0;
    const positivityRate = totalWeeklyComments > 0 ? (totalPositiveComments / totalWeeklyComments * 100).toFixed(1) : 0;

    app.innerHTML = `
      <div class="main-game" style="max-height: 100vh; overflow-y: auto;">
        <!-- Header -->
        <div style="padding: 1.5rem; border-bottom: 1px solid hsl(var(--border)); background: white;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <h1 style="font-size: 1.875rem; font-weight: 700; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 2rem;">📱</span>
                Social Media Connections
              </h1>
              <p style="margin: 0; color: hsl(var(--muted-foreground)); font-size: 0.875rem;">
                Connect your social media accounts to automatically track your comments
              </p>
            </div>
            <button class="action-btn" id="back-to-game" style="white-space: nowrap;">
              ← Back to Garden
            </button>
          </div>
        </div>

        <!-- Alert -->
        <div style="background: hsl(0 84.2% 96%); border-top: 1px solid hsl(0 84.2% 88%); border-bottom: 1px solid hsl(0 84.2% 88%); padding: 0.75rem 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: hsl(0 84.2% 40.2%);">
            <span style="font-size: 1rem;">⚠️</span>
            <span>Your comments are analyzed in real-time using AI toxicity detection. Only positive, constructive comments will help your tree grow!</span>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <!-- Weekly Statistics Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <!-- Total Comments Card -->
            <div style="background: white; border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1rem; text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: hsl(var(--foreground));">${totalWeeklyComments}</div>
              <div style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">Comments This Week</div>
            </div>

            <!-- Positive Comments Card -->
            <div style="background: white; border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1rem; text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📈</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: hsl(var(--foreground));">${totalPositiveComments}</div>
              <div style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">Positive Comments</div>
            </div>

            <!-- Positivity Rate Card -->
            <div style="background: white; border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1rem; text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: hsl(var(--foreground));">${positivityRate}%</div>
              <div style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">Positivity Rate</div>
            </div>
          </div>

          <!-- Connected Platforms Section -->
          <h2 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 1rem 0;">Connected Platforms</h2>
          
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${platforms.map(platform => {
              const positivityPercentage = platform.weeklyComments > 0 
                ? ((platform.positiveComments / platform.weeklyComments) * 100).toFixed(1) 
                : 0;
              
              return `
                <div class="platform-card" style="
                  background: white;
                  border: 1px solid hsl(var(--border));
                  border-radius: var(--radius);
                  padding: 1.5rem;
                  transition: all 0.2s;
                ">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <!-- Left side: Icon and Info -->
                    <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                      <div style="
                        width: 48px;
                        height: 48px;
                        background: ${platform.color};
                        border-radius: 0.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                      ">
                        ${platform.icon}
                      </div>
                      
                      <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                          <h3 style="margin: 0; font-size: 1rem; font-weight: 500;">${platform.name}</h3>
                          ${platform.connected ? `
                            <span style="
                              padding: 0.125rem 0.5rem;
                              background: hsl(142.1 76.2% 96%);
                              color: hsl(142.1 76.2% 36.3%);
                              border-radius: 9999px;
                              font-size: 0.75rem;
                              font-weight: 500;
                              display: inline-flex;
                              align-items: center;
                              gap: 0.25rem;
                            ">
                              <span>✓</span> Connected
                            </span>
                          ` : `
                            <span style="
                              padding: 0.125rem 0.5rem;
                              background: hsl(var(--secondary));
                              color: hsl(var(--secondary-foreground));
                              border: 1px solid hsl(var(--border));
                              border-radius: 9999px;
                              font-size: 0.75rem;
                              font-weight: 500;
                            ">
                              Not Connected
                            </span>
                          `}
                        </div>
                        ${platform.connected ? `
                          <div style="font-size: 0.875rem; color: hsl(var(--muted-foreground));">
                            Last sync: ${platform.lastSync}
                          </div>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Right side: Stats and Actions -->
                    <div style="display: flex; align-items: center; gap: 1rem;">
                      ${platform.connected ? `
                        <div style="text-align: right; font-size: 0.875rem;">
                          <div style="font-weight: 500; color: hsl(var(--foreground));">${platform.weeklyComments} comments</div>
                          <div style="color: hsl(142.1 76.2% 36.3%);">${platform.positiveComments} positive</div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span style="font-size: 0.875rem; color: hsl(var(--muted-foreground));">Monitor</span>
                          <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
                            <input 
                              type="checkbox" 
                              ${platform.enabled ? 'checked' : ''} 
                              data-platform="${platform.id}" 
                              class="platform-toggle"
                              style="opacity: 0; width: 0; height: 0;"
                            >
                            <span style="
                              position: absolute;
                              cursor: pointer;
                              top: 0;
                              left: 0;
                              right: 0;
                              bottom: 0;
                              background-color: ${platform.enabled ? 'hsl(var(--primary))' : '#ccc'};
                              transition: 0.4s;
                              border-radius: 24px;
                            ">
                              <span style="
                                position: absolute;
                                content: '';
                                height: 18px;
                                width: 18px;
                                left: ${platform.enabled ? '23px' : '3px'};
                                bottom: 3px;
                                background-color: white;
                                transition: 0.4s;
                                border-radius: 50%;
                              "></span>
                            </span>
                          </label>
                        </div>
                      ` : ''}
                      
                      ${platform.connected ? `
                        <button 
                          class="action-btn-small" 
                          data-disconnect="${platform.id}"
                          style="
                            padding: 0.5rem 1rem;
                            background: white;
                            border: 1px solid hsl(var(--border));
                            border-radius: calc(var(--radius) - 2px);
                            font-size: 0.875rem;
                            cursor: pointer;
                            white-space: nowrap;
                          "
                        >
                          Disconnect
                        </button>
                      ` : `
                        <button 
                          class="action-btn-small primary" 
                          data-connect="${platform.id}"
                          style="
                            padding: 0.5rem 1rem;
                            background: hsl(var(--primary));
                            color: white;
                            border: 1px solid hsl(var(--primary));
                            border-radius: calc(var(--radius) - 2px);
                            font-size: 0.875rem;
                            cursor: pointer;
                            white-space: nowrap;
                          "
                        >
                          Connect
                        </button>
                      `}
                    </div>
                  </div>

                  ${platform.connected && platform.weeklyComments > 0 ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid hsl(var(--border));">
                      <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                        <span style="color: hsl(var(--muted-foreground));">Weekly Positivity</span>
                        <span style="font-weight: 500;">${positivityPercentage}%</span>
                      </div>
                      <div style="width: 100%; height: 0.5rem; background: hsl(var(--muted)); border-radius: 9999px; overflow: hidden;">
                        <div style="
                          width: ${positivityPercentage}%;
                          height: 100%;
                          background: linear-gradient(to right, hsl(142.1 76.2% 45%), hsl(142.1 76.2% 36.3%));
                          transition: width 0.5s ease;
                        "></div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- How It Works Section -->
          <div style="
            margin-top: 2rem;
            background: hsl(221.2 83.2% 96%);
            border: 1px solid hsl(221.2 83.2% 88%);
            border-radius: var(--radius);
            padding: 1.5rem;
          ">
            <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 1rem 0;">How It Works</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div style="display: flex; gap: 0.75rem;">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: hsl(221.2 83.2% 88%);
                  color: hsl(221.2 83.2% 30%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.875rem;
                  font-weight: 600;
                  flex-shrink: 0;
                ">1</div>
                <div>
                  <h4 style="font-size: 0.875rem; font-weight: 500; color: hsl(221.2 83.2% 20%); margin: 0 0 0.25rem 0;">Connect Your Accounts</h4>
                  <p style="font-size: 0.8125rem; color: hsl(221.2 83.2% 30%); margin: 0; line-height: 1.4;">
                    Connect your social media accounts using secure OAuth authentication
                  </p>
                </div>
              </div>
              
              <div style="display: flex; gap: 0.75rem;">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: hsl(221.2 83.2% 88%);
                  color: hsl(221.2 83.2% 30%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.875rem;
                  font-weight: 600;
                  flex-shrink: 0;
                ">2</div>
                <div>
                  <h4 style="font-size: 0.875rem; font-weight: 500; color: hsl(221.2 83.2% 20%); margin: 0 0 0.25rem 0;">Automatic Monitoring</h4>
                  <p style="font-size: 0.8125rem; color: hsl(221.2 83.2% 30%); margin: 0; line-height: 1.4;">
                    We monitor your comments and replies across connected platforms
                  </p>
                </div>
              </div>
              
              <div style="display: flex; gap: 0.75rem;">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: hsl(221.2 83.2% 88%);
                  color: hsl(221.2 83.2% 30%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.875rem;
                  font-weight: 600;
                  flex-shrink: 0;
                ">3</div>
                <div>
                  <h4 style="font-size: 0.875rem; font-weight: 500; color: hsl(221.2 83.2% 20%); margin: 0 0 0.25rem 0;">AI Analysis</h4>
                  <p style="font-size: 0.8125rem; color: hsl(221.2 83.2% 30%); margin: 0; line-height: 1.4;">
                    Each comment is analyzed for toxicity and sentiment in real-time
                  </p>
                </div>
              </div>
              
              <div style="display: flex; gap: 0.75rem;">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: hsl(221.2 83.2% 88%);
                  color: hsl(221.2 83.2% 30%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.875rem;
                  font-weight: 600;
                  flex-shrink: 0;
                ">4</div>
                <div>
                  <h4 style="font-size: 0.875rem; font-weight: 500; color: hsl(221.2 83.2% 20%); margin: 0 0 0.25rem 0;">Tree Growth</h4>
                  <p style="font-size: 0.8125rem; color: hsl(221.2 83.2% 30%); margin: 0; line-height: 1.4;">
                    Positive comments add water drops, toxic comments add poison drops
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('back-to-game')?.addEventListener('click', () => {
      this.showSocialConnections = false;
      this.render();
    });

    // Add hover effects to platform cards (CSP-compliant)
    document.querySelectorAll('.platform-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = 'none';
      });
    });

    // Add toggle listeners
    document.querySelectorAll('.platform-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const checkbox = e.target;
        const platformId = checkbox.getAttribute('data-platform');
        const slider = checkbox.nextElementSibling;
        const sliderButton = slider?.querySelector('span');
        
        if (slider && sliderButton) {
          slider.style.backgroundColor = checkbox.checked ? 'hsl(var(--primary))' : '#ccc';
          sliderButton.style.left = checkbox.checked ? '23px' : '3px';
        }
        
        // Save toggle state to storage
        this.platformConnections[platformId].enabled = checkbox.checked;
        await chrome.storage.local.set({ platformConnections: this.platformConnections });
        console.log(`Toggled monitoring for ${platformId}: ${checkbox.checked}`);
      });
    });

    // Add connect/disconnect button listeners
    document.querySelectorAll('[data-connect]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const platformId = e.target.getAttribute('data-connect');
        const platformName = platforms.find(p => p.id === platformId)?.name || platformId;
        
        // Special message for TikTok
        if (platformId === 'tiktok') {
          this.showCustomDialog(
            'The extension Tree Growth - Social Media Game says',
            'Connect tiktok feature coming soon!'
          );
          return;
        }
        
        // For other platforms, connect them
        this.platformConnections[platformId] = { connected: true, enabled: true };
        await chrome.storage.local.set({ platformConnections: this.platformConnections });
        
        // Show success message
        this.showCustomDialog(
          'Connected!',
          `Successfully connected to ${platformName}. Your comments will now be tracked.`
        );
        
        // Re-render to update UI
        setTimeout(() => this.renderSocialConnections(), 500);
      });
    });

    document.querySelectorAll('[data-disconnect]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const platformId = e.target.getAttribute('data-disconnect');
        const platformName = platforms.find(p => p.id === platformId)?.name || platformId;
        
        // Show confirmation dialog
        if (confirm(`Are you sure you want to disconnect ${platformName}? Your comment history will be preserved, but we will stop tracking new comments.`)) {
          this.platformConnections[platformId] = { connected: false, enabled: false };
          await chrome.storage.local.set({ platformConnections: this.platformConnections });
          
          // Show success message
          this.showCustomDialog(
            'Disconnected',
            `${platformName} has been disconnected successfully.`
          );
          
          // Re-render to update UI
          setTimeout(() => this.renderSocialConnections(), 500);
        }
      });
    });
  }

  renderMonthlyLottery() {
    const app = document.getElementById('app');
    if (!app) return;

    const treeType = this.selectedTree ? this.selectedTree.name : 'Apple Tree';
    const treeEmoji = this.selectedTree ? this.selectedTree.emoji : '🍎';
    const canEnterLottery = this.monthlyTickets >= 2;
    
    const prizes = [
      { name: 'Gift Card', amount: '$1', icon: '🎁', color: '#ec4899' },
      { name: 'Try Again', amount: '', icon: '🔄', color: '#f97316' },
      { name: 'Gift Card', amount: '$3', icon: '💎', color: '#d946ef' },
      { name: 'Try Again', amount: '', icon: '🔄', color: '#06b6d4' },
      { name: 'Gift Card', amount: '$5', icon: '⭐', color: '#10b981' },
      { name: 'Try Again', amount: '', icon: '🔄', color: '#f59e0b' },
      { name: 'Gift Card', amount: '$1', icon: '🎁', color: '#8b5cf6' },
      { name: 'Try Again', amount: '', icon: '🔄', color: '#ef4444' }
    ];

    // Use simulated past weeks and real current week ranking
    const weeklyTickets = [
      { week: 'Week 1', earned: this.monthlyTickets >= 1 ? 1 : 0, ranking: this.monthlyTickets >= 1 ? (Math.floor(Math.random() * 30) + 15) : 0 },
      { week: 'Week 2', earned: this.monthlyTickets >= 2 ? 1 : 0, ranking: this.monthlyTickets >= 2 ? (Math.floor(Math.random() * 30) + 15) : 0 },
      { week: 'Week 3', earned: this.monthlyTickets >= 3 ? 1 : 0, ranking: this.monthlyTickets >= 3 ? (Math.floor(Math.random() * 30) + 15) : 0 },
      { week: 'Week 4 (This Week)', earned: this.monthlyTickets >= 4 ? 1 : 0, ranking: this.weeklyRanking || 0 }
    ];

    app.innerHTML = `
      <div class="main-game" style="overflow-y: auto; max-height: 100vh;">
        <div class="game-header">
          <div class="header-info">
            <h1>👑 December 2024 Monthly Lottery</h1>
            <p>Spin the wheel with your ${treeEmoji} ${treeType} tickets</p>
          </div>
          <button class="action-btn" id="back-to-game">← Back to Garden</button>
        </div>

        <!-- User Ticket Status -->
        <div style="
          background: linear-gradient(to right, #fef9c3, #fef3c7);
          border: 2px solid #fcd34d;
          border-radius: 12px;
          padding: 20px;
          margin: 16px;
        ">
          <h3 style="font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            🎫 Your ${treeEmoji} ${treeType} Tickets
          </h3>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; gap: 24px;">
              <div style="text-align: center;">
                <div style="font-size: 36px; font-weight: 700; color: #ca8a04;">${this.monthlyTickets}</div>
                <div style="font-size: 12px; color: #78716c;">Tickets Earned</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${weeklyTickets.filter(w => w.earned > 0).length}/4</div>
                <div style="font-size: 12px; color: #78716c;">Weeks in Top 50</div>
              </div>
            </div>
            
            <div style="
              padding: 8px 16px;
              border-radius: 16px;
              font-size: 14px;
              font-weight: 600;
              background: ${canEnterLottery ? '#dcfce7' : '#f3f4f6'};
              color: ${canEnterLottery ? '#166534' : '#6b7280'};
            ">
              ${canEnterLottery ? '✅ Eligible to Spin' : '❌ Need 2+ Tickets'}
            </div>
          </div>

          ${!canEnterLottery ? `
            <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px; font-size: 12px; color: #991b1b;">
              You need at least 2 tickets to enter the monthly lottery. Keep ranking in the top 50 weekly to earn more tickets!
            </div>
          ` : ''}
        </div>

        <!-- Weekly Ticket History -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            📅 December 2024 Ticket History
          </h3>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
            ${weeklyTickets.map(week => `
              <div style="
                padding: 16px;
                border-radius: 8px;
                border: 1px solid ${week.earned > 0 ? '#86efac' : '#e5e7eb'};
                background: ${week.earned > 0 ? '#f0fdf4' : '#f9fafb'};
                text-align: center;
              ">
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">${week.week}</div>
                <div style="font-size: 28px; margin-bottom: 8px;">
                  ${week.earned > 0 ? '🎫' : '❌'}
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${week.ranking > 0 ? `Rank #${week.ranking}` : 'Not ranked'}</div>
                <div style="
                  padding: 2px 8px;
                  border-radius: 8px;
                  font-size: 9px;
                  font-weight: 600;
                  background: ${week.earned > 0 ? '#dcfce7' : '#f3f4f6'};
                  color: ${week.earned > 0 ? '#166534' : '#6b7280'};
                  display: inline-block;
                ">
                  ${week.earned > 0 ? 'Ticket Earned' : 'No Ticket'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Spinning Wheel -->
        <div style="background: white; border: 2px solid #c084fc; border-radius: 12px; padding: 20px; margin: 16px; text-align: center;">
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ✨ Spin the Wheel
          </h3>

          <!-- Wheel Container -->
          <div style="position: relative; width: 384px; height: 384px; margin: 0 auto 24px; max-width: 100%;">
            <!-- Pointer at top -->
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              z-index: 20;
              width: 0;
              height: 0;
              border-left: 20px solid transparent;
              border-right: 20px solid transparent;
              border-top: 35px solid #ef4444;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
            "></div>

            <!-- SVG Wheel -->
            <svg id="lottery-wheel-svg" width="384" height="384" viewBox="0 0 384 384" style="width: 100%; height: 100%;">
              <defs>
                <radialGradient id="wheelGradient">
                  <stop offset="0%" stop-color="white" stop-opacity="0.1" />
                  <stop offset="100%" stop-color="black" stop-opacity="0.1" />
                </radialGradient>
              </defs>
              
              <!-- Outer decorative ring -->
              <circle cx="192" cy="192" r="192" fill="#fff1f2" />
              <circle cx="192" cy="192" r="185" fill="white" />
              <circle cx="192" cy="192" r="175" fill="black" />
              
              <!-- Rotating wheel group -->
              <g id="lottery-wheel-group" style="transform-origin: 192px 192px; transition: transform 6s cubic-bezier(0.17, 0.67, 0.35, 0.96);">
                <!-- Segments will be dynamically added -->
              </g>
            </svg>
          </div>

          <!-- Spin Result Display -->
          <div id="spin-result" style="display: none; margin-bottom: 16px;"></div>

          <!-- Spin Button -->
          <div id="spin-controls">
            <button 
              id="spin-button"
              ${!canEnterLottery ? 'disabled' : ''}
              style="
                padding: 14px 28px;
                background: ${canEnterLottery ? '#22c55e' : '#d1d5db'};
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: ${canEnterLottery ? 'pointer' : 'not-allowed'};
                display: inline-flex;
                align-items: center;
                gap: 8px;
              "
            >
              ⭐ Spin the Wheel!
            </button>
            ${canEnterLottery ? `
              <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">
                You'll use 2 tickets to spin. Remaining: ${this.monthlyTickets - 2} tickets
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Monthly Stats -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            🏆 December 2024 Lottery Stats
          </h3>
          
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 32px; font-weight: 700; color: #2563eb;">156</div>
            <div style="font-size: 12px; color: #6b7280;">Total Participants This Month</div>
          </div>

          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #9a3412;">Next Lottery</div>
                <div style="font-size: 11px; color: #c2410c;">January 2025 lottery opens in 12 days</div>
              </div>
              <div style="
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                background: #fed7aa;
                color: #9a3412;
              ">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize the SVG wheel
    this.components.initializeLotteryWheel();

    // Add event listeners
    document.getElementById('back-to-game').addEventListener('click', () => {
      this.showMonthlyLottery = false;
      this.spinResult = null;
      this.wheelRotation = 0; // Reset rotation
      this.render();
    });

    const spinButton = document.getElementById('spin-button');
    if (spinButton && canEnterLottery) {
      spinButton.addEventListener('click', () => {
        this.handleLotterySpin();
      });
    }
  }

  handleLotterySpin() {
  if (this.isSpinning || this.spinResult) return;

  const wheelGroup = document.getElementById('lottery-wheel-group');
  const spinButton = document.getElementById('spin-button');
  const spinControls = document.getElementById('spin-controls');
  const resultDiv = document.getElementById('spin-result');

  if (!wheelGroup || !spinButton || !resultDiv) return;

  this.isSpinning = true;
  spinButton.disabled = true;
  spinButton.innerHTML = '🔄 Spinning...';

  // Prize array matching React component
  const prizes = [
    { name: 'Gift Card', amount: '$1', icon: '🎁' },
    { name: 'Try Again', amount: '', icon: '🔄' },
    { name: 'Gift Card', amount: '$3', icon: '💎' },
    { name: 'Try Again', amount: '', icon: '🔄' },
    { name: 'Gift Card', amount: '$5', icon: '⭐' },
    { name: 'Try Again', amount: '', icon: '🔄' },
    { name: 'Gift Card', amount: '$1', icon: '🎁' },
    { name: 'Try Again', amount: '', icon: '🔄' }
  ];

  const numSegments = prizes.length;
  const segmentAngle = 360 / numSegments;

  const randomSegmentJump = Math.floor(Math.random() * numSegments);
  const randomRotationAngle = randomSegmentJump * segmentAngle;
  const fullSpins = 5 + Math.random() * 2;
  const totalRotation = fullSpins * 360 + randomRotationAngle;

  const currentRotation = this.wheelRotation || 0;
  const targetRotation = currentRotation + totalRotation;
  this.wheelRotation = targetRotation;

  wheelGroup.style.transform = `rotate(${targetRotation}deg)`;

  const pointerAngle = 270;
  const segmentOffset = 20;
  const effectivePointerPosition = (pointerAngle - (targetRotation % 360) + 360) % 360;
  const adjustedAngle = (effectivePointerPosition - segmentOffset + 360) % 360;
  const landedSegmentIndex = Math.floor(adjustedAngle / segmentAngle) % numSegments;
  this.spinResult = prizes[landedSegmentIndex];

  // Define ticket + reward
  const ticketToUse = (this.data?.tickets && this.data.tickets.length > 0) ? this.data.tickets[0] : null;
  const selectedReward = this.spinResult?.name || null;

  // async timeout so await works
  // (inside handleLotterySpin, after computing this.spinResult)
    setTimeout(async () => {
      this.isSpinning = false;
    
      const resultDiv = document.getElementById('spin-result');
      const spinControls = document.getElementById('spin-controls');
    
      if (!resultDiv || !spinControls) return;
    
      // Show result UI
      if (this.spinResult.name === 'Try Again') {
        resultDiv.innerHTML = `
          <div style="
            padding: 20px;
            background: linear-gradient(to right, #fed7aa, #fca5a5);
            border: 1px solid #fb923c;
            border-radius: 12px;
          ">
            <div style="font-size: 48px; margin-bottom: 8px;">${this.spinResult.icon}</div>
            <h3 style="font-size: 20px; font-weight: 700; color: #9a3412; margin-bottom: 6px;">Try Again!</h3>
            <p style="font-size: 14px; color: #c2410c;">Better luck next time! You can spin again if you have enough tickets.</p>
            <p style="font-size: 11px; color: #ea580c; margin-top: 8px;">Keep growing your tree and earning weekly tickets for more chances to win!</p>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div style="
            padding: 20px;
            background: linear-gradient(to right, #d9f99d, #86efac);
            border: 1px solid #4ade80;
            border-radius: 12px;
          ">
            <div style="font-size: 48px; margin-bottom: 8px;">${this.spinResult.icon}</div>
            <h3 style="font-size: 20px; font-weight: 700; color: #166534; margin-bottom: 6px;">Congratulations!</h3>
            <p style="font-size: 14px; color: #15803d;">You won a ${this.spinResult.amount} ${this.spinResult.name}!</p>
            <p style="font-size: 11px; color: #16a34a; margin-top: 8px;">Your prize will be sent to your registered email within 24 hours.</p>
          </div>
        `;
      }
    
      resultDiv.style.display = 'block';
    
      // ---- NEW: define local vars so the "await" section compiles ----
      // In offline / no-backend mode we intentionally do nothing.
      const selectedReward = this.spinResult ? (this.spinResult.amount || '') : '';
      const ticketToUse = null; // replace with a real ticket id once backend returns one
    
      // Record ticket usage in backend (guarded; will be skipped if no backend)
      if (this.userData?.extensionUserId && ticketToUse) {
        try {
          console.log('📡 Recording ticket use in backend...');
          const ticketResult = await BackendIntegration.useTicketBackend(
            ticketToUse.id,
            selectedReward
          );
          if (ticketResult.success) {
            console.log('✅ Ticket use recorded in backend');
          } else {
            console.warn('⚠️ Failed to record ticket use:', ticketResult.error);
          }
    
          await BackendIntegration.logAnalyticsEventBackend(
            this.userData.extensionUserId,
            'lottery_spin',
            { reward: selectedReward, timestamp: new Date().toISOString() }
          );
        } catch (e) {
          console.warn('⚠️ Backend ticket logging skipped:', e);
        }
      }
    
      // Update controls
      spinControls.innerHTML = `
        <button 
          id="spin-again-button"
          style="
            padding: 12px 24px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          "
        >
          🔄 ${this.spinResult.name === 'Try Again' ? 'Spin Again' : 'Try Again (Demo)'}
        </button>
      `;
    
      const spinAgainBtn = document.getElementById('spin-again-button');
      if (spinAgainBtn) {
        spinAgainBtn.addEventListener('click', () => {
          this.spinResult = null;
          this.renderMonthlyLottery();
        });
      }
    }, 6000);
  }

  reviveSameTree() {
    if (!this.data || !this.data.trees || this.data.trees.length === 0) return;
    
    const currentTree = this.data.trees.find(t => t.id === this.data.selectedTree);
    if (!currentTree) return;

    // Reset the tree health and progress
    currentTree.health = 100;
    currentTree.growthProgress = 0;
    currentTree.waterDrops = 0;
    currentTree.poisonDrops = 0;
    currentTree.status = 'growing';
    currentTree.plantedDate = new Date().toISOString();

    // Update local state
    this.treeState = {
      health: 100,
      growth: 0,
      daysGrown: 1,
      totalDays: this.getTotalDaysForTree(currentTree.type),
      waterDrops: 0,
      toxicDrops: 0,
      hasFruit: false,
      isDead: false,
      isCommitted: true
    };

    // Save to storage
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_USER_DATA', 
      data: this.data 
    });

    // Re-render
    this.render();
  }

  calculateUserPosition() {
    // Calculate user position based on their weekly stats
    const weeklyStats = this.data?.weeklyStats || { positiveComments: 0, totalComments: 0 };
    
    // If no activity, return 0 (not ranked)
    if (weeklyStats.totalComments === 0) {
      return 0;
    }
    
    const userScore = (weeklyStats.positiveComments || 0) * 10;
    
    // Estimate position based on positive comments (simulated ranking)
    if (userScore >= 150) return Math.floor(Math.random() * 10) + 1;
    if (userScore >= 100) return Math.floor(Math.random() * 20) + 10;
    if (userScore >= 50) return Math.floor(Math.random() * 30) + 20;
    return Math.floor(Math.random() * 50) + 50;
  }

  getTotalActiveUsers() {
    // Return total active users based on real activity
    // In a real app, this would come from backend
    // For now, return 0 if user has no activity
    const weeklyStats = this.data?.weeklyStats || { totalComments: 0 };
    if (weeklyStats.totalComments === 0) {
      return 0;
    }
    // Simulate active user base (would be real data from server)
    return 1000;
  }

  renderCommentHistoryContent() {
    const comments = this.data?.comments || [];
    
    if (comments.length === 0) {
      return `
        <div class="card-content">
          <div class="no-comments">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">💬</div>
            <p style="font-weight: 500;">No comments yet</p>
            <p style="font-size: 0.875rem;">Start commenting on social media to see your activity here!</p>
          </div>
        </div>
      `;
    }

    const recentComments = comments.slice(0, 5);
    
    return `
      <div class="card-content">
        <div class="comments-list">
          ${recentComments.map(comment => {
            const sentimentClass = comment.sentiment === 'positive' ? 'positive' : 
                                  comment.sentiment === 'negative' ? 'negative' : 'neutral';
            const impactIcon = comment.sentiment === 'positive' ? '💧' : 
                              comment.sentiment === 'negative' ? '☠️' : '💨';
            const impact = comment.sentiment === 'positive' ? '+' + (comment.impact || 2) : 
                          comment.sentiment === 'negative' ? '-' + Math.abs(comment.impact || 2) : '0';
            
            return `
              <div class="comment-item ${sentimentClass}">
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                <div class="comment-meta">
                  <span>${comment.platform || 'Social'} • ${this.formatDate(comment.timestamp)}</span>
                  <span class="comment-impact ${sentimentClass}">${impactIcon} ${impact}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');
    if (loading) loading.style.display = 'none';
    if (app) app.style.display = 'block';
  }

  renderError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="color: #ef4444; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 style="margin: 0 0 8px 0;">Failed to Load Game</h2>
          <p style="margin: 0; color: #6b7280;">Please try refreshing the page</p>
        </div>
        <button id="refresh-btn" style="
          padding: 12px 24px; 
          background: #22c55e; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-size: 14px; 
          cursor: pointer;
        ">
          Refresh Page
        </button>
      </div>
    `;
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
      location.reload();
    });
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TreeGrowthExtension();
});