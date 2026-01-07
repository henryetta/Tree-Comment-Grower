import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import linregress
import warnings
warnings.filterwarnings('ignore')

# Load and prepare data
df = pd.read_csv('comments_rows.csv')


# Group by week number only
weekly_trends = df.groupby('week_number').agg({
    'sentiment': lambda x: x.value_counts().to_dict(),
    'water_drops': 'sum',
    'poison_drops': 'sum',
    'id': 'count'
}).reset_index()

# Calculate all sentiment percentages
def extract_sentiment_pct(sentiment_dict, sentiment_type):
    if sentiment_type in sentiment_dict:
        return sentiment_dict[sentiment_type] / sum(sentiment_dict.values()) * 100
    return 0

weekly_trends['positive_pct'] = weekly_trends['sentiment'].apply(lambda x: extract_sentiment_pct(x, 'positive'))
weekly_trends['negative_pct'] = weekly_trends['sentiment'].apply(lambda x: extract_sentiment_pct(x, 'negative'))
weekly_trends['neutral_pct'] = weekly_trends['sentiment'].apply(lambda x: extract_sentiment_pct(x, 'neutral'))
weekly_trends['water_poison_ratio'] = weekly_trends['water_drops'] / (weekly_trends['poison_drops'] + 1)

# Prepare data for linear regression
weeks = weekly_trends['week_number'].values

# Perform linear regression using scipy.stats.linregress for all metrics
regression_results = {}

# 1. Positive sentiment
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['positive_pct'].values)
regression_results['positive'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['positive_pct'].values,
    'predictions': slope * weeks + intercept
}

# 2. Negative sentiment
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['negative_pct'].values)
regression_results['negative'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['negative_pct'].values,
    'predictions': slope * weeks + intercept
}

# 3. Neutral sentiment
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['neutral_pct'].values)
regression_results['neutral'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['neutral_pct'].values,
    'predictions': slope * weeks + intercept
}

# 4. Water drops
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['water_drops'].values)
regression_results['water'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['water_drops'].values,
    'predictions': slope * weeks + intercept
}

# 5. Poison drops
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['poison_drops'].values)
regression_results['poison'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['poison_drops'].values,
    'predictions': slope * weeks + intercept
}

# 6. Water-to-poison ratio
slope, intercept, r_value, p_value, std_err = linregress(weeks, weekly_trends['water_poison_ratio'].values)
regression_results['ratio'] = {
    'slope': slope,
    'intercept': intercept,
    'r_value': r_value,
    'r_squared': r_value**2,
    'p_value': p_value,
    'std_err': std_err,
    'values': weekly_trends['water_poison_ratio'].values,
    'predictions': slope * weeks + intercept
}

# Print complete regression results with p-values from linregress
print("=== COMPLETE LINEAR REGRESSION RESULTS USING SCIPY.STATS.LINREGRESS ===")
for metric, stats in regression_results.items():
    metric_name = metric.capitalize() if metric in ['positive', 'negative', 'neutral'] else \
                  'Water Drops' if metric == 'water' else \
                  'Poison Drops' if metric == 'poison' else \
                  'Water/Poison Ratio'
    
    slope = stats['slope']
    intercept = stats['intercept']
    r2 = stats['r_squared']
    p_value = stats['p_value']
    std_err = stats['std_err']
    
    # Determine significance level
    if p_value < 0.001:
        significance = "Highly Significant***"
        sig_level = "p < 0.001"
    elif p_value < 0.01:
        significance = "Very Significant**"
        sig_level = "p < 0.01"
    elif p_value < 0.05:
        significance = "Significant*"
        sig_level = "p < 0.05"
    elif p_value < 0.1:
        significance = "Marginally Significant†"
        sig_level = "p < 0.1"
    else:
        significance = "Not Significant (ns)"
        sig_level = f"p = {p_value:.4f}"
    
    print(f"\n{metric_name.upper()} TREND:")
    print(f"  Equation: y = {slope:.4f}x + {intercept:.4f}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  Pearson r: {stats['r_value']:.4f}")
    print(f"  P-value: {p_value:.6f} ({significance})")
    print(f"  Standard Error: {std_err:.4f}")
    print(f"  Trend: {'Increasing' if slope > 0 else 'Decreasing'} by {abs(slope):.4f} per week")

# Create comprehensive sentiment trends comparison with p-values
plt.figure(figsize=(14, 8))

