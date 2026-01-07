/**
 * Supabase Configuration for Tree Growth Extension
 */

// Supabase Project URL
const SUPABASE_URL = 'https://uxzxughwcdbuzrkmewpc.supabase.co';

// Supabase Anon/Public Key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4enh1Z2h3Y2RidXpya21ld3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg4NzcsImV4cCI6MjA3NjU4NDg3N30.SxHtqCak7EYOx8wg2ZIzlQcjH3MVFLVtFAZjEyZxTU0';

// API Base URL for the Tree Growth backend
const API_BASE_URL = `${SUPABASE_URL}/functions/v1/server/make-server-4a3cc8d2`;

/**
 * Make an API request to the backend
 * @param {string} endpoint - API endpoint (e.g., '/users/register')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`API Error [${response.status}]:`, data);
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * API Helper Functions
 */
const API = {
  // User endpoints
  users: {
    register: (data) => apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    getProfile: (extensionUserId) => apiRequest(`/users/${extensionUserId}`),
    
    updateProfile: (extensionUserId, data) => apiRequest(`/users/${extensionUserId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },
  
  // Comment endpoints
  comments: {
    create: (data) => apiRequest('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    getUserComments: (extensionUserId, limit = 50, offset = 0) => 
      apiRequest(`/comments/user/${extensionUserId}?limit=${limit}&offset=${offset}`),
    
    getById: (commentId) => apiRequest(`/comments/${commentId}`),
  },
  
  // Tree endpoints
  trees: {
    plant: (data) => apiRequest('/trees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    getUserTrees: (extensionUserId, status = null) => {
      const statusParam = status ? `?status=${status}` : '';
      return apiRequest(`/trees/user/${extensionUserId}${statusParam}`);
    },
    
    getById: (treeId) => apiRequest(`/trees/${treeId}`),
    
    update: (treeId, data) => apiRequest(`/trees/${treeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },
  
  // Leaderboard endpoints
  leaderboard: {
    getCurrent: (limit = 50) => apiRequest(`/leaderboard/current?limit=${limit}`),
    
    getByWeek: (weekNumber, year, limit = 50) => 
      apiRequest(`/leaderboard/week/${weekNumber}/year/${year}?limit=${limit}`),
    
    getUserRank: (extensionUserId) => apiRequest(`/leaderboard/user/${extensionUserId}`),
  },
  
  // Ticket endpoints
  tickets: {
    getUserTickets: (extensionUserId, unusedOnly = false) => {
      const unusedParam = unusedOnly ? '?unused=true' : '';
      return apiRequest(`/tickets/user/${extensionUserId}${unusedParam}`);
    },
    
    useTicket: (ticketId, rewardWon) => apiRequest(`/tickets/${ticketId}/use`, {
      method: 'PUT',
      body: JSON.stringify({ rewardWon }),
    }),
  },
  
  // Analytics endpoints
  analytics: {
    getOverview: () => apiRequest('/analytics/overview'),
    
    getWeeklyData: () => apiRequest('/analytics/weekly'),
    
    logEvent: (data) => apiRequest('/analytics/event', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Admin endpoint for processing weekly leaderboard
  admin: {
    processWeeklyLeaderboard: (weekNumber = null, year = null) => {
      const body = {};
      if (weekNumber) body.weekNumber = weekNumber;
      if (year) body.year = year;
      
      return apiRequest('/leaderboard/process-week', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API, SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL };
} 