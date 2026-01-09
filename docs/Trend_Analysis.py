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

# === SENTIMENT PERCENTAGE WITH ERROR BARS ===
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

# ===  SENTIMENT RAW COUNTS WITH ERROR BARS  ===
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

# === CUMULATIVE GROWTH WITH ANNOTATED VALUES ===
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



# ===  WEEK-BY-WEEK SENTIMENT INTENSITY HEATMAP===
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

# === CUMULATIVE SENTIMENT HEATMAP===
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

# === WATER AND POISON DATA TREND===
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

# ===  WATER vs POISON ACTUAL COUNTS ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, weekly_drops['water_drops'], 
         marker='o', linewidth=4, markersize=10, 
         label='Water Drops', color='#3498DB', linestyle='-')

plt.plot(weeks, weekly_drops['poison_drops'], 
         marker='s', linewidth=4, markersize=10, 
         label='Poison Drops', color='#E74C3C', linestyle='-')

# Add numbers on top for every week
for week in weeks:
    plt.annotate(f'{weekly_drops.loc[week, "water_drops"]}', 
                xy=(week, weekly_drops.loc[week, "water_drops"]), 
                xytext=(0, 20), textcoords='offset points',
                fontsize=10, ha='center', fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor="lightblue", alpha=0.8))
    
    plt.annotate(f'{weekly_drops.loc[week, "poison_drops"]}', 
                xy=(week, weekly_drops.loc[week, "poison_drops"]), 
                xytext=(0, 20), textcoords='offset points',
                fontsize=10, ha='center', fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor="lightcoral", alpha=0.8))

# Add error bars for counts (Poisson Standard Error)
water_error = np.sqrt(weekly_drops['water_drops'].values)
poison_error = np.sqrt(weekly_drops['poison_drops'].values)
plt.errorbar(weeks, weekly_drops['water_drops'].values, yerr=water_error, 
             fmt='none', color='#3498DB', alpha=0.5, capsize=3,
             label='Water (±√N - Poisson SE)')
plt.errorbar(weeks, weekly_drops['poison_drops'].values, yerr=poison_error, 
             fmt='none', color='#E74C3C', alpha=0.5, capsize=3,
             label='Poison (±√N - Poisson SE)')

plt.title('Weekly Water vs Poison Drops - Raw Counts with Poisson Standard Error (ACTUAL COUNTS)', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Number of Drops', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('water_poison_actual_counts_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === WATER vs POISON PERCENTAGE DISTRIBUTION  ===
plt.figure(figsize=(20, 10))

plt.plot(weeks, weekly_drops['water_pct'], 
         marker='o', linewidth=4, markersize=10, 
         label='Water %', color='#3498DB', linestyle='-')

plt.plot(weeks, weekly_drops['poison_pct'], 
         marker='s', linewidth=4, markersize=10, 
         label='Poison %', color='#E74C3C', linestyle='-')

# Add numbers on top for every week
for week in weeks:
    plt.annotate(f'{weekly_drops.loc[week, "water_pct"]:.1f}%', 
                xy=(week, weekly_drops.loc[week, "water_pct"]), 
                xytext=(0, 15), textcoords='offset points',
                fontsize=10, ha='center', fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor="lightblue", alpha=0.8))
    
    plt.annotate(f'{weekly_drops.loc[week, "poison_pct"]:.1f}%', 
                xy=(week, weekly_drops.loc[week, "poison_pct"]), 
                xytext=(0, 15), textcoords='offset points',
                fontsize=10, ha='center', fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor="lightcoral", alpha=0.8))

