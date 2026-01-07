import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Read the CSV file
df = pd.read_csv('comments_rows.csv')

# Group by week_number and sentiment to get counts
sentiment_by_week = df.groupby(['week_number', 'sentiment']).size().unstack(fill_value=0)

# Sort by week number to ensure proper order
sentiment_by_week = sentiment_by_week.sort_index()

# Create a professional-looking plot similar to your example
plt.figure(figsize=(16, 10))

# Set style for a clean, professional look
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")

# Create the main trend plot
ax = plt.subplot(2, 1, 1)

# Plot each sentiment with clean lines and markers
weeks = sentiment_by_week.index.astype(int)  # Convert to int to remove decimals

plt.plot(weeks, sentiment_by_week['positive'], 
         marker='o', linewidth=3, markersize=8, 
         label='Positive', color='#2E8B57', linestyle='-')

plt.plot(weeks, sentiment_by_week['negative'], 
         marker='s', linewidth=3, markersize=8, 
         label='Negative', color='#DC143C', linestyle='-')

plt.plot(weeks, sentiment_by_week['neutral'], 
         marker='^', linewidth=3, markersize=8, 
         label='Neutral', color='#4682B4', linestyle='-')

# Customize the plot appearance
plt.title('Sentiment Trends Across Weeks - Absolute Counts', 
          fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=14, fontweight='bold')
plt.ylabel('Number of Comments', fontsize=14, fontweight='bold')

# Customize x-axis
plt.xticks(weeks, fontsize=12)
plt.xlim(weeks.min() - 0.5, weeks.max() + 0.5)

# Customize y-axis
plt.yticks(fontsize=12)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)

# Customize legend
legend = plt.legend(loc='upper left', fontsize=12, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')

# Add some spacing around the plot
plt.margins(x=0.02)

# Create percentage-based plot below
plt.subplot(2, 1, 2)

# Calculate percentages
sentiment_by_week_pct = sentiment_by_week.div(sentiment_by_week.sum(axis=1), axis=0) * 100

plt.plot(weeks, sentiment_by_week_pct['positive'], 
         marker='o', linewidth=3, markersize=8, 
         label='Positive', color='#2E8B57', linestyle='-')

plt.plot(weeks, sentiment_by_week_pct['negative'], 
         marker='s', linewidth=3, markersize=8, 
         label='Negative', color='#DC143C', linestyle='-')

plt.plot(weeks, sentiment_by_week_pct['neutral'], 
         marker='^', linewidth=3, markersize=8, 
         label='Neutral', color='#4682B4', linestyle='-')

# Customize the percentage plot
plt.title('Sentiment Trends Across Weeks - Percentage Distribution', 
          fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=14, fontweight='bold')
plt.ylabel('Percentage (%)', fontsize=14, fontweight='bold')

# Customize x-axis
plt.xticks(weeks, fontsize=12)
plt.xlim(weeks.min() - 0.5, weeks.max() + 0.5)

# Customize y-axis
plt.yticks(fontsize=12)
plt.ylim(0, 100)
plt.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)

# Customize legend
legend = plt.legend(loc='upper left', fontsize=12, frameon=True, 
                   fancybox=True, shadow=True)
legend.get_frame().set_facecolor('white')

# Add some spacing around the plot
plt.margins(x=0.02)

# Adjust layout to prevent overlap
plt.tight_layout(pad=3.0)

# Add some additional spacing between subplots
plt.subplots_adjust(hspace=0.3)

plt.show()

# Create a cleaner summary table
print("\n" + "="*80)
print("SENTIMENT TREND ANALYSIS SUMMARY")
print("="*80)

# Calculate some key statistics
total_comments = len(df)
weeks_covered = df['week_number'].nunique()
avg_comments_per_week = total_comments / weeks_covered

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


# Group by week_number and sentiment to get counts
sentiment_by_week = df.groupby(['week_number', 'sentiment']).size().unstack(fill_value=0)

# Sort by week number to ensure proper order
sentiment_by_week = sentiment_by_week.sort_index()