# Plot all three sentiment trends with regression lines and p-values
predictions_pos = regression_results['positive']['predictions']
predictions_neg = regression_results['negative']['predictions']
predictions_neutral = regression_results['neutral']['predictions']

plt.scatter(weeks, weekly_trends['positive_pct'], color='green', alpha=0.7, s=50, label='Positive (Actual)')
plt.plot(weeks, predictions_pos, color='darkgreen', linewidth=2, 
         label=f"Positive Trend (R²={regression_results['positive']['r_squared']:.3f}, p={regression_results['positive']['p_value']:.4f})")

plt.scatter(weeks, weekly_trends['negative_pct'], color='red', alpha=0.7, s=50, label='Negative (Actual)')
plt.plot(weeks, predictions_neg, color='darkred', linewidth=2, 
         label=f"Negative Trend (R²={regression_results['negative']['r_squared']:.3f}, p={regression_results['negative']['p_value']:.4f})")

plt.scatter(weeks, weekly_trends['neutral_pct'], color='gray', alpha=0.7, s=50, label='Neutral (Actual)')
plt.plot(weeks, predictions_neutral, color='black', linewidth=2, 
         label=f"Neutral Trend (R²={regression_results['neutral']['r_squared']:.3f}, p={regression_results['neutral']['p_value']:.4f})")

plt.title('Sentiment Trends with Linear Regression Analysis', fontsize=14, fontweight='bold')
plt.xlabel('Week Number')
plt.ylabel('Sentiment Percentage (%)')
plt.legend()
plt.grid(True, alpha=0.3)
plt.xticks(weeks)

plt.tight_layout()
plt.savefig('sentiment_reg_trends.png', dpi=300, bbox_inches='tight')
plt.show()


# Create complete regression analysis visualizations with linregress p-values
fig, ((ax1, ax2, ax3), (ax4, ax5, ax6)) = plt.subplots(2, 3, figsize=(18, 12))

# 1. Positive sentiment with regression line and linregress p-value
p_val_pos = regression_results['positive']['p_value']
r2_pos = regression_results['positive']['r_squared']
ax1.scatter(weeks, weekly_trends['positive_pct'], color='green', alpha=0.7, s=50, label='Actual Data')
ax1.plot(weeks, regression_results['positive']['predictions'], color='darkgreen', linewidth=2, 
         label=f"Regression\nR²={r2_pos:.3f}, p={p_val_pos:.4f}")
ax1.set_title('Positive Sentiment Trend', fontsize=12, fontweight='bold')
ax1.set_xlabel('Week Number')
ax1.set_ylabel('Positive Sentiment (%)')
ax1.legend()
ax1.grid(True, alpha=0.3)

# 2. NEGATIVE sentiment with regression line and linregress p-value
p_val_neg = regression_results['negative']['p_value']
r2_neg = regression_results['negative']['r_squared']
ax2.scatter(weeks, weekly_trends['negative_pct'], color='red', alpha=0.7, s=50, label='Actual Data')
ax2.plot(weeks, regression_results['negative']['predictions'], color='darkred', linewidth=2, 
         label=f"Regression\nR²={r2_neg:.3f}, p={p_val_neg:.4f}")
ax2.set_title('Negative Sentiment Trend', fontsize=12, fontweight='bold')
ax2.set_xlabel('Week Number')
ax2.set_ylabel('Negative Sentiment (%)')
ax2.legend()
ax2.grid(True, alpha=0.3)

# 3. NEUTRAL sentiment with regression line and linregress p-value
p_val_neutral = regression_results['neutral']['p_value']
r2_neutral = regression_results['neutral']['r_squared']
ax3.scatter(weeks, weekly_trends['neutral_pct'], color='gray', alpha=0.7, s=50, label='Actual Data')
ax3.plot(weeks, regression_results['neutral']['predictions'], color='black', linewidth=2, 
         label=f"Regression\nR²={r2_neutral:.3f}, p={p_val_neutral:.4f}")
ax3.set_title('Neutral Sentiment Trend', fontsize=12, fontweight='bold')
ax3.set_xlabel('Week Number')
ax3.set_ylabel('Neutral Sentiment (%)')
ax3.legend()
ax3.grid(True, alpha=0.3)

# 4. Water drops with regression line and linregress p-value
p_val_water = regression_results['water']['p_value']
r2_water = regression_results['water']['r_squared']
ax4.scatter(weeks, weekly_trends['water_drops'], color='blue', alpha=0.7, s=50, label='Actual Data')
ax4.plot(weeks, regression_results['water']['predictions'], color='darkblue', linewidth=2, 
         label=f"Regression\nR²={r2_water:.3f}, p={p_val_water:.4f}")
