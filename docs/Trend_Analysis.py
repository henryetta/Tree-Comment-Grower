import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Load data
df = pd.read_csv('comments_rows.csv')

# Set style 
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")
DPI = 600

# === PREPARE DATA ===
sentiment_by_week = df.groupby(['week_number', 'sentiment']).size().unstack(fill_value=0).sort_index()
sentiment_pct = sentiment_by_week.div(sentiment_by_week.sum(axis=1), axis=0) * 100
weekly_drops = df.groupby('week_number').agg({
    'water_drops': 'sum',
    'poison_drops': 'sum'
}).sort_index()
weekly_drops['total_drops'] = weekly_drops['water_drops'] + weekly_drops['poison_drops']
weekly_drops['water_pct'] = (weekly_drops['water_drops'] / weekly_drops['total_drops'] * 100).fillna(0)
weekly_drops['poison_pct'] = (weekly_drops['poison_drops'] / weekly_drops['total_drops'] * 100).fillna(0)

weeks = sentiment_by_week.index.astype(int)

# === 1. SENTIMENT PERCENTAGE WITH ERROR BARS ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, sentiment_pct['positive'], 
         marker='o', linewidth=4, markersize=10, 
         label='Positive', color='#2E8B57', linestyle='-')

plt.plot(weeks, sentiment_pct['negative'], 
         marker='s', linewidth=4, markersize=10, 
         label='Negative', color='#DC143C', linestyle='-')

plt.plot(weeks, sentiment_pct['neutral'], 
         marker='^', linewidth=4, markersize=10, 
         label='Neutral', color='#4682B4', linestyle='-')

# Add numbers on top of data points
for i, week in enumerate(weeks):
    if i % 2 == 0:  # Every other week to avoid clutter
        plt.annotate(f'{sentiment_pct.loc[week, "positive"]:.1f}%', 
                    xy=(week, sentiment_pct.loc[week, "positive"]), 
                    xytext=(0, 15), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))
        
        plt.annotate(f'{sentiment_pct.loc[week, "negative"]:.1f}%', 
                    xy=(week, sentiment_pct.loc[week, "negative"]), 
                    xytext=(0, 15), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))
        
        plt.annotate(f'{sentiment_pct.loc[week, "neutral"]:.1f}%', 
                    xy=(week, sentiment_pct.loc[week, "neutral"]), 
                    xytext=(0, 15), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))

# Add error bars (95% CI for percentages)
for sentiment, color in [('positive', '#2E8B57'), ('negative', '#DC143C'), ('neutral', '#4682B4')]:
    pct_values = sentiment_pct[sentiment].values
    n = sentiment_by_week.sum(axis=1).values
    p = pct_values / 100
    z = 1.96  # 95% CI
    error = z * np.sqrt(p*(1-p)/n) * 100
    plt.fill_between(weeks, pct_values - error, pct_values + error, 
                    alpha=0.2, color=color, label=f'{sentiment.capitalize()} (95% CI)')

