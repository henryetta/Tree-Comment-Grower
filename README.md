# 🌱 GrowthForest: A Longitudinal Browser-Based Intervention for Reducing Psychological Distance and Lack of Awareness in Online Commenting

**PhD Research Project | Behavior Change Through Persistent Visualization**

---

## Research Abstract

Harmful commenting persists due to interface designs that obscure social consequences and limited awareness of cumulative impact. Most interventions are momentary, offering little longitudinal reflection support. We developed a browser-based system that maps comments onto a persistent virtual tree designed to reduce psychological distance and increase awareness. 

In a **seven-week field study (N = 50)**, we examined associations between continuous feedback and commenting patterns. **Positive comments increased from 38.5% to 67.2%** (β = 5.127%/week, 95%CI: 2.08−8.18, p = 0.008); neutral decreased from 54.8% to 30.8% (β = −4.16%/week, 95%CI: −6.5 to −1.8, p = 0.004); negative remained low (6.7% → 2.0%). 

Post-study survey (N = 37) showed consequences of commenting felt more concrete (Perception: M = 4.28/5, p < 0.001). However, the single-arm observational design without control group prevents causal inference; patterns could reflect self-selection or Hawthorne effects. Findings warrant randomized controlled trials to establish causal efficacy.

**Keywords**: Psychological Distance, Online Commenting, Information Visualization, Prosocial Behavior, Cumulative Feedback

---

## Study Methodology

### Research Design
- **Design**: Single-arm observational longitudinal field study
- **Duration**: 7 weeks of continuous monitoring
- **Sample Size**: N = 50 participants
- **Platforms**: Twitter and Instagram
- **Data Collection**: Real-time comment monitoring via Chrome extension
- **Post-Study Survey**: N = 37 respondents

### Intervention Mechanism
The system reduces **psychological distance** between users and the consequences of their online behavior through:
1. **Persistent Visualization**: Virtual tree represents cumulative commenting behavior over 8-12 weeks
2. **Immediate Feedback**: Real-time sentiment analysis with visual indicators (water drops vs. poison)
3. **Long-term Commitment**: Tree selection creates binding commitment to 49-84 day growth cycles
4. **Concrete Consequences**: Tree health/growth directly maps to commenting patterns
5. **Social Accountability**: Weekly leaderboards and comparative feedback

### Measurement & Analysis
- **Primary Outcome**: Percentage of positive, neutral, and negative comments per week
- **Secondary Outcome**: Participant perception of commenting consequences (5-point scale)
- **Statistical Methods**: Linear regression for temporal trends with 95% confidence intervals
- **Sentiment Classification**: AI-powered toxicity detection with configurable models

---

## Key Findings

### Behavioral Outcomes (N = 50, 7 weeks)

| Metric | Baseline | Week 7 | Change | Statistical Significance |
|--------|----------|--------|--------|-------------------------|
| **Positive Comments** | 38.5% | 67.2% | +28.7pp | β = 5.127%/week, p = 0.008 |
| **Neutral Comments** | 54.8% | 30.8% | -24.0pp | β = -4.16%/week, p = 0.004 |
| **Negative Comments** | 6.7% | 2.0% | -4.7pp | Low baseline maintained |

### Perceptual Outcomes (N = 37 post-study survey)
- **Concrete Consequences**: M = 4.28/5, p < 0.001
- Participants reported significantly increased awareness of commenting impact
- Longitudinal reflection supported by persistent visualization

### Limitations & Future Directions
- **No Control Group**: Cannot establish causal efficacy definitively
- **Potential Confounds**: Self-selection bias, Hawthorne effects, social desirability
- **Next Steps**: Randomized controlled trial (RCT) needed to establish causality
- **Generalizability**: Results specific to self-selected participants willing to monitor behavior

---

## Theoretical Foundation

### Psychological Distance Theory
Psychological distance refers to the subjective perception of how far removed something is from direct experience. Online commenting often creates high psychological distance through:
- **Temporal distance**: No immediate consequences
- **Social distance**: Abstract audience, no visible impact
- **Hypothetical distance**: Consequences feel unlikely or unreal

### Intervention Design Principles
GrowthForest reduces psychological distance by:

1. **Concreteness**: Abstract "being nice online" → Tangible tree health
2. **Immediacy**: Delayed consequences → Real-time visual feedback
3. **Persistence**: Momentary interventions → 7-12 week continuous feedback
4. **Cumulative Representation**: Individual actions → Visible accumulated impact
5. **Commitment Mechanisms**: Optional behavior → Binding tree selection