# Calculate percentages for stacked visualization
sentiment_by_week_pct = sentiment_by_week.div(sentiment_by_week.sum(axis=1), axis=0) * 100

# Create a comprehensive week-by-week comparison
fig, axes = plt.subplots(2, 2, figsize=(18, 12))

# Set professional style
plt.style.use('seaborn-v0_8-whitegrid')
colors = ['#2E8B57', '#DC143C', '#4682B4']  # Green, Red, Blue

# 1. Grouped Bar Chart - Absolute Counts
ax1 = axes[0, 0]
weeks = sentiment_by_week.index.astype(int)
x = np.arange(len(weeks))
width = 0.25

bars1 = ax1.bar(x - width, sentiment_by_week['positive'], width, 
                label='Positive', color=colors[0], alpha=0.8, edgecolor='black', linewidth=0.5)
bars2 = ax1.bar(x, sentiment_by_week['negative'], width, 
                label='Negative', color=colors[1], alpha=0.8, edgecolor='black', linewidth=0.5)
bars3 = ax1.bar(x + width, sentiment_by_week['neutral'], width, 
                label='Neutral', color=colors[2], alpha=0.8, edgecolor='black', linewidth=0.5)

ax1.set_title('Week-by-Week Sentiment Comparison\n(Absolute Counts)', fontsize=14, fontweight='bold')
ax1.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax1.set_ylabel('Number of Comments', fontsize=12, fontweight='bold')
ax1.set_xticks(x)
ax1.set_xticklabels(weeks, rotation=45)
ax1.legend(frameon=True, fancybox=True, shadow=True)
ax1.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)