ax4.set_title('Water Drops Trend', fontsize=12, fontweight='bold')
ax4.set_xlabel('Week Number')
ax4.set_ylabel('Water Drops')
ax4.legend()
ax4.grid(True, alpha=0.3)

# 5. Poison drops with regression line and linregress p-value
p_val_poison = regression_results['poison']['p_value']
r2_poison = regression_results['poison']['r_squared']
ax5.scatter(weeks, weekly_trends['poison_drops'], color='red', alpha=0.7, s=50, label='Actual Data')
ax5.plot(weeks, regression_results['poison']['predictions'], color='darkred', linewidth=2, 
         label=f"Regression\nR²={r2_poison:.3f}, p={p_val_poison:.4f}")
ax5.set_title('Poison Drops Trend', fontsize=12, fontweight='bold')
ax5.set_xlabel('Week Number')
ax5.set_ylabel('Poison Drops')
ax5.legend()
ax5.grid(True, alpha=0.3)

# 6. Water-to-poison ratio with regression line and linregress p-value
p_val_ratio = regression_results['ratio']['p_value']
r2_ratio = regression_results['ratio']['r_squared']
ax6.scatter(weeks, weekly_trends['water_poison_ratio'], color='purple', alpha=0.7, s=50, label='Actual Data')
ax6.plot(weeks, regression_results['ratio']['predictions'], color='indigo', linewidth=2, 
         label=f"Regression\nR²={r2_ratio:.3f}, p={p_val_ratio:.4f}")
ax6.set_title('Water-to-Poison Ratio Trend', fontsize=12, fontweight='bold')
ax6.set_xlabel('Week Number')
ax6.set_ylabel('Water/Poison Ratio')
ax6.legend()
ax6.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('regression_trends.png', dpi=300, bbox_inches='tight')
plt.show()

# Create comprehensive regression summary with linregress results
regression_summary = pd.DataFrame({
    'Metric': ['Positive Sentiment (%)', 'Negative Sentiment (%)', 'Neutral Sentiment (%)', 
               'Water Drops', 'Poison Drops', 'Water/Poison Ratio'],
    'Slope (per week)': [regression_results['positive']['slope'], regression_results['negative']['slope'], 
                        regression_results['neutral']['slope'], regression_results['water']['slope'], 
                        regression_results['poison']['slope'], regression_results['ratio']['slope']],
    'Intercept': [regression_results['positive']['intercept'], regression_results['negative']['intercept'], 
                 regression_results['neutral']['intercept'], regression_results['water']['intercept'], 
                 regression_results['poison']['intercept'], regression_results['ratio']['intercept']],
    'R² Score': [regression_results['positive']['r_squared'], regression_results['negative']['r_squared'], 
                regression_results['neutral']['r_squared'], regression_results['water']['r_squared'], 
                regression_results['poison']['r_squared'], regression_results['ratio']['r_squared']],
    'Pearson r': [regression_results['positive']['r_value'], regression_results['negative']['r_value'], 
                 regression_results['neutral']['r_value'], regression_results['water']['r_value'], 
                 regression_results['poison']['r_value'], regression_results['ratio']['r_value']],
    'P-value': [regression_results['positive']['p_value'], regression_results['negative']['p_value'], 
               regression_results['neutral']['p_value'], regression_results['water']['p_value'], 
               regression_results['poison']['p_value'], regression_results['ratio']['p_value']],
    'Std Error': [regression_results['positive']['std_err'], regression_results['negative']['std_err'], 
                 regression_results['neutral']['std_err'], regression_results['water']['std_err'], 
                 regression_results['poison']['std_err'], regression_results['ratio']['std_err']]
}).round(6)

# Add significance interpretation
regression_summary['Significance'] = regression_summary['P-value'].apply(
    lambda p: "Highly Sig.***" if p < 0.001 else 
              "Very Sig.**" if p < 0.01 else 
              "Sig.*" if p < 0.05 else 
              "Marginal†" if p < 0.1 else "Not Sig. (ns)"
)

regression_summary['Trend Direction'] = regression_summary['Slope (per week)'].apply(
    lambda slope: 'Increasing' if slope > 0 else 'Decreasing'
)

print("\n=== COMPLETE REGRESSION ANALYSIS USING SCIPY.STATS.LINREGRESS ===")
print(regression_summary.to_string(index=False))

