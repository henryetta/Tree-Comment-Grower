/**
 * Backend Integration Helper for Tree Growth Extension
 * Works in both window (popup/index) and service worker (background)
 * by exporting to a shared global "root" object (globalThis/self/window).
 */

// ---- environment root (service worker = self/globalThis, page = window) ----
const root =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
    ? window
    : {};

// ------------------------ Supabase REST wiring ------------------------
const hasSupabase =
  typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY;

const SB_URL = hasSupabase ? SUPABASE_URL.replace(/\/$/, '') : '';
const SB_HEADERS = hasSupabase
  ? {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  : null;

async function sbFetch(path, init = {}) {
  if (!hasSupabase) throw new Error('Supabase not configured');
  const res = await fetch(`${SB_URL}${path}`, {
    ...init,
    headers: { ...SB_HEADERS, ...(init.headers || {}) }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text || 'request failed'}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// Build a sane REST API against your tables:
// users(extension_user_id, username, email, created_at)
// trees(id, extension_user_id, type, planted_at, status, health, growth_progress, water_drops, poison_drops)
// comments(id, extension_user_id, text, platform, sentiment, toxicity_score, categories_json, created_at)

function ensureArrayRow(r) {
  // Supabase POST/PATCH with Prefer:return=representation returns an array of rows
  if (Array.isArray(r)) return r[0] || null;
  return r || null;
}

async function sbGet(table, match, { select = '*', limit = 100, order, desc } = {}) {

  const params = new URLSearchParams();

  params.set('select', select);

  params.set('limit', String(limit));

  if (order) params.set('order', `${order}.${desc ? 'desc' : 'asc'}`);

  Object.entries(match || {}).forEach(([k, v]) => params.append(`${k}.eq`, v));

  return sbFetch(`/rest/v1/${table}?${params.toString()}`, { method: 'GET' });

}


async function sbPost(table, row) {

  return sbFetch(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(row) });

}


async function sbPatch(table, match, updates) {

  const params = new URLSearchParams();

  Object.entries(match || {}).forEach(([k, v]) => params.append(`${k}.eq`, v));

  return sbFetch(`/rest/v1/${table}?${params.toString()}`, {

    method: 'PATCH',

    body: JSON.stringify(updates)

  });

}

//helper function
async function getUserRowByExtensionId(extensionUserId) {
  const r = await sbFetch(
    `/rest/v1/users?extension_user_id=eq.${encodeURIComponent(extensionUserId)}&select=id,extension_user_id,username,email&limit=1`
  );
  return Array.isArray(r) ? (r[0] || null) : r;
}


// --------------------------- Concrete API ----------------------------
if (!root.API) {
  if (hasSupabase) {
    root.API = {
      users: {
        async register({ extensionUserId, username, email }) {
          const body = {
            extension_user_id: extensionUserId,
            username,
            email
          };
          const r = await sbFetch('/rest/v1/users', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(body)
          });
          return ensureArrayRow(r);
        },
        async updateProfile(extensionUserId, updates) {
          const mapped = {};
          if (updates.username != null) mapped.username = updates.username;
          if (updates.email != null) mapped.email = updates.email;

          const r = await sbFetch(
            `/rest/v1/users?extension_user_id=eq.${encodeURIComponent(extensionUserId)}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(mapped)
            }
          );
          return ensureArrayRow(r);
        },
        async getProfile(extensionUserId) {
          const r = await sbFetch(
            `/rest/v1/users?extension_user_id=eq.${encodeURIComponent(
              extensionUserId
            )}&select=*`
          );
          return Array.isArray(r) ? r[0] || null : r;
        }
      },

      trees: {
         async plant({ extensionUserId, treeType, plantedAt }) {
            const user = await getUserRowByExtensionId(extensionUserId);
            if (!user?.id) throw new Error('User not found for extension_user_id');
        
            const body = {
              user_id: user.id,                  // FK → users.id
              tree_type: treeType,               // DB column
              planted_at: plantedAt || new Date().toISOString(),
              status: 'growing',
              health: 100,
              growth_progress: 0,
              water_drops: 0,
              poison_drops: 0
            };
        
            const r = await sbFetch('/rest/v1/trees', {
              method: 'POST',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(body)
            });
            return ensureArrayRow(r);
          },
          async update(treeId, updates) {
            const mapped = {};
            if (updates.health != null) mapped.health = updates.health;
            if (updates.growthProgress != null) mapped.growth_progress = updates.growthProgress;
            if (updates.waterDrops != null) mapped.water_drops = updates.waterDrops;
            if (updates.poisonDrops != null) mapped.poison_drops = updates.poisonDrops;
            if (updates.status != null) mapped.status = updates.status;
        
            const r = await sbFetch(`/rest/v1/trees?id=eq.${encodeURIComponent(treeId)}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(mapped)
            });
            return ensureArrayRow(r);
          }
        },


      comments: {
         async create({ extensionUserId, commentText, platform, sentiment, toxicityScore, categories }) {
            const user = await getUserRowByExtensionId(extensionUserId);
            if (!user?.id) throw new Error('User not found for extension_user_id');
        
            const body = {
              user_id: user.id,                  // FK → users.id
              comment_text: commentText,         // DB column
              platform,
              sentiment,
              confidence: toxicityScore ?? 0,    // DB uses "confidence"
              category: Array.isArray(categories) && categories[0]?.name ? categories[0].name : null,
              impact: 1,
              water_drops: sentiment === 'positive' ? 1 : 0,
              poison_drops: sentiment === 'negative' ? 1 : 0
            };
        
            const r = await sbFetch('/rest/v1/comments', {
              method: 'POST',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(body)
            });
            return ensureArrayRow(r);
          },
        
          async getUserComments(extensionUserId, limit = 50, offset = 0) {
            const user = await getUserRowByExtensionId(extensionUserId);
            if (!user?.id) return [];
            const r = await sbFetch(
              `/rest/v1/comments?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=${Number(
                limit
              )}&offset=${Number(offset)}&select=*`
            );
            return r || [];
          }
        },
    

      // Optional endpoints — safe no-ops for now so UI never crashes.
      leaderboard: {
        async getCurrent() {
          return []; // implement later with a SQL view if you want live rankings
        },
        async getUserRank() {
          return { rank: 0 };
        }
      },
      tickets: {
         async getUserTickets(extensionUserId, unusedOnly = true) {
           const user = await getUserRowByExtensionId(extensionUserId);
            if (!user?.id) return [];
            const base = `/rest/v1/tickets?user_id=eq.${encodeURIComponent(user.id)}${
              unusedOnly ? '&is_used=is.false' : ''
            }&order=created_at.desc&select=*`;
            return sbFetch(base, { method: 'GET' });
          },
          async useTicket(ticketId, rewardWon) {
            const body = { is_used: true, used_at: new Date().toISOString(), reward_won: rewardWon || null };
            const r = await sbFetch(`/rest/v1/tickets?id=eq.${encodeURIComponent(ticketId)}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(body)
            });
            return ensureArrayRow(r) || { ok: true };
          }
        },

      analytics: {
        async logEvent() {
          return { ok: true }; // wire to a 'events' table later if desired
        }
      }
    };
  } else {
    // Fallback: keep app running completely offline (returns rejected on purpose)
    const reject = async () => {
      throw new Error('API request failed');
    };
    root.API = {
      users: { register: reject, updateProfile: reject, getProfile: reject },
      trees: { plant: reject, update: reject },
      comments: { create: reject, getUserComments: reject },
      leaderboard: { getCurrent: reject, getUserRank: reject },
      tickets: { getUserTickets: reject, useTicket: reject },
      analytics: { logEvent: reject }
    };
  }
}

// ---------------------------- Helpers ----------------------------

// Generate unique extension user ID
function generateExtensionUserId() {
  return `ext_${chrome.runtime.id}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

// Helper to handle API calls with offline fallback
async function safeApiCall(apiFunction, fallbackMessage = 'Backend sync failed') {
  try {
    const result = await apiFunction();
    console.log('✅ Backend sync successful:', result);
    return { success: true, data: result };
  } catch (error) {
    console.warn(`⚠️ ${fallbackMessage}:`, error);
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
}

/** User Registration */
async function registerUserBackend(username, email, extensionUserId) {
  return safeApiCall(
    () =>
      root.API.users.register({
        extensionUserId,
        username,
        email
      }),
    'User registration backend sync failed'
  );
}

/** Update User Profile */
async function updateUserProfileBackend(extensionUserId, username, email) {
  const updates = {};
  if (username) updates.username = username;
  if (email) updates.email = email;

  return safeApiCall(
    () => root.API.users.updateProfile(extensionUserId, updates),
    'Profile update backend sync failed'
  );
}

/** Get User Profile */
async function getUserProfileBackend(extensionUserId) {
  return safeApiCall(
    () => root.API.users.getProfile(extensionUserId),
    'Failed to fetch user profile from backend'
  );
}

/** Plant Tree */
async function plantTreeBackend(extensionUserId, treeType) {
  return safeApiCall(
    () =>
      root.API.trees.plant({
        extensionUserId,
        treeType,
        plantedAt: new Date().toISOString()
      }),
    'Tree planting backend sync failed'
  );
}

/** Update Tree */
async function updateTreeBackend(treeId, updates) {
  return safeApiCall(
    () => root.API.trees.update(treeId, updates),
    'Tree update backend sync failed'
  );
}

/** Create Comment */
async function createCommentBackend(
  extensionUserId,
  commentText,
  platform,
  sentiment,
  toxicityScore,
  categories
) {
  return safeApiCall(
    () =>
      root.API.comments.create({
        extensionUserId,
        commentText,
        platform,
        sentiment,
        toxicityScore: toxicityScore || 0,
        categories: categories || []
      }),
    'Comment backend sync failed'
  );
}

/** Get User Comments */
async function getUserCommentsBackend(extensionUserId, limit = 50, offset = 0) {
  return safeApiCall(
    () => root.API.comments.getUserComments(extensionUserId, limit, offset),
    'Failed to fetch comments from backend'
  );
}

/** Leaderboard */
async function getLeaderboardBackend(limit = 50) {
  return safeApiCall(
    () => root.API.leaderboard.getCurrent(limit),
    'Failed to fetch leaderboard from backend'
  );
}

/** User Rank */
async function getUserRankBackend(extensionUserId) {
  return safeApiCall(
    () => root.API.leaderboard.getUserRank(extensionUserId),
    'Failed to fetch user rank from backend'
  );
}

/** Tickets */
async function getUserTicketsBackend(extensionUserId, unusedOnly = true) {
  return safeApiCall(
    () => root.API.tickets.getUserTickets(extensionUserId, unusedOnly),
    'Failed to fetch tickets from backend'
  );
}

async function useTicketBackend(ticketId, rewardWon) {
  return safeApiCall(
    () => root.API.tickets.useTicket(ticketId, rewardWon),
    'Failed to use ticket in backend'
  );
}

/** Analytics */
async function logAnalyticsEventBackend(extensionUserId, eventType, eventData) {
  return safeApiCall(
    () =>
      root.API.analytics.logEvent({
        extensionUserId,
        eventType,
        eventData: eventData || {}
      }),
    'Analytics logging failed'
  );
}

/** Periodic sync of local data → backend */
async function syncUserDataToBackend(extensionUserId) {
  try {
    const result = await chrome.storage.local.get(['treeGrowthData']);
    const localData = result.treeGrowthData || {};

    console.log('🔄 Syncing local data to backend...');

    const syncResults = { comments: 0, trees: 0, errors: [] };

    // Sync comments (up to 10)
    if (Array.isArray(localData.commentHistory)) {
      for (const comment of localData.commentHistory.slice(0, 10)) {
        if (!comment.syncedToBackend) {
          const r = await createCommentBackend(
            extensionUserId,
            comment.text,
            comment.platform,
            comment.sentiment,
            comment.confidence || 0,
            comment.category
              ? [{ name: comment.category, score: comment.confidence || 0 }]
              : []
          );
          if (r.success) {
            comment.syncedToBackend = true;
            comment.backendId = r.data?.id || null;
            syncResults.comments++;
          } else {
            syncResults.errors.push(`Comment sync failed: ${r.error}`);
          }
          await new Promise((res) => setTimeout(res, 80)); // small throttle
        }
      }
    }

    // Sync current selected tree stats (if it has a backendId)
    if (Array.isArray(localData.trees)) {
      for (const tree of localData.trees) {
        if (tree.backendId) {
          const r = await updateTreeBackend(tree.backendId, {
            health: tree.health,
            growthProgress: tree.growthProgress,
            waterDrops: tree.waterDrops,
            poisonDrops: tree.poisonDrops,
            status: tree.status
          });
          if (r.success) {
            syncResults.trees++;
          } else {
            syncResults.errors.push(`Tree sync failed: ${r.error}`);
          }
        }
      }
    }

    if (syncResults.comments > 0 || syncResults.trees > 0) {
      await chrome.storage.local.set({ treeGrowthData: localData });
    }

    console.log('✅ Sync complete:', syncResults);
    return syncResults;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return { comments: 0, trees: 0, errors: [error.message] };
  }
}

// --------- expose in both window and service worker environments ----------
root.BackendIntegration = {
  generateExtensionUserId,
  registerUserBackend,
  updateUserProfileBackend,
  getUserProfileBackend,
  plantTreeBackend,
  updateTreeBackend,
  createCommentBackend,
  getUserCommentsBackend,
  getLeaderboardBackend,
  getUserRankBackend,
  getUserTicketsBackend,
  useTicketBackend,
  logAnalyticsEventBackend,
  syncUserDataToBackend
};