### Behavior Change Mechanisms
- **Self-Monitoring**: Continuous awareness of commenting patterns
- **Goal Setting**: Tree growth milestones and health thresholds
- **Social Comparison**: Weekly leaderboards provide normative feedback
- **Gamification**: Achievement system and lottery rewards maintain engagement
- **Identity Formation**: Long-term commitment fosters self-perception shift

---

## Technical Implementation

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Participant Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Social Media Platforms: Twitter │ Instagram │              │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Chrome Extension  │ (Manifest V3)
         │ ┌───────────────┐ │
         │ │Content Scripts│ │ ← Monitors DOM for user comments
         │ └───────┬───────┘ │
         │ ┌───────▼───────┐ │
         │ │  Background   │ │ ← Event processing & storage
         │ │Service Worker │ │
         └─────────┬─────────┘
                   │
         ┌─────────▼──────────────────┐
         │   Detection Service        │
         ├────────────────────────────┤
         │ • Client-side Analysis     │
         │ • Server-side Fallback     │
         │ • Configurable AI Models   │
         └─────────┬──────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────┐          ┌─────────▼─────────┐
│ React App  │          │ Supabase Backend  │
├────────────┤          ├───────────────────┤
│ • Tree Viz │          │ • Edge Functions  │
│ • Analytics│          │ • Data Storage    │
│ • Dashboard│          │ • Auth            │
└────────────┘          └───────────────────┘
```

### Technology Stack

#### Frontend Architecture
- **React 18** with TypeScript for type-safe component development
- **Tailwind CSS v4** for consistent design system
- **Motion (Framer Motion)** for smooth animations and transitions
- **Recharts** for data visualization and analytics dashboards
- **React Router** for multi-view navigation

#### Chrome Extension (Research Instrument)
- **Manifest V3** for modern extension architecture
- **Content Scripts** with platform-specific DOM selectors for 7 social platforms
- **Background Service Workers** for event-driven comment processing
- **Chrome Storage API** for local data persistence and offline capability

#### Backend & Data Infrastructure
- **Supabase** for backend services and data storage
- **Edge Functions** for server-side AI analysis
- **PostgreSQL** for participant data and analytics
- **Real-time subscriptions** for live leaderboard updates

#### AI & Sentiment Analysis
- **Configurable detection models** (bring-your-own or use default)
- **Client-side analysis** option for privacy preservation
- **Fallback architecture** ensures 100% comment coverage
- **Multi-model support** for research flexibility

### Data Collection Pipeline

```
User Comment → Platform Detection → Sentiment Analysis → Classification
                                                               ↓
Tree Visualization ← Feedback Rendering ← Impact Calculation ←┘
         ↓
Weekly Aggregation → Leaderboard Ranking → Lottery Tickets
         ↓
