// detection-service.js
// A) OffscreenDetectorProxy: talks to offscreen page (local model)
// B) ExtensionDetectionService: public API used by background.js

// ===================== A) Offscreen proxy =====================
export class OffscreenDetectorProxy {
  constructor() {
    this.offscreenUrl = chrome.runtime.getURL('offscreen.html');
    this.req = 0;
    this.pending = new Map();

    // Promise that resolves when the offscreen page announces READY
    let resolveReady;
    this.ready = new Promise((r) => (resolveReady = r));

    chrome.runtime.onMessage.addListener((m) => {
      if (!m || m.source !== 'offscreen-detector') return;

      // Handle READY broadcast from offscreen
      if (m.type === 'READY') {
        resolveReady?.();
        return;
      }

      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      m.ok ? p.resolve(m.result) : p.reject(new Error(m.error || 'Detector error'));
    });
  }

  async init() {
    // Create the offscreen document if not present
    const exists = await (chrome.offscreen.hasDocument?.() || false);
    if (!exists) {
      await chrome.offscreen.createDocument({
        url: this.offscreenUrl,
        reasons: ['BLOBS'],
        justification: 'Run local text classification model for comment analysis'
      });
    }

    // Wait until offscreen.html finishes loading (READY message)
    // Fallback to a small delay if READY somehow didn’t arrive yet
    await Promise.race([
      this.ready,
      new Promise((r) => setTimeout(r, 300)) // small grace period
    ]);

    // Warm up the model with retries (offscreen might still be parsing)
    await this._callWithRetry('warmup', {}, 5, 150);
  }

  async classify(text) {
    return this._callWithRetry('classify', { text }, 5, 150);
  }

  // ----- internals -----

  async _callWithRetry(type, payload, maxAttempts = 3, delayMs = 100) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this._call(type, payload);
      } catch (e) {
        lastErr = e;
        const msg = String(e && e.message || e);
        // Retry only when the receiver isn't ready yet
        if (!/Receiving end does not exist|Could not establish connection/i.test(msg)) break;
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
    throw lastErr || new Error('offscreen call failed');
  }

  _call(type, payload) {
    const id = `d${Date.now()}_${++this.req}`;

    // Prepare the Promise for the response
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));

    // Use callback form to swallow "Receiving end does not exist" in early boots
    chrome.runtime.sendMessage(
      { target: 'offscreen-detector', id, type, payload },
      () => {
        // If there's a send-time error (no listener yet), reject immediately
        const err = chrome.runtime.lastError;
        if (err) {
          const p = this.pending.get(id);
          if (p) {
            this.pending.delete(id);
            p.reject(new Error(err.message || 'sendMessage failed'));
          }
        }
      }
    );

    return promise;
  }
}

// ===================== B) Public detection service =====================
export class ExtensionDetectionService {
  constructor() {
    this.config = null;
    this.initialized = false;
    this.offscreen = new OffscreenDetectorProxy();
  }

  async init() {
    await this.loadConfiguration();
    try {
      await this.offscreen.init();
    } catch (e) {
      console.warn('Offscreen init failed:', e);
    }
  }

