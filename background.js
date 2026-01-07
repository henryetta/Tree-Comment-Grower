// Background service worker (classic) for Tree Growth extension
// NOTE: Uses importScripts, so manifest background must NOT be "type: module"
importScripts('supabase-config.js', 'backend-integration.js');

let ExtensionDetectionService = null;

class TreeGrowthBackground {
  constructor() {
    console.log('TreeGrowthBackground: Initializing...');
    this.commentQueue = [];
    this.isProcessing = false;
    this.detectionService = null;

    this.initializeExtension();

    // Run an immediate backend sync, then schedule every 10 minutes
    this.syncPendingCommentsToBackend();
    setInterval(() => this.syncPendingCommentsToBackend(), 10 * 60 * 1000);

    console.log(' TreeGrowthBackground: Initialized successfully');
  }

  initializeExtension() {
    console.log('TreeGrowthBackground: Setting up extension listeners...');

    chrome.runtime.onStartup.addListener(() => {
      console.log('Extension startup detected');
      this.initializeUserData();
    });

    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed/updated');
      this.initializeUserData();
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Message listener triggered');
      this.handleMessage(message, sender, sendResponse);
      return true; // keep the channel open for async replies
    });

    // Periodic queue processor
    setInterval(() => this.processCommentQueue(), 5000);

    console.log('TreeGrowthBackground: Listeners set up successfully');
  }

  async initializeUserData() {
    try {
      // Optional detection service init 
      try {
        if (!this.detectionService) {
          console.log('Using fallback detection method');
        } else {
          await this.detectionService.init();
          console.log('Detection service initialized');
        }
      } catch (e) {
        console.warn('Detection service not available, using fallback:', e);
      }

      const result = await chrome.storage.local.get(['treeGrowthData', 'treeGrowth_userData']);
      
      // Initialize tree growth data if not exists
      if (!result.treeGrowthData) {
        const initialData = {
          trees: [],
          selectedTree: null,
          isFirstTime: true,
          hasCompletedOnboarding: false,
          weeklyStats: {
            positiveComments: 0,
            negativeComments: 0,
            totalComments: 0,
            currentWeek: this.getCurrentWeek()
          },
          leaderboard: [],
          tickets: 0,
          commentHistory: [],
          totalWaterDrops: 0,
          totalPoisonDrops: 0,
          createdAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ treeGrowthData: initialData });
        console.log('Tree Growth extension initialized with default data');
      }

      //Auto-register anonymous user in backend if not already registered
      if (!result.treeGrowth_userData) {
        console.log('📡 No user data found, creating anonymous user...');
        const extensionUserId = BackendIntegration.generateExtensionUserId();
        
        const userData = {
          extensionUserId,
          username: `User_${extensionUserId.slice(-6)}`, // Anonymous username
          signupDate: new Date().toISOString(),
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        await chrome.storage.local.set({ treeGrowth_userData: userData });
        
        // Register in backend 
        try {
          const backendResult = await BackendIntegration.registerUserBackend(
            userData.username, 
            extensionUserId
          );
          
          if (backendResult.success) {
            console.log('Anonymous user registered in backend');
          } else {
            console.warn('Anonymous user registration failed:', backendResult.error);
          }
        } catch (error) {
          console.warn('Could not register user in backend:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Background: Received message:', message?.type);
    console.log('Background: Message data:', message);

    (async () => {
      try {
        switch (message.type) {
          case 'NEW_COMMENT':
            console.log('Background: Handling NEW_COMMENT');
            await this.queueComment(message.data);
            sendResponse({ success: true });
            break;

          case 'GET_USER_DATA':
            console.log('Background: Handling GET_USER_DATA');
            sendResponse({ success: true, data: await this.getUserData() });
            break;

          case 'UPDATE_USER_DATA':
            console.log('Background: Handling UPDATE_USER_DATA');
            await this.updateUserData(message.data);
            sendResponse({ success: true });
            break;

          case 'ANALYZE_COMMENT':
            console.log('Background: Handling ANALYZE_COMMENT');
            sendResponse({ success: true, analysis: await this.analyzeComment(message.comment) });
            break;

          default:
            console.warn('Background: Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Background: Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  async queueComment(commentData) {
    this.commentQueue.push({
      ...commentData,
      timestamp: new Date().toISOString(),
      processed: false
    });

    if (!this.isProcessing) {
      this.processCommentQueue();
    }
  }

  async processCommentQueue() {
    if (this.isProcessing || this.commentQueue.length === 0) return;

    this.isProcessing = true;
    try {
      const unprocessed = this.commentQueue.filter(c => !c.processed);
      for (const comment of unprocessed) {
        await this.processComment(comment);
        comment.processed = true;
      }

      // cleanup processed older than 1h
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);
      this.commentQueue = this.commentQueue.filter(
        c => !c.processed || new Date(c.timestamp) > cutoff
      );
    } catch (error) {
      console.error('Error processing comment queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processComment(commentData) {
    try {
      console.log('Processing comment:', (commentData.text || '').substring(0, 50) + '...');

      // Analyze comment with keyword-based fallback
      const analysis = await this.analyzeComment(commentData.text);
      console.log('Analysis result:', analysis);

      // Update user stats
      const userData = await this.getUserData();
      const updatedData = this.updateStatsFromComment(userData, analysis, commentData);

      await chrome.storage.local.set({ treeGrowthData: updatedData });

      // Notify popup
      this.notifyPopup({
        type: 'COMMENT_PROCESSED',
        data: { analysis, commentData, newStats: updatedData.weeklyStats }
      });

      console.log('Comment processed successfully!');

      // Backend sync (wrapped so local flow never fails)
      try {
        const storageResult = await chrome.storage.local.get(['treeGrowth_userData']);
        const userProfile = storageResult.treeGrowth_userData;

        if (userProfile && userProfile.extensionUserId) {
          console.log('📡 Syncing comment to backend...');
          const categories = [{
            name: analysis.category || 'Normal',
            score: analysis.confidence || 0.5
          }];

          const backendResult = await BackendIntegration.createCommentBackend(
            userProfile.extensionUserId,
            commentData.text,
            commentData.platform || 'unknown',
            analysis.sentiment,
            analysis.confidence || 0.5,
            categories
          );

          if (backendResult.success) {
            console.log('Comment synced to backend successfully');

            // Mark comment as synced
            const idx = updatedData.commentHistory.findIndex(
              c => c.text === commentData.text && c.timestamp === commentData.timestamp
            );
            if (idx !== -1) {
              updatedData.commentHistory[idx].syncedToBackend = true;
              updatedData.commentHistory[idx].backendId = backendResult.data?.id || null;
              await chrome.storage.local.set({ treeGrowthData: updatedData });
            }

            // Update tree stats in backend if tree exists
            const currentTree = updatedData.trees.find(t => t.id === updatedData.selectedTree);
            if (currentTree && currentTree.backendId) {
              console.log('📡 Updating tree stats in backend...');
              const treeUpdateResult = await BackendIntegration.updateTreeBackend(
                currentTree.backendId,
                {
                  health: currentTree.health,
                  growthProgress: currentTree.growthProgress,
                  waterDrops: currentTree.waterDrops,
                  poisonDrops: currentTree.poisonDrops,
                  status: currentTree.status
                }
              );
              if (treeUpdateResult.success) {
                console.log('Tree stats updated in backend');
              } else {
                console.warn('Tree stats update failed:', treeUpdateResult.error);
              }
            }
          } else {
            console.warn('Backend comment sync failed:', backendResult.error);
          }
        } else {
          console.log('Skipping backend sync - no user extensionUserId found');
        }
      } catch (backendError) {
        console.error(' Backend sync error:', backendError);
      }

    } catch (error) {
      console.error('Error processing comment:', error);
    }
  }

  async analyzeComment(text) {
    // Using keyword-based fallback analysis
    return this.fallbackAnalyzeComment(text);
  }

  fallbackAnalyzeComment(text) {
    const lower = String(text || '').toLowerCase();
    const count = (arr) => arr.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);

    // All 6 category keyword lists
    const PROFANITY = ['fuck','shit','damn','bitch','ass','bastard','crap','piss','cock','hell','goddamn'];
    const DEROGATORY = ['idiot','moron','stupid','dumb','loser','pathetic','worthless','trash','scum','garbage','waste'];
    const HATE_SPEECH = ['hate','kill','die','death','racist','nazi','kys','hang','lynch','genocide','terrorist'];
    const MICROAGGRESSION = ['actually','mansplain','you people','one of the good ones','not like other','surprisingly articulate','exotic','where are you really from'];
    const TROLLING = ['lol','lmao','cry','cope','seethe','mald','ratio','l+ratio','bozo','skill issue','mad','salty','triggered'];
    const POSITIVE = ['great','awesome','love','amazing','wonderful','excellent','fantastic','good','nice','beautiful','helpful','thanks','thank you','appreciate','well done','brilliant','perfect','agree','support','insightful','interesting','cool','respect'];

    const cProf = count(PROFANITY);
    const cDer  = count(DEROGATORY);
    const cHate = count(HATE_SPEECH);
    const cMicro = count(MICROAGGRESSION);
    const cTrol = count(TROLLING);
    const cPos  = count(POSITIVE);

    let category = 'Normal';
    let sentiment = 'neutral';
    let confidence = 0.5;
    let impact = 1;

    // Priority order: Hate Speech > Derogatory > Microaggression > Profanity > Trolling > Normal (positive or neutral)
    if (cHate > 0) {
      category = 'Hate Speech';
      sentiment = 'negative';
      confidence = Math.min(1, 0.7 + 0.15 * cHate);
      impact = Math.min(10, Math.max(7, Math.round(confidence * 10))); // Severe: 7-10
    } else if (cDer > 0) {
      category = 'Derogatory';
      sentiment = 'negative';
      confidence = Math.min(1, 0.6 + 0.2 * cDer);
      impact = Math.min(10, Math.max(5, Math.round(confidence * 10))); // High: 5-10
    } else if (cMicro > 0) {
      category = 'Microaggression';
      sentiment = 'negative';
      confidence = Math.min(1, 0.5 + 0.15 * cMicro);
      impact = Math.min(10, Math.max(3, Math.round(confidence * 8))); // Medium: 3-8
    } else if (cProf > 0) {
      category = 'Profanity';
      sentiment = 'negative';
      confidence = Math.min(1, 0.5 + 0.15 * cProf);
      impact = Math.min(10, Math.max(2, Math.round(confidence * 7))); // Medium-low: 2-7
    } else if (cTrol > 0) {
      category = 'Trolling';
      sentiment = 'negative';
      confidence = Math.min(1, 0.4 + 0.1 * cTrol);
      impact = Math.min(10, Math.max(2, Math.round(confidence * 6))); // Low: 2-6
    } else if (cPos > 0) {
      // Normal is POSITIVE - adds water drops
      category = 'Normal';
      sentiment = 'positive';
      confidence = Math.min(1, 0.5 + 0.1 * cPos);
      impact = Math.min(10, Math.max(1, Math.round(confidence * 5))); // Positive: 1-5
    }
    // If no keywords matched, default is neutral Normal with minimal impact

    const waterDrops = sentiment === 'positive' ? impact : 0;
    const poisonDrops = sentiment === 'negative' ? impact : 0;

    console.log(`Comment analyzed (fallback): "${(text || '').substring(0, 50)}..." → ${category} (${sentiment}, impact: ${impact})`);

    return {
      sentiment,
      impact,
      category,
      confidence,
      modelUsed: 'fallback',
      waterDrops,
      poisonDrops
    };
  }

  updateStatsFromComment(userData, analysis, commentData) {
    const currentWeek = this.getCurrentWeek();

    // --- Weekly Reset + Ticket Awarding ---
  if (userData.weeklyStats.currentWeek !== currentWeek) {
    const lastWeekPosition = this.calculateUserPosition(userData.weeklyStats);
    if (lastWeekPosition <= 50 && userData.weeklyStats.totalComments > 0) {
      userData.tickets = (userData.tickets || 0) + 1;
      console.log(`🎟 Ticket earned! Rank #${lastWeekPosition}. Total tickets: ${userData.tickets}`);
    }

    userData.weeklyStats = {
      positiveComments: 0,
      neutralComments: 0,
      negativeComments: 0,
      totalComments: 0,
      currentWeek
    };
  }

  // Always count comment
  userData.weeklyStats.totalComments++;

  // --- UNIFIED SCORING SYSTEM ---
  let score = 0;
  const sentiment = analysis.sentiment?.toLowerCase() || "neutral";

  if (sentiment === "positive") {
    score = 3;
    userData.weeklyStats.positiveComments++;
  } else if (sentiment === "neutral" || sentiment === "normal") {
    score = 2;
    userData.weeklyStats.neutralComments = (userData.weeklyStats.neutralComments || 0) + 1;
  } else if (sentiment === "negative") {
    score = -3;
    userData.weeklyStats.negativeComments++;
  } else {
    // unknown → treat as neutral
    score = 2;
    userData.weeklyStats.neutralComments = (userData.weeklyStats.neutralComments || 0) + 1;
  }

  // --- APPLY SCORE TO TREE GROWTH ---

  const tree = userData.trees?.find(t => t.id === userData.selectedTree);

  console.log('Tree growth application:', {
    hasTree: !!tree,
    treeId: tree?.id,
    treeStatus: tree?.status,
    selectedTreeId: userData.selectedTree,
    score: score,
    sentiment: sentiment,
    currentHealth: tree?.health,
    currentProgress: tree?.growthProgress
  });

  if (tree && tree.status === "growing") {
    if (score > 0) {
      // Positive or Neutral
      const oldHealth = tree.health || 0;
      const oldProgress = tree.growthProgress || 0;
      
      tree.health = Math.min(100, (tree.health || 0) + score);
      tree.growthProgress = Math.min(100, (tree.growthProgress || 0) + score);
      tree.waterDrops = (tree.waterDrops || 0) + score;
      tree.lastWatered = new Date().toISOString();
      
      console.log(`Tree grew! Health: ${oldHealth} → ${tree.health}, Progress: ${oldProgress} → ${tree.growthProgress}`);
    } else {
      // Negative
      const damage = Math.abs(score);
      const oldHealth = tree.health || 0;
      const oldProgress = tree.growthProgress || 0;
      
      tree.health = Math.max(0, (tree.health || 0) - damage);
      tree.growthProgress = Math.max(0, (tree.growthProgress || 0) - damage);
      tree.poisonDrops = (tree.poisonDrops || 0) + damage;
      tree.lastPoisoned = new Date().toISOString();

      console.log(`Tree damaged! Health: ${oldHealth} → ${tree.health}, Progress: ${oldProgress} → ${tree.growthProgress}, Damage: ${damage}`);

      if (tree.health <= 0) {
        tree.status = "dead";
        tree.deathDate = new Date().toISOString();
        console.log('Tree died!');
      }
    }
  } else {
    if (!tree) {
      console.warn(' No tree found! Trees:', userData.trees?.length, 'Selected:', userData.selectedTree);
    } else if (tree.status !== "growing") {
      console.warn(`Tree status is "${tree.status}", not "growing"`);
    }
  }

  // --- STORE FULL COMMENT HISTORY (NO TRUNCATION) ---
  userData.commentHistory = userData.commentHistory || [];

  userData.commentHistory.unshift({
    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text: commentData.text,
    platform: commentData.platform || "unknown",
    url: commentData.url || "",
    sentiment,
    impact: score,              
    timestamp: commentData.timestamp || new Date().toISOString(),
    category: analysis.category,
    confidence: analysis.confidence,
    syncedToBackend: false,
    backendId: null
  });


  return userData;
}


  /**
   * Periodic backend sync - syncs unsynced comments every 10 minutes
   */
  async syncPendingCommentsToBackend() {
    try {
      const storageResult = await chrome.storage.local.get(['treeGrowth_userData', 'treeGrowthData']);
      const userProfile = storageResult.treeGrowth_userData;
      const userData = storageResult.treeGrowthData;

      if (!userProfile?.extensionUserId || !userData?.commentHistory) {
        console.log('Skipping periodic sync - no user or comment data');
        return;
      }

      console.log('Syncing pending comments to backend...');
      const unsynced = userData.commentHistory.filter(c => !c.syncedToBackend);
      
      if (unsynced.length === 0) {
        console.log('No pending comments to sync');
        return;
      }

      console.log(`📡 Syncing ${unsynced.length} comments...`);
      let syncedCount = 0;

      // Sync max 20 at a time to avoid overwhelming the backend
      for (const comment of unsynced.slice(0, 20)) {
        try {
          // Get current tree type
          const currentTree = userData?.trees?.find(t => t.id === userData.selectedTree);
          const treeType = currentTree?.type || null;
          
          const categories = [{
            name: comment.category || 'Normal',
            score: comment.confidence || 0.5
          }];

          const result = await BackendIntegration.createCommentBackend(
            userProfile.extensionUserId,
            comment.text,
            comment.platform || 'unknown',
            comment.sentiment,
            comment.confidence || 0.5,
            categories,
            comment.impact || 1,
            (comment.sentiment === 'positive' ? (comment.impact || 1) : 0),
            (comment.sentiment === 'neutral' ? Math.abs(comment.impact || 0) : 0)
            (comment.sentiment === 'negative' ? Math.abs(comment.impact || 1) : 0),
            treeType
          );

          if (result.success) {
            comment.syncedToBackend = true;
            comment.backendId = result.data?.id || null;
            syncedCount++;
          } else {
            console.warn('⚠️ Failed to sync comment:', result.error);
          }

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.error('Error syncing comment:', err);
        }
      }

      if (syncedCount > 0) {
        await chrome.storage.local.set({ treeGrowthData: userData });
        console.log(`Synced ${syncedCount} comments to backend`);
      }
    } catch (error) {
      console.error(' Background sync error:', error);
    }
  }

  async getUserData() {
    const result = await chrome.storage.local.get(['treeGrowthData']);
    return result.treeGrowthData || {};
  }

  async updateUserData(newData) {
    await chrome.storage.local.set({ treeGrowthData: newData });
  }

  getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  calculateUserPosition(weeklyStats) {
    // Use real scoring calculation: +3 positive, +2 neutral, -3 negative
    const positiveScore = (weeklyStats?.positiveComments || 0) * 3;
    const neutralScore = (weeklyStats?.neutralComments || 0) * 2;
    const negativeScore = (weeklyStats?.negativeComments || 0) * -3;
    const userScore = positiveScore + neutralScore + negativeScore;
    
    // Estimate position based on score (simulated until we have multi-user backend ranking)
    if (userScore >= 150) return Math.floor(Math.random() * 10) + 1;   // Rank 1-10
    if (userScore >= 100) return Math.floor(Math.random() * 20) + 10;  // Rank 10-30
    if (userScore >= 50)  return Math.floor(Math.random() * 30) + 20;  // Rank 20-50
    return Math.floor(Math.random() * 50) + 50;  // Rank 50-100
  }

  notifyPopup(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => { /* popup not open */ });
    } catch (e) {
      // Ignore errors when popup is not open
    }
  }
}

// Initialize background script
new TreeGrowthBackground();