plt.title('Sentiment Trends - Percentage Distribution with 95% Confidence Intervals (NORMALIZED)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Percentage (%)', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('sentiment_percentage_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 2. SENTIMENT RAW COUNTS WITH ERROR BARS  ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, sentiment_by_week['positive'], 
         marker='o', linewidth=4, markersize=10, 
         label='Positive', color='#2E8B57', linestyle='-')

plt.plot(weeks, sentiment_by_week['negative'], 
         marker='s', linewidth=4, markersize=10, 
         label='Negative', color='#DC143C', linestyle='-')

plt.plot(weeks, sentiment_by_week['neutral'], 
         marker='^', linewidth=4, markersize=10, 
         label='Neutral', color='#4682B4', linestyle='-')

# Add numbers on top of data points
for i, week in enumerate(weeks):
    if i % 2 == 0:  # Every other week to avoid clutter
        plt.annotate(f'{sentiment_by_week.loc[week, "positive"]}', 
                    xy=(week, sentiment_by_week.loc[week, "positive"]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))
        
        plt.annotate(f'{sentiment_by_week.loc[week, "negative"]}', 
                    xy=(week, sentiment_by_week.loc[week, "negative"]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))
        
        plt.annotate(f'{sentiment_by_week.loc[week, "neutral"]}', 
                    xy=(week, sentiment_by_week.loc[week, "neutral"]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.8))

# Add error bars for counts (Poisson Standard Error)
for sentiment, color in [('positive', '#2E8B57'), ('negative', '#DC143C'), ('neutral', '#4682B4')]:
    count_values = sentiment_by_week[sentiment].values
    error = np.sqrt(count_values)  # Poisson standard error
    plt.errorbar(weeks, count_values, yerr=error, fmt='none', 
                color=color, alpha=0.5, capsize=3, capthick=1)

plt.title('Sentiment Trends - Absolute Counts with Poisson Standard Error (RAW)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Number of Comments', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('sentiment_counts_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 3. CUMULATIVE GROWTH WITH ANNOTATED VALUES ===
plt.figure(figsize=(20, 10))

# Calculate cumulative values
cumulative_positive = sentiment_by_week['positive'].cumsum()
cumulative_negative = sentiment_by_week['negative'].cumsum()
cumulative_neutral = sentiment_by_week['neutral'].cumsum()

# Create individual cumulative line plots with numbers annotated
plt.plot(weeks, cumulative_positive, 
         marker='o', linewidth=4, markersize=10, 
         label='Cumulative Positive', color='#2E8B57', linestyle='-')

plt.plot(weeks, cumulative_negative, 
         marker='s', linewidth=4, markersize=10, 
         label='Cumulative Negative', color='#DC143C', linestyle='-')

plt.plot(weeks, cumulative_neutral, 
         marker='^', linewidth=4, markersize=10, 
         label='Cumulative Neutral', color='#4682B4', linestyle='-')

# Add numbers on top of cumulative data points
for i, week in enumerate(weeks):
    # Cumulative totals 
    if i % 2 == 0:
        plt.annotate(f'{int(cumulative_positive.iloc[i])}', 
                    xy=(week, cumulative_positive.iloc[i]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightgreen", alpha=0.8))
        
        plt.annotate(f'{int(cumulative_negative.iloc[i])}', 
                    xy=(week, cumulative_negative.iloc[i]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightcoral", alpha=0.8))
        
        plt.annotate(f'{int(cumulative_neutral.iloc[i])}', 
                    xy=(week, cumulative_neutral.iloc[i]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightblue", alpha=0.8))

plt.title('Cumulative Comment Growth Over Time with Annotated Values', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Cumulative Number of Comments', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('cumulative_growth_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 4. WATER DROPS ANALYSIS ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, weekly_drops['water_drops'], 
         marker='o', linewidth=4, markersize=10, 
         label='Water Drops', color='#3498DB', linestyle='-')

# Add numbers on top of data points
for i, week in enumerate(weeks):
    if i % 2 == 0:  # Every other week to avoid clutter
        plt.annotate(f'{weekly_drops.loc[week, "water_drops"]}', 
                    xy=(week, weekly_drops.loc[week, "water_drops"]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightblue", alpha=0.8))

# Add error bars for counts (Poisson Standard Error)
water_error = np.sqrt(weekly_drops['water_drops'].values)
plt.errorbar(weeks, weekly_drops['water_drops'].values, yerr=water_error, 
             fmt='none', color='#3498DB', alpha=0.5, capsize=3,
             label='±√N - Poisson SE')

plt.title('Weekly Water Drops with Poisson Standard Error and Annotated Values', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Number of Water Drops', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('water_drops_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 5. POISON DROPS ANALYSIS ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, weekly_drops['poison_drops'], 
         marker='s', linewidth=4, markersize=10, 
         label='Poison Drops', color='#E74C3C', linestyle='-')

# Add numbers on top of data points
for i, week in enumerate(weeks):
    if i % 2 == 0:  # Every other week to avoid clutter
        plt.annotate(f'{weekly_drops.loc[week, "poison_drops"]}', 
                    xy=(week, weekly_drops.loc[week, "poison_drops"]), 
                    xytext=(0, 20), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightcoral", alpha=0.8))

# Add error bars for counts (Poisson Standard Error)
poison_error = np.sqrt(weekly_drops['poison_drops'].values)
plt.errorbar(weeks, weekly_drops['poison_drops'].values, yerr=poison_error, 
             fmt='none', color='#E74C3C', alpha=0.5, capsize=3,
             label='±√N - Poisson SE')

plt.title('Weekly Poison Drops with Poisson Standard Error and Annotated Values', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Number of Poison Drops', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('poison_drops_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 6. WATER/POISON PERCENTAGE COMPARISON  ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, weekly_drops['water_pct'], 
         marker='o', linewidth=4, markersize=10, 
         label='Water %', color='#3498DB', linestyle='-')

plt.plot(weeks, weekly_drops['poison_pct'], 
         marker='s', linewidth=4, markersize=10, 
         label='Poison %', color='#E74C3C', linestyle='-')

# Add numbers on top of percentage points
for i, week in enumerate(weeks):
    if i % 2 == 0:  # Every other week to avoid clutter
        plt.annotate(f'{weekly_drops.loc[week, "water_pct"]:.1f}%', 
                    xy=(week, weekly_drops.loc[week, "water_pct"]), 
                    xytext=(0, 15), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightblue", alpha=0.8))
        
        plt.annotate(f'{weekly_drops.loc[week, "poison_pct"]:.1f}%', 
                    xy=(week, weekly_drops.loc[week, "poison_pct"]), 
                    xytext=(0, 15), textcoords='offset points',
                    fontsize=11, ha='center', fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="lightcoral", alpha=0.8))

# Add error bars for percentages (95% CI for proportions)
water_pct_error = 1.96 * np.sqrt(weekly_drops['water_drops']) / weekly_drops['total_drops'] * 100
poison_pct_error = 1.96 * np.sqrt(weekly_drops['poison_drops']) / weekly_drops['total_drops'] * 100
plt.errorbar(weeks, weekly_drops['water_pct'].values, yerr=water_pct_error, 
             fmt='none', color='#3498DB', alpha=0.5, capsize=3,
             label='Water (95% CI)')
plt.errorbar(weeks, weekly_drops['poison_pct'].values, yerr=poison_pct_error, 
             fmt='none', color='#E74C3C', alpha=0.5, capsize=3,
             label='Poison (95% CI)')

plt.title('Weekly Drop Distribution - Percentage with 95% Confidence Intervals (NORMALIZED)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Percentage (%)', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('water_poison_percentage_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 7. WEEK-BY-WEEK SENTIMENT INTENSITY HEATMAP===
plt.figure(figsize=(20, 10))

# Create heatmap data
heatmap_data = sentiment_pct.T  # Transpose so sentiments are rows, weeks are columns

# Create the heatmap
sns.heatmap(heatmap_data, 
            annot=True, 
            fmt='.1f', 
            cmap='RdYlGn', 
            cbar_kws={'label': 'Percentage (%)', 'shrink': 0.8}, 
            linewidths=0.5, 
            square=False,
            xticklabels=weeks, 
            yticklabels=['Positive', 'Negative', 'Neutral'],
            vmin=0, 
            vmax=100)

plt.title('Week-by-Week Sentiment Intensity Heatmap (NORMALIZED)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Sentiment Type', fontsize=16, fontweight='bold')
plt.xticks(rotation=45, fontsize=14)
plt.yticks(rotation=0, fontsize=14)

plt.tight_layout()
plt.savefig('sentiment_heatmap_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === 8. CUMULATIVE SENTIMENT HEATMAP===
plt.figure(figsize=(20, 10))

# Cumulative heatmap data
cumulative_sentiment = sentiment_by_week.cumsum()
cumulative_pct = cumulative_sentiment.div(cumulative_sentiment.iloc[-1], axis=1) * 100

sns.heatmap(cumulative_pct.T, 
            annot=True, 
            fmt='.1f', 
            cmap='RdYlGn', 
            cbar_kws={'label': 'Cumulative Percentage (%)', 'shrink': 0.8}, 
            linewidths=0.5, 
            square=False,
            xticklabels=weeks, 
            yticklabels=['Positive', 'Negative', 'Neutral'],
            vmin=0, 
            vmax=100)

plt.title('Cumulative Sentiment Distribution Heatmap (NORMALIZED)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Sentiment Type', fontsize=16, fontweight='bold')
plt.xticks(rotation=45, fontsize=14)
plt.yticks(rotation=0, fontsize=14)

plt.tight_layout()
plt.savefig('cumulative_sentiment_heatmap_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === SUMMARY STATISTICS WITH ERROR BARS ===
print("\n" + "="*80)
print("COMPREHENSIVE ANALYSIS WITH ERROR BARS AND ANNOTATED VALUES")
print("="*80)

print(f"\n📊 DATASET OVERVIEW:")
print(f"   Total Comments: {len(df):,}")
print(f"   Weeks Analyzed: {df['week_number'].nunique()}")
print(f"   Date Range: Week {df['week_number'].min()} to Week {df['week_number'].max()}")

print(f"\n💬 SENTIMENT DISTRIBUTION:")
total_sentiment = df['sentiment'].value_counts()
for sentiment, count in total_sentiment.items():
    pct = count / len(df) * 100
    error = np.sqrt(count) / len(df) * 100  # Poisson error for percentage
    print(f"   {sentiment.capitalize()}: {count:,} ({pct:.1f}% ± {error:.1f}%)")

print(f"\n💧 WATER vs POISON DROPS:")
total_water = df['water_drops'].sum()
total_poison = df['poison_drops'].sum()
water_error = np.sqrt(total_water)
poison_error = np.sqrt(total_poison)
print(f"   Total Water Drops: {total_water:,} ± {water_error:.0f}")
print(f"   Total Poison Drops: {total_poison:,} ± {poison_error:.0f}")
print(f"   Overall Ratio: {total_water/total_poison:.2f}:1")

print(f"\n📈 KEY INSIGHTS:")
# Find peak weeks
peak_positive = sentiment_by_week['positive'].idxmax()
peak_negative = sentiment_by_week['negative'].idxmax()
peak_water = weekly_drops['water_drops'].idxmax()
peak_poison = weekly_drops['poison_drops'].idxmax()

print(f"   Most Positive Week: Week {peak_positive} ({sentiment_by_week.loc[peak_positive, 'positive']} comments)")
print(f"   Most Negative Week: Week {peak_negative} ({sentiment_by_week.loc[peak_negative, 'negative']} comments)")
print(f"   Most Water Drops: Week {peak_water} ({weekly_drops.loc[peak_water, 'water_drops']} drops)")
print(f"   Most Poison Drops: Week {peak_poison} ({weekly_drops.loc[peak_poison, 'poison_drops']} drops)")

print("\n" + "="*80)