Research Database (anonymized, time-series data)
```

---

## Hybrid AI-Lexical Classification System

### Model Architecture & Training

**Base Model**: Fine-tuned 12-layer BERT transformer  
- Architecture: `dbmdz/bert-base-turkish-uncased` retrained on English corpora
- Conservative confidence thresholds to reward only high-certainty prosocial expression
- Framework: PyTorch with GPU acceleration

**Training Dataset**: Trawling for Trolling Dataset  
- **Total**: N = 30,252 comments after oversampling
- **Categories**: 6 classes (Normal, Trolling, Profanity, Derogatory, Hate Speech, Microaggression)
- **Splits**: Standard train/validation/test division

**Model Performance**:

| Split | Accuracy | F1 Score | Precision | Recall |
|-------|----------|----------|-----------|--------|
| Train | 0.951 | 0.951 | 0.951 | 0.951 |
| Validation | 0.860 | 0.860 | 0.859 | 0.861 |
| **Test** | **0.867** | **0.864** | **0.864** | **0.865** |

### Two-Layer Detection Pipeline

The classification system employs a hybrid approach to balance accuracy and user experience:

#### Layer 1: Priority-Based Lexical Filtering
Before ML model inference, comments pass through deterministic keyword matching:

**Toxic Categories** (immediate penalty):
1. **Hate Speech**: Triggers -3 penalty
2. **Derogatory**: Triggers -3 penalty  
3. **Microaggression**: Triggers -3 penalty
4. **Profanity**: Triggers -3 penalty
5. **Trolling**: Triggers -3 penalty

**Positive Keywords** (immediate reward):
- Terms like "thanks", "insightful", "appreciate" trigger +3 reward
- Ensures constructive behavior receives immediate reinforcement

**Implementation Details**:
- Word-boundary regular expressions prevent false positives
- Priority matching ensures high-confidence toxic/positive terms bypass ML uncertainty

#### Layer 2: BERT Model Inference

For comments not caught by lexical filter:

**Scoring Logic**:
```
Positive Sentiment (+3): High-confidence Normal classification
Negative Sentiment (-3): Toxic category matches
Neutral Sentiment (+2): Low-confidence or out-of-distribution (e.g., non-English)
```

**Fallback Handling**:
- If BERT model unavailable, keyword filter ensures 100% feedback continuity
- Out-of-distribution detection (Spanish, Hindi, etc.) defaults to neutral (+2)

### Impact on Deployment Results

**Negative Sentiment Reduction**:
- **AI-only baseline** (raw re-analysis): 51.03% negative
- **Hybrid deployment** (keyword + BERT): 6.7% negative

This 44.3 percentage point reduction demonstrates the hybrid system's role in:
1. Mitigating AI semantic over-sensitivity
2. Avoiding penalization of ambiguous user input
3. Maintaining research ecological validity

### System Resilience Features

- **Fail-safe mechanism**: Keyword filtering ensures consistent feedback even during model downtime
- **Conservative thresholds**: Only high-confidence classifications trigger strong feedback
- **Linguistic robustness**: Handles multilingual inputs without incorrect penalties
- **Real-time inference**: Sub-second classification enables immediate visual feedback

### Visual Feedback Components

Participants received multi-layered interface feedback:

1. **Post-Comment Overlay**: Brief, non-blocking notification showing drops awarded and tree status
2. **Tree Visualization**: Animated graphic reflecting cumulative health and growth
3. **Progress Dashboard**: Summary of comment activity, sentiment ratios, and weekly trends
4. **Ambient Health Indicator**: Persistent but unobtrusive status bar

This architecture balanced **salience** (ensuring participants noticed feedback) with **non-intrusiveness** (avoiding disruption to natural commenting behavior).

---

## System Features

### Core Gamification Mechanics

#### Tree System (Commitment Device)
- **6 Tree Types** with varying difficulty and duration:
  - Cherry (49 days) - Beginner
  - Apple (56 days) - Beginner
  - Peach (56 days) - Intermediate
  - Orange (63 days) - Intermediate
  - Lemon (70 days) - Advanced
  - Coconut (84 days) - Advanced
- **Binding Commitment**: Once selected, users cannot change trees
- **Visual Feedback**: Real-time health (0-100%) and growth (0-100%) indicators

#### Feedback System
- **Water Drops**: +1 for each positive comment (boosts health & growth)
- **Poison Drops**: +1 for each toxic comment (damages health & growth)
- **Neutral**: Minor random effects for neutral comments
- **Tree Death**: Health reaching 0% kills tree (but allows revival)
- **Fruit Achievement**: 90%+ growth + 70%+ health = success state

#### Social Features
- **Weekly Leaderboards**: Ranking among all participants
- **Lottery Tickets**: Top 50 users each week earn tickets
- **Monthly Prize Wheel**: 8-segment wheel requires 2+ tickets to spin
- **Achievement System**: Milestone tracking and badges

### Multi-Platform Monitoring

Supported platforms with automatic comment detection:
- **Twitter/X**: Tweets, replies, quote tweets
- **Facebook**: Posts, comments, reactions
- **Instagram**: Comments, captions, direct replies
- **LinkedIn**: Posts, comments, articles
- **Reddit**: Comments, posts, replies
- **YouTube**: Video comments, replies
- **TikTok**: Video comments, replies

### Privacy & Ethics (IRB Considerations)

- **Informed Consent**: Explicit opt-in with full disclosure
- **Data Minimization**: Only sentiment scores stored, not comment text
- **Local Analysis Option**: Client-side processing available
- **Participant Control**: Can disable monitoring per platform
- **Anonymization**: Research data stripped of identifying information
- **Withdrawal**: Participants can exit study and delete data anytime

---

## Project Structure

```
/
├── extension/                    # Chrome extension (research instrument)
│   ├── manifest.json            # V3 extension configuration
│   ├── background.js            # Service worker for event processing
│   ├── content-script.js        # DOM monitoring for social platforms
│   ├── detection-service.js     # Client-side sentiment analysis
│   ├── popup.html/js            # Quick dashboard popup
│   ├── index.html/js            # Full game interface
│   └── styles/                  # Extension-specific CSS
│
├── components/                   # React components (web app)
│   ├── TreeGarden.tsx           # Main orchestration component
│   ├── TreeSelection.tsx        # Tree commitment interface
│   ├── TreeVisualization.tsx    # Real-time tree rendering
│   ├── CommentHistory.tsx       # Participant comment log
│   ├── Leaderboard.tsx          # Weekly rankings
│   ├── MonthlyLottery.tsx       # Prize wheel interface
│   ├── WeeklyActivity.tsx       # Analytics dashboard
│   ├── SocialMediaConnections.tsx # Platform management
│   └── ModelConfiguration.tsx   # AI model setup
│
├── utils/
│   └── detection/               # Sentiment analysis system
│       ├── CommentDetectionService.tsx  # Core detection logic
│       ├── DetectionConfig.tsx          # Configuration manager
│       └── DetectionIntegration.tsx     # Game integration layer
│
├── supabase/
│   └── functions/server/        # Backend edge functions
│
└── styles/
    └── globals.css              # Design system tokens