  async loadConfiguration() {
    try {
      const result = await chrome.storage.local.get(['detectionConfig']);
      this.config = result.detectionConfig || {
        endpoint: '',
        apiKey: '',
        timeout: 10000,
        enableFallback: true
      };
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load detection config:', error);
      this.config = { enableFallback: true };
      this.initialized = true;
    }
  }

  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await chrome.storage.local.set({ detectionConfig: this.config });
  }

  // MAIN entry used by background.js
  async analyzeComment(text) {
    if (!this.initialized) await this.init();

    // 1) Optional HTTP endpoint
    if (this.config.endpoint && this.config.endpoint.trim()) {
      try {
        const r = await this.callCustomModel(text);
        const parsed = this.processAnyModelResponse(r, text, 'custom');
        if (parsed) return parsed;
      } catch (e) {
        console.warn('Custom endpoint failed:', e);
      }
    }

    // 2) Local model via offscreen
    try {
      const { category, score } = await this.offscreen.classify(text);
      return this.fromCategory(category, score, 'local');
    } catch (e) {
      console.warn('Local model failed:', e);
    }

    // 3) Fallbacks
    if (this.config.enableFallback) return this.fallbackAnalysis(text);
    return this.emergencyFallback(text);
  }

  // ---------- Helpers / mappers ----------
  processAnyModelResponse(modelResponse, _originalText, modelUsed) {
    if (!modelResponse) return null;

    if (modelResponse.category) {
      const score = modelResponse.score ?? modelResponse.confidence ?? 0.5;
      return this.fromCategory(modelResponse.category, score, modelUsed);
    }

    if (modelResponse.sentiment || modelResponse.categories) {
      const cat = this.pickBestCategory(modelResponse.categories);
      if (cat) {
        const score = cat.confidence ?? cat.score ?? modelResponse.confidence ?? 0.6;
        return this.fromCategory(cat.name || cat.label || cat, score, modelUsed);
      }
      const sentiment = (modelResponse.sentiment || 'neutral').toLowerCase();
      const tox = Number(modelResponse.toxicity_score || 0);
      const conf = Number(modelResponse.confidence || 0.5);
      return this.fromSentimentToxicity(sentiment, tox, conf, modelUsed);
    }

    return null;
  }

  pickBestCategory(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr
      .map(c => ({ ...c, _c: Number(c.confidence ?? c.score ?? 0) }))
      .sort((a, b) => b._c - a._c)[0];
  }

  normalizeCategory(raw) {
    const k = String(raw).trim().toLowerCase();
    const table = {
      'normal': 'Normal', 'clean': 'Normal', 'non-toxic': 'Normal',
      'profanity': 'Profanity',
      'microaggression': 'Microaggression',
      'derogatory': 'Derogatory',
      'trolling': 'Trolling',
      'hate': 'Hate Speech', 'hate speech': 'Hate Speech'
    };
    return table[k] || raw;
  }

  fromCategory(categoryRaw, score, modelUsed) {
    const category = this.normalizeCategory(categoryRaw);
    const confidence = Math.max(0, Math.min(1, Number(score || 0.5)));

    const weights = {
      'Normal':            +1,
      'Profanity':         -Math.max(2, Math.round(confidence * 10)),
      'Microaggression':   -Math.max(3, Math.round(confidence * 10)),
      'Derogatory':        -Math.max(4, Math.round(confidence * 10)),
      'Trolling':          -Math.max(5, Math.round(confidence * 10)),
      'Hate Speech':       -10
    };

    const signed = weights[category] ?? -Math.max(2, Math.round(confidence * 10));
    const sentiment = category === 'Normal' ? 'positive' : 'negative';
    const impact = Math.min(10, Math.abs(signed));
    const waterDrops = sentiment === 'positive' ? impact : 0;
    const poisonDrops = sentiment === 'negative' ? impact : 0;

    return {
      modelUsed,
      category,
      confidence,
      sentiment,
      impact,
      waterDrops,
      poisonDrops
    };
  }

  fromSentimentToxicity(sentimentRaw, toxicity, confidence, modelUsed) {
    const sentiment = ['positive','negative','neutral'].includes(sentimentRaw) ? sentimentRaw : 'neutral';
    let waterDrops = 0, poisonDrops = 0;

    const confMul = Math.max(0.3, confidence || 0.5);
    if (sentiment === 'positive' && toxicity < 0.3) {
      waterDrops = Math.round((1 + (1 - toxicity)) * confMul * 2);
    } else if (sentiment === 'negative' || toxicity > 0.5) {
      poisonDrops = Math.round((toxicity + 0.5) * confMul * 2);
    } else if (sentiment === 'neutral' && toxicity < 0.3) {
      waterDrops = Math.round(0.5 * confMul);
    }
    const impact = Math.max(waterDrops, poisonDrops);

    return {
      modelUsed,
      category: sentiment === 'positive' ? 'Normal' : 'Trolling',
      confidence,
      sentiment,
      impact,
      waterDrops,
      poisonDrops
    };
  }

  // ---------- HTTP model ----------
  async callCustomModel(text) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.config.timeout || 10000);

    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, options: { return_categories: true, return_confidence: true } }),
        signal: controller.signal
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  // ---------- Strong fallbacks----------
  fallbackAnalysis(text) {
    const lower = String(text || '').toLowerCase();
    const count = (arr) => arr.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);

    const PROFANITY = ['bitch','bastard','asshole','dick','prick','shit','fuck','fucking','crap','bullshit','wtf'];
    const DEROGATORY = ['idiot','moron','stupid','dumb','loser','ugly','worthless','trash','garbage','pig','slut','whore'];
    const TROLLING   = ['kys','kill yourself','go away','nobody cares','shut up'];
    const NEGATIVE   = ['hate','terrible','awful','horrible','disgusting','pathetic','toxic','annoying','irritating','worst','sucks','bad','fail','failure'];
    const POSITIVE   = ['great','awesome','love','amazing','wonderful','excellent','fantastic','good','nice','beautiful','helpful','thanks','thank you'];

    const cProf = count(PROFANITY);
    const cDer  = count(DEROGATORY);
    const cTrol = count(TROLLING);
    const cNeg  = count(NEGATIVE);
    const cPos  = count(POSITIVE);

    if (cDer > 0)  return this.fromCategory('Derogatory',  Math.min(1, 0.5 + 0.2 * cDer),  'fallback');
    if (cProf > 0) return this.fromCategory('Profanity',   Math.min(1, 0.5 + 0.15 * cProf),'fallback');
    if (cTrol > 0 || cNeg > cPos)
                    return this.fromCategory('Trolling',    Math.min(1, 0.4 + 0.1 * (cTrol + cNeg)), 'fallback');
    if (cPos > cNeg)
                    return this.fromCategory('Normal',      Math.min(1, 0.5 + 0.1 * cPos), 'fallback');

    return this.fromCategory('Normal', 0.5, 'fallback');
  }

  emergencyFallback(text) {
    const lower = String(text || '').toLowerCase();
    if (/\bbitch(es)?\b/.test(lower))                         return this.fromCategory('Profanity',   0.7, 'emergency');
    if (/\b(idiot|moron|stupid|dumb|loser)\b/.test(lower))    return this.fromCategory('Derogatory',  0.6, 'emergency');
    if (/\b(hate|awful|horrible|worst|sucks)\b/.test(lower))  return this.fromCategory('Trolling',    0.5, 'emergency');
    if (/\b(great|awesome|love|amazing|wonderful|thanks?)\b/.test(lower))
                                                              return this.fromCategory('Normal',      0.5, 'emergency');
    return this.fromCategory('Normal', 0.3, 'emergency');
  }

  async testConnection() {
    try {
      const r = await this.analyzeComment('This is a test.');
      return { success: true, modelUsed: r.modelUsed, confidence: r.confidence, category: r.category };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}