# Add value labels on bars
for bars in [bars1, bars2, bars3]:
    for bar in bars:
        height = bar.get_height()
        if height > 0:  # Only show labels for non-zero bars
            ax1.annotate(f'{int(height)}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8, fontweight='bold')

# 2. Stacked Bar Chart - Percentage Distribution
ax2 = axes[0, 1]
bars1 = ax2.bar(x, sentiment_by_week_pct['positive'], 
                label='Positive', color=colors[0], alpha=0.8, edgecolor='white', linewidth=0.5)
bars2 = ax2.bar(x, sentiment_by_week_pct['negative'], 
                bottom=sentiment_by_week_pct['positive'],
                label='Negative', color=colors[1], alpha=0.8, edgecolor='white', linewidth=0.5)
bars3 = ax2.bar(x, sentiment_by_week_pct['neutral'], 
                bottom=sentiment_by_week_pct['positive'] + sentiment_by_week_pct['negative'],
                label='Neutral', color=colors[2], alpha=0.8, edgecolor='white', linewidth=0.5)

ax2.set_title('Week-by-Week Sentiment Distribution\n(Percentage)', fontsize=14, fontweight='bold')
ax2.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax2.set_ylabel('Percentage (%)', fontsize=12, fontweight='bold')
ax2.set_xticks(x)
ax2.set_xticklabels(weeks, rotation=45)
ax2.legend(frameon=True, fancybox=True, shadow=True)
ax2.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
ax2.set_ylim(0, 100)

# 3. Horizontal Stacked Bar Chart
ax3 = axes[1, 0]
y_pos = np.arange(len(weeks))

bars1 = ax3.barh(y_pos, sentiment_by_week_pct['positive'], 
                 label='Positive', color=colors[0], alpha=0.8, edgecolor='white', linewidth=0.5)
bars2 = ax3.barh(y_pos, sentiment_by_week_pct['negative'], 
                 left=sentiment_by_week_pct['positive'],
                 label='Negative', color=colors[1], alpha=0.8, edgecolor='white', linewidth=0.5)
bars3 = ax3.barh(y_pos, sentiment_by_week_pct['neutral'], 
                 left=sentiment_by_week_pct['positive'] + sentiment_by_week_pct['negative'],
                 label='Neutral', color=colors[2], alpha=0.8, edgecolor='white', linewidth=0.5)

ax3.set_title('Weekly Sentiment Breakdown\n(Horizontal View)', fontsize=14, fontweight='bold')
ax3.set_xlabel('Percentage (%)', fontsize=12, fontweight='bold')
ax3.set_ylabel('Week Number', fontsize=12, fontweight='bold')
ax3.set_yticks(y_pos)
ax3.set_yticklabels(weeks)
ax3.legend(frameon=True, fancybox=True, shadow=True)
ax3.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
ax3.set_xlim(0, 100)

# 4. Heatmap of Sentiment Intensity
ax4 = axes[1, 1]
# Create a matrix for the heatmap
heatmap_data = sentiment_by_week_pct.T

sns.heatmap(heatmap_data, annot=True, fmt='.1f', cmap='RdYlGn', 
            cbar_kws={'label': 'Percentage (%)'}, ax=ax4,
            linewidths=0.5, square=True)

ax4.set_title('Sentiment Intensity Heatmap\n(Week-by-Week)', fontsize=14, fontweight='bold')
ax4.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax4.set_ylabel('Sentiment', fontsize=12, fontweight='bold')
ax4.set_xticklabels(weeks, rotation=45)

plt.tight_layout(pad=3.0)
plt.subplots_adjust(hspace=0.3, wspace=0.3)
plt.savefig('wekk_by_week_trends.png', dpi=300, bbox_inches='tight')
plt.show()

# Create a detailed week-by-week summary table
print("\n" + "="*100)
print("WEEK-BY-WEEK SENTIMENT COMPARISON ANALYSIS")
print("="*100)

# Create a detailed comparison table
comparison_df = pd.DataFrame({
    'Week': weeks,
    'Total_Comments': sentiment_by_week.sum(axis=1).values,
    'Positive_Count': sentiment_by_week['positive'].values,
    'Negative_Count': sentiment_by_week['negative'].values,
    'Neutral_Count': sentiment_by_week['neutral'].values,
    'Positive_%': sentiment_by_week_pct['positive'].round(1).values,
    'Negative_%': sentiment_by_week_pct['negative'].round(1).values,
    'Neutral_%': sentiment_by_week_pct['neutral'].round(1).values
})

# Add week-over-week changes
comparison_df['Total_Change'] = comparison_df['Total_Comments'].diff()
comparison_df['Positive_Change'] = comparison_df['Positive_%'].diff()
comparison_df['Negative_Change'] = comparison_df['Negative_%'].diff()
comparison_df['Neutral_Change'] = comparison_df['Neutral_%'].diff()

print("\nDetailed Week-by-Week Breakdown:")
print("-" * 100)
for _, row in comparison_df.iterrows():
    week = int(row['Week'])
    total = int(row['Total_Comments'])
    pos_pct = row['Positive_%']
    neg_pct = row['Negative_%']
    neu_pct = row['Neutral_%']
    
    print(f"Week {week:2d}: {total:4d} comments | "
          f"Positive: {pos_pct:5.1f}% | "
          f"Negative: {neg_pct:5.1f}% | "
          f"Neutral: {neu_pct:5.1f}%")

print("\nWeek-over-Week Changes:")
print("-" * 100)
for i, row in comparison_df.iterrows():
    if i == 0:
        continue  # Skip first row (no previous week)
    
    week = int(row['Week'])
    total_change = int(row['Total_Change'])
    pos_change = row['Positive_Change']
    neg_change = row['Negative_Change']
    neu_change = row['Neutral_Change']
    
    total_arrow = "↗" if total_change > 0 else "↘" if total_change < 0 else "→"
    pos_arrow = "↗" if pos_change > 0 else "↘" if pos_change < 0 else "→"
    neg_arrow = "↗" if neg_change > 0 else "↘" if neg_change < 0 else "→"
    neu_arrow = "↗" if neu_change > 0 else "↘" if neu_change < 0 else "→"
    
    print(f"Week {week:2d}: Total {total_arrow} {total_change:+3d} | "
          f"Positive {pos_arrow} {pos_change:+5.1f}% | "
          f"Negative {neg_arrow} {neg_change:+5.1f}% | "
          f"Neutral {neu_arrow} {neu_change:+5.1f}%")

# Identify best and worst weeks
print("\nKey Insights:")
print("-" * 50)
best_positive_week = comparison_df.loc[comparison_df['Positive_%'].idxmax()]
worst_positive_week = comparison_df.loc[comparison_df['Positive_%'].idxmin()]
most_negative_week = comparison_df.loc[comparison_df['Negative_%'].idxmax()]

print(f"Most Positive Week: Week {int(best_positive_week['Week'])} "
      f"({best_positive_week['Positive_%']:.1f}% positive)")
print(f"Least Positive Week: Week {int(worst_positive_week['Week'])} "
      f"({worst_positive_week['Positive_%']:.1f}% positive)")
print(f"Most Negative Week: Week {int(most_negative_week['Week'])} "
      f"({most_negative_week['Negative_%']:.1f}% negative)")

print("\n" + "="*100)


# Group by week_number and calculate water drops, poison drops, and ratios
weekly_drops = df.groupby('week_number').agg({
    'water_drops': 'sum',
    'poison_drops': 'sum',
    'id': 'count'  # Total comments per week
}).rename(columns={'id': 'total_comments'})

# Calculate water-to-poison ratio
weekly_drops['water_to_poison_ratio'] = weekly_drops['water_drops'] / (weekly_drops['poison_drops'] + 1e-10)  # Add small value to avoid division by zero
weekly_drops['poison_to_water_ratio'] = weekly_drops['poison_drops'] / (weekly_drops['water_drops'] + 1e-10)

# Calculate percentages
weekly_drops['water_percentage'] = (weekly_drops['water_drops'] / (weekly_drops['water_drops'] + weekly_drops['poison_drops'])) * 100
weekly_drops['poison_percentage'] = (weekly_drops['poison_drops'] / (weekly_drops['water_drops'] + weekly_drops['poison_drops'])) * 100

# Sort by week number
weekly_drops = weekly_drops.sort_index()

# Create comprehensive visualization
fig, axes = plt.subplots(2, 2, figsize=(18, 12))

# Set professional style
plt.style.use('seaborn-v0_8-whitegrid')
colors = ['#3498DB', '#E74C3C', '#2ECC71']  # Blue, Red, Green

# 1. Water vs Poison Drops - Grouped Bar Chart
ax1 = axes[0, 0]
weeks = weekly_drops.index.astype(int)
x = np.arange(len(weeks))
width = 0.35

bars1 = ax1.bar(x - width/2, weekly_drops['water_drops'], width, 
                label='Water Drops', color=colors[0], alpha=0.8, 
                edgecolor='black', linewidth=0.5)
bars2 = ax1.bar(x + width/2, weekly_drops['poison_drops'], width, 
                label='Poison Drops', color=colors[1], alpha=0.8, 
                edgecolor='black', linewidth=0.5)

ax1.set_title('Weekly Water vs Poison Drops Comparison', fontsize=14, fontweight='bold')
ax1.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax1.set_ylabel('Number of Drops', fontsize=12, fontweight='bold')
ax1.set_xticks(x)
ax1.set_xticklabels(weeks, rotation=45)
ax1.legend(frameon=True, fancybox=True, shadow=True)
ax1.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)