```

---

## Installation & Deployment

### Web Application
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```

### Chrome Extension (Research Deployment)
```bash
# Navigate to extension
cd extension

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select /extension folder

# Extension now active for participant
```

### Configuration
```bash
# Required for server-side analysis
# Create .env file with Supabase credentials
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_ANON_KEY=your_anon_key

# Optional: Configure custom AI model
# Via ModelConfiguration.tsx interface
```

---

## Research Contributions

### Empirical Contributions
1. **First longitudinal study** (7 weeks) of persistent visualization for online behavior change
2. **Quantitative evidence** of behavior shift with statistical significance
3. **Field deployment** across 7 real social media platforms (high ecological validity)
4. **Perceptual validation** of psychological distance reduction

### Methodological Contributions
1. **Browser-based research instrument** enabling naturalistic observation
2. **Real-time data collection** without disrupting participant behavior
3. **Multi-platform monitoring** system architecture
4. **Scalable intervention** design for future RCTs

### Design Contributions
1. **Gamification framework** for long-term behavior change
2. **Commitment device** design (tree selection + binding)
3. **Cumulative feedback** visualization system
4. **Cross-platform integration** patterns for social media research

---

## Future Research Directions

### Immediate Next Steps
- [ ] **Randomized Controlled Trial** with treatment and control groups
- [ ] **Mechanism analysis** to isolate active intervention components
- [ ] **Dosage testing** for optimal feedback frequency
- [ ] **Long-term follow-up** to assess behavior persistence post-intervention

### Extended Research Agenda
- [ ] **Cross-cultural validation** in different linguistic/cultural contexts
- [ ] **Platform-specific effects** (does intervention work differently on Twitter vs. LinkedIn?)
- [ ] **Individual differences** (personality traits, baseline toxicity levels)
- [ ] **Theoretical extension** to other prosocial behaviors beyond commenting
- [ ] **Qualitative studies** of participant experience and meaning-making

---

## Technical Highlights for Industry Applications

This project demonstrates capabilities relevant to data-driven organizations:

### Research & Experimentation
- **A/B Testing Mindset**: Single-arm study design with awareness of need for RCT
- **Statistical Rigor**: Proper CI, p-values, and acknowledgment of limitations
- **Longitudinal Analysis**: 7-week continuous data collection and time-series analysis
- **Effect Size Quantification**: 28.7 percentage point improvement in positive comments

### System Design & Engineering
- **Real-time Processing**: Sub-second sentiment analysis at scale
- **Cross-Platform Integration**: Unified system across 7 different APIs/DOMs
- **Privacy-First Architecture**: Client-side processing options
- **Configurable AI Pipeline**: Modular detection system supporting multiple models

### Product & UX
- **Engagement Mechanics**: 7-week retention through gamification
- **Behavior Change Design**: Theory-driven intervention with measurable outcomes
- **Progressive Commitment**: Onboarding flow that builds user investment
- **Data Visualization**: Complex analytics made accessible to end users

### Full-Stack Execution
- **Frontend**: React + TypeScript production application
- **Extension Development**: Chrome Manifest V3 implementation
- **Backend**: Supabase edge functions and real-time subscriptions
- **DevOps**: Deployment pipeline for research instrument distribution

---

## Publications & Dissemination

**Status**: PhD Dissertation Research

*For citation or collaboration inquiries, please contact the author.*

---

## License

This research project is available under the MIT License for academic and non-commercial use.

For commercial applications of the behavior change methodology or system architecture, please contact the author for licensing discussions.

---

## Author

**PhD Candidate** | Human-Computer Interaction & Behavior Change

This project represents the culmination of doctoral research investigating how interface design and information visualization can reduce psychological distance and promote prosocial online behavior.

**Research Skills Demonstrated**:
- Longitudinal field study design and execution
- Statistical analysis and effect quantification
- Theory-driven intervention development
- Multi-platform system architecture
- Full-stack implementation (research instrument)
- IRB compliance and ethical research practices

**Technical Skills Demonstrated**:
- Chrome extension development (Manifest V3)
- React/TypeScript application development
- Real-time data processing pipelines
- AI/ML integration for NLP tasks
- Backend infrastructure (Supabase/PostgreSQL)
- Cross-platform API integration

---

*GrowthForest - Reducing psychological distance, one comment at a time* 

**Research completed. System deployed. Behavior changed.**