# Add error bars for percentages (95% CI)
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
plt.ylim(0, 100)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='upper left', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('water_poison_percentage_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === WATER-TO-POISON RATIO  ===
plt.figure(figsize=(20, 10))

ratio = weekly_drops['water_drops'] / (weekly_drops['poison_drops'] + 1e-10)  # Avoid division by zero
plt.plot(weeks, ratio, 
         marker='o', linewidth=4, markersize=10, 
         label='Water:Poison Ratio', color='#8A2BE2', linestyle='-')

# Add horizontal reference line at ratio = 1 (equal amounts)
plt.axhline(y=1, color='gray', linestyle='--', alpha=0.7, linewidth=2, 
            label='Equal Ratio (1:1)')
plt.text(weeks[len(weeks)//2], 1.1, 'Equal Ratio (1:1)', 
         ha='center', va='bottom', fontsize=12, style='italic')

# Add numbers on ratio points for every week
for week in weeks:
    plt.annotate(f'{ratio.loc[week]:.2f}:1', 
                xy=(week, ratio.loc[week]), 
                xytext=(0, 20), textcoords='offset points',
                fontsize=10, ha='center', fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor="lavender", alpha=0.8))

plt.title('Weekly Water-to-Poison Drop Ratio with Annotated Values', 
          fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Water:Poison Ratio', fontsize=16, fontweight='bold')
plt.xticks(weeks, fontsize=14)
plt.yticks(fontsize=14)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
legend = plt.legend(loc='best', fontsize=14, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')
plt.margins(x=0.02)

plt.tight_layout()
plt.savefig('water_poison_ratio_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()

# === HEATMAPS ===

# Combined water/poison heatmap
plt.figure(figsize=(20, 10))
combined_heatmap_data = weekly_drops[['water_drops', 'poison_drops']].T
sns.heatmap(combined_heatmap_data, annot=True, fmt='d', cmap='RdYlBu_r', 
            cbar_kws={'label': 'Number of Drops', 'shrink': 0.8}, 
            linewidths=0.5, square=True, 
            xticklabels=weeks, yticklabels=['Water Drops', 'Poison Drops'])
plt.title('Weekly Water vs Poison Drops Activity Heatmap', fontsize=20, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=16, fontweight='bold')
plt.ylabel('Drop Type', fontsize=16, fontweight='bold')
plt.xticks(rotation=45, fontsize=14)
plt.yticks(rotation=0, fontsize=14)
plt.tight_layout()
plt.savefig('water_poison_combined_heatmap_individual.png', dpi=DPI, bbox_inches='tight')
plt.show()


# Create a summary table
print("\n" + "="*80)
print("SENTIMENT TREND ANALYSIS SUMMARY")
print("="*80)

# Calculate some key statistics
total_comments = len(df)
weeks_covered = df['week_number'].nunique()
avg_comments_per_week = total_comments / weeks_covered
# Calculate percentages
sentiment_by_week_pct = sentiment_by_week.div(sentiment_by_week.sum(axis=1), axis=0) * 100


print(f"\nDataset Overview:")
print(f"  • Total Comments Analyzed: {total_comments:,}")
print(f"  • Weeks Covered: {weeks_covered} (Weeks {df['week_number'].min()} to {df['week_number'].max()})")
print(f"  • Average Comments per Week: {avg_comments_per_week:.0f}")

print(f"\nOverall Sentiment Distribution:")
overall_sentiment = df['sentiment'].value_counts(normalize=True) * 100
for sentiment, percentage in overall_sentiment.items():
    count = df['sentiment'].value_counts()[sentiment]
    print(f"  • {sentiment.capitalize()}: {count:,} comments ({percentage:.1f}%)")

# Find peak weeks for each sentiment
print(f"\nPeak Weeks:")
peak_positive_week = sentiment_by_week['positive'].idxmax()
peak_negative_week = sentiment_by_week['negative'].idxmax()
peak_neutral_week = sentiment_by_week['neutral'].idxmax()

print(f"  • Most Positive Week: Week {peak_positive_week} ({sentiment_by_week.loc[peak_positive_week, 'positive']} comments)")
print(f"  • Most Negative Week: Week {peak_negative_week} ({sentiment_by_week.loc[peak_negative_week, 'negative']} comments)")
print(f"  • Most Neutral Week: Week {peak_neutral_week} ({sentiment_by_week.loc[peak_neutral_week, 'neutral']} comments)")

# Calculate trend direction
print(f"\nTrend Analysis:")
recent_weeks = sentiment_by_week_pct.tail(3)
early_weeks = sentiment_by_week_pct.head(3)

recent_avg_pos = recent_weeks['positive'].mean()
early_avg_pos = early_weeks['positive'].mean()
pos_trend = "↗️ Increasing" if recent_avg_pos > early_avg_pos else "↘️ Decreasing" if recent_avg_pos < early_avg_pos else "→ Stable"

recent_avg_neg = recent_weeks['negative'].mean()
early_avg_neg = early_weeks['negative'].mean()
neg_trend = "↗️ Increasing" if recent_avg_neg > early_avg_neg else "↘️ Decreasing" if recent_avg_neg < early_avg_neg else "→ Stable"

print(f"  • Positive Sentiment Trend: {pos_trend} ({early_avg_pos:.1f}% → {recent_avg_pos:.1f}%)")
print(f"  • Negative Sentiment Trend: {neg_trend} ({early_avg_neg:.1f}% → {recent_avg_neg:.1f}%)")

print("\n" + "="*80)