# Add value labels on bars
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax1.annotate(f'{int(height)}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=9, fontweight='bold')

# 2. Water-to-Poison Ratio Line Chart
ax2 = axes[0, 1]
ax2.plot(weeks, weekly_drops['water_to_poison_ratio'], 
         marker='o', linewidth=3, markersize=8, 
         label='Water:Poison Ratio', color=colors[2], linestyle='-')

ax2.set_title('Weekly Water-to-Poison Drop Ratio', fontsize=14, fontweight='bold')
ax2.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax2.set_ylabel('Ratio (Water/Poison)', fontsize=12, fontweight='bold')
ax2.set_xticks(weeks)
ax2.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
ax2.legend(frameon=True, fancybox=True, shadow=True)

# Add horizontal line at ratio = 1 (equal water and poison)
ax2.axhline(y=1, color='gray', linestyle='--', alpha=0.7, linewidth=2)
ax2.text(weeks[len(weeks)//2], 1.1, 'Equal Ratio (1:1)', 
         ha='center', va='bottom', fontsize=10, style='italic')

# 3. Stacked Percentage Chart
ax3 = axes[1, 0]
bars1 = ax3.bar(x, weekly_drops['water_percentage'], 
                label='Water Drops %', color=colors[0], alpha=0.8, 
                edgecolor='white', linewidth=0.5)
bars2 = ax3.bar(x, weekly_drops['poison_percentage'], 
                bottom=weekly_drops['water_percentage'],
                label='Poison Drops %', color=colors[1], alpha=0.8, 
                edgecolor='white', linewidth=0.5)

ax3.set_title('Weekly Drop Distribution (Percentage)', fontsize=14, fontweight='bold')
ax3.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax3.set_ylabel('Percentage (%)', fontsize=12, fontweight='bold')
ax3.set_xticks(x)
ax3.set_xticklabels(weeks, rotation=45)
ax3.legend(frameon=True, fancybox=True, shadow=True)
ax3.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
ax3.set_ylim(0, 100)

# 4. Heatmap of Drop Activity
ax4 = axes[1, 1]
# Create heatmap data with both water and poison drops
heatmap_data = weekly_drops[['water_drops', 'poison_drops']].T

sns.heatmap(heatmap_data, annot=True, fmt='d', cmap='RdYlBu_r', 
            cbar_kws={'label': 'Number of Drops'}, ax=ax4,
            linewidths=0.5, square=True, 
            xticklabels=weeks, yticklabels=['Water Drops', 'Poison Drops'])

ax4.set_title('Weekly Drop Activity Heatmap', fontsize=14, fontweight='bold')
ax4.set_xlabel('Week Number', fontsize=12, fontweight='bold')
ax4.set_ylabel('Drop Type', fontsize=12, fontweight='bold')

plt.tight_layout(pad=3.0)
plt.subplots_adjust(hspace=0.3, wspace=0.3)
plt.savefig('water_weekly_trends.png', dpi=300, bbox_inches='tight')
plt.show()

# Create detailed analysis table
print("\n" + "="*120)
print("WEEKLY WATER & POISON DROPS ANALYSIS")
print("="*120)

# Create comprehensive comparison table
drops_analysis = pd.DataFrame({
    'Week': weeks,
    'Total_Comments': weekly_drops['total_comments'].values,
    'Water_Drops': weekly_drops['water_drops'].values,
    'Poison_Drops': weekly_drops['poison_drops'].values,
    'Total_Drops': (weekly_drops['water_drops'] + weekly_drops['poison_drops']).values,
    'Water_%': weekly_drops['water_percentage'].round(1).values,
    'Poison_%': weekly_drops['poison_percentage'].round(1).values,
    'W:P_Ratio': weekly_drops['water_to_poison_ratio'].round(2).values,
    'P:W_Ratio': weekly_drops['poison_to_water_ratio'].round(2).values
})

# Add week-over-week changes
drops_analysis['Water_Change'] = drops_analysis['Water_Drops'].diff()
drops_analysis['Poison_Change'] = drops_analysis['Poison_Drops'].diff()
drops_analysis['Ratio_Change'] = drops_analysis['W:P_Ratio'].diff()

print("\nDetailed Weekly Drops Breakdown:")
print("-" * 120)
print(f"{'Week':<4} {'Comments':<8} {'Water':<6} {'Poison':<7} {'Total':<6} {'Water%':<7} {'Poison%':<8} {'W:P Ratio':<10} {'Trend':<8}")
print("-" * 120)

for _, row in drops_analysis.iterrows():
    week = int(row['Week'])
    comments = int(row['Total_Comments'])
    water = int(row['Water_Drops'])
    poison = int(row['Poison_Drops'])
    total_drops = int(row['Total_Drops'])
    water_pct = row['Water_%']
    poison_pct = row['Poison_%']
    ratio = row['W:P_Ratio']
    
    # Determine trend based on ratio
    if ratio > 2:
        trend = "💧 Water"
    elif ratio < 0.5:
        trend = "☠️ Poison"
    elif ratio > 1:
        trend = "💧 Favor"
    elif ratio < 1:
        trend = "☠️ Favor"
    else:
        trend = "⚖️ Equal"
    
    print(f"{week:<4} {comments:<8} {water:<6} {poison:<7} {total_drops:<6} "
          f"{water_pct:<7.1f} {poison_pct:<8.1f} {ratio:<10.2f} {trend:<8}")

# Identify extreme weeks
print("\n" + "="*80)
print("EXTREME WEEKS ANALYSIS")
print("="*80)

# Find weeks with highest/lowest ratios
highest_ratio_week = drops_analysis.loc[drops_analysis['W:P_Ratio'].idxmax()]
lowest_ratio_week = drops_analysis.loc[drops_analysis['W:P_Ratio'].idxmin()]
most_water_week = drops_analysis.loc[drops_analysis['Water_Drops'].idxmax()]
most_poison_week = drops_analysis.loc[drops_analysis['Poison_Drops'].idxmax()]

print(f"\n🏆 Most Water-Favorable Week:")
print(f"   Week {int(highest_ratio_week['Week'])} - Ratio: {highest_ratio_week['W:P_Ratio']:.2f}:1 "
      f"({int(highest_ratio_week['Water_Drops'])} water, {int(highest_ratio_week['Poison_Drops'])} poison)")

print(f"\n⚠️ Most Poison-Favorable Week:")
print(f"   Week {int(lowest_ratio_week['Week'])} - Ratio: {lowest_ratio_week['W:P_Ratio']:.2f}:1 "
      f"({int(lowest_ratio_week['Water_Drops'])} water, {int(lowest_ratio_week['Poison_Drops'])} poison)")

print(f"\n💧 Most Water Drops Week:")
print(f"   Week {int(most_water_week['Week'])} - {int(most_water_week['Water_Drops'])} water drops "
      f"({most_water_week['Water_%']:.1f}% of total drops)")

print(f"\n☠️ Most Poison Drops Week:")
print(f"   Week {int(most_poison_week['Week'])} - {int(most_poison_week['Poison_Drops'])} poison drops "
      f"({most_poison_week['Poison_%']:.1f}% of total drops)")

# Weekly comparison summary
print("\n" + "="*80)
print("WEEK-BY-WEEK COMPARISON SUMMARY")
print("="*80)

print(f"\nOverall Statistics:")
total_water = weekly_drops['water_drops'].sum()
total_poison = weekly_drops['poison_drops'].sum()
overall_ratio = total_water / total_poison if total_poison > 0 else float('inf')

print(f"   • Total Water Drops: {total_water:,}")
print(f"   • Total Poison Drops: {total_poison:,}")
print(f"   • Overall Water:Poison Ratio: {overall_ratio:.2f}:1")
print(f"   • Weeks with more Water than Poison: {(weekly_drops['water_drops'] > weekly_drops['poison_drops']).sum()}/{len(weekly_drops)}")
print(f"   • Weeks with more Poison than Water: {(weekly_drops['poison_drops'] > weekly_drops['water_drops']).sum()}/{len(weekly_drops)}")

# Calculate average drops per week
avg_water = weekly_drops['water_drops'].mean()
avg_poison = weekly_drops['poison_drops'].mean()
avg_ratio = weekly_drops['water_to_poison_ratio'].mean()

print(f"\nWeekly Averages:")
print(f"   • Average Water Drops per Week: {avg_water:.1f}")
print(f"   • Average Poison Drops per Week: {avg_poison:.1f}")
print(f"   • Average Water:Poison Ratio: {avg_ratio:.2f}:1")

print("\n" + "="*120)



