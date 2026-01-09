import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import linregress, t
import warnings
warnings.filterwarnings('ignore')

# Load and prepare data
df = pd.read_csv('comments_rows.csv')

# === (i) EXACT DATAFRAME STRUCTURE ===
print("=== EXACT DATAFRAME STRUCTURE ===")
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"Data types:\n{df.dtypes}")
print(f"\nFirst 5 rows:")
print(df.head())
print(f"\nMissing values per column:\n{df.isnull().sum()}")
print(f"\nUnique values in key columns:")
print(f"Week numbers: {sorted(df['week_number'].unique())}")
print(f"Sentiment values: {df['sentiment'].unique()}")

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
n = len(weeks)  # number of observations

# Function to calculate 95% CI for slope
def calculate_slope_ci(slope, std_err, n, confidence=0.95):
    """Calculate confidence interval for regression slope"""
    df = n - 2  # degrees of freedom
    t_val = t.ppf((1 + confidence) / 2, df)
    margin_error = t_val * std_err
    return slope - margin_error, slope + margin_error

# Function to calculate standardized effect size (Cohen's d equivalent for regression)
def calculate_standardized_effect_size(x, y, slope):
    """Calculate standardized effect size for regression slope"""
    # Calculate correlation coefficient
    r = np.corrcoef(x, y)[0, 1]
    
    # Calculate standardized slope (beta coefficient)
    x_std = np.std(x, ddof=1)
    y_std = np.std(y, ddof=1)
    standardized_slope = slope * (x_std / y_std)
    
    # Calculate Cohen's f-squared (effect size for regression)
    r_squared = r**2
    f_squared = r_squared / (1 - r_squared)
    
    return {
        'correlation': r,
        'standardized_slope': standardized_slope,
        'f_squared': f_squared,
        'effect_size_interpretation': interpret_effect_size(f_squared)
    }

def interpret_effect_size(f_squared):
    """Interpret Cohen's f-squared effect size"""
    if f_squared < 0.02:
        return "Negligible"
    elif f_squared < 0.15:
        return "Small"
    elif f_squared < 0.35:
        return "Medium"
    else:
        return "Large"

# Linear regression analysis
regression_results = {}
metrics = {
    'positive': ('positive_pct', 'Positive Sentiment (%)'),
    'negative': ('negative_pct', 'Negative Sentiment (%)'),
    'neutral': ('neutral_pct', 'Neutral Sentiment (%)'),
    'water': ('water_drops', 'Water Drops'),
    'poison': ('poison_drops', 'Poison Drops'),
    'ratio': ('water_poison_ratio', 'Water/Poison Ratio')
}

for metric_key, (column, name) in metrics.items():
    y_values = weekly_trends[column].values
    
    # Basic regression
    slope, intercept, r_value, p_value, std_err = linregress(weeks, y_values)
    
    # Calculate 95% CI for slope
    ci_lower, ci_upper = calculate_slope_ci(slope, std_err, n)
    
    # Calculate standardized effect size
    effect_size = calculate_standardized_effect_size(weeks, y_values, slope)
    
    regression_results[metric_key] = {
        'name': name,
        'slope': slope,
        'intercept': intercept,
        'r_value': r_value,
        'r_squared': r_value**2,
        'p_value': p_value,
        'std_err': std_err,
        'slope_ci_lower': ci_lower,
        'slope_ci_upper': ci_upper,
        'values': y_values,
        'predictions': slope * weeks + intercept,
        'effect_size': effect_size,
        'n': n
    }



DPI = 600
FIGSIZE = (12, 8)

# 1. COMBINED SENTIMENT TRENDS PLOT
plt.figure(figsize=FIGSIZE)
predictions_pos = regression_results['positive']['predictions']
predictions_neg = regression_results['negative']['predictions']
predictions_neutral = regression_results['neutral']['predictions']

plt.scatter(weeks, weekly_trends['positive_pct'], color='green', alpha=0.7, s=80, label='Positive (Actual)', zorder=5)
plt.plot(weeks, predictions_pos, color='darkgreen', linewidth=3, 
         label=f"Positive Trend (R²={regression_results['positive']['r_squared']:.3f}, p={regression_results['positive']['p_value']:.4f})", zorder=4)

plt.scatter(weeks, weekly_trends['negative_pct'], color='red', alpha=0.7, s=80, label='Negative (Actual)', zorder=3)
plt.plot(weeks, predictions_neg, color='darkred', linewidth=3, 
         label=f"Negative Trend (R²={regression_results['negative']['r_squared']:.3f}, p={regression_results['negative']['p_value']:.4f})", zorder=2)

plt.scatter(weeks, weekly_trends['neutral_pct'], color='gray', alpha=0.7, s=80, label='Neutral (Actual)', zorder=1)
plt.plot(weeks, predictions_neutral, color='black', linewidth=3, 
         label=f"Neutral Trend (R²={regression_results['neutral']['r_squared']:.3f}, p={regression_results['neutral']['p_value']:.4f})", zorder=0)

plt.title('Sentiment Trends with Linear Regression Analysis', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=12)
plt.ylabel('Sentiment Percentage (%)', fontsize=12)
plt.legend(fontsize=10)
plt.grid(True, alpha=0.3)
plt.xticks(weeks)
plt.tight_layout()
plt.savefig('sentiment_trends_combined.png', dpi=DPI, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.show()
plt.close()

# 2. COMBINED WATER & POISON DROPS PLOT 
plt.figure(figsize=FIGSIZE)
predictions_water = regression_results['water']['predictions']
predictions_poison = regression_results['poison']['predictions']

plt.scatter(weeks, weekly_trends['water_drops'], color='blue', alpha=0.7, s=80, label='Water Drops (Actual)', zorder=5)
plt.plot(weeks, predictions_water, color='darkblue', linewidth=3, 
         label=f"Water Drops Trend (R²={regression_results['water']['r_squared']:.3f}, p={regression_results['water']['p_value']:.4f})", zorder=4)

plt.scatter(weeks, weekly_trends['poison_drops'], color='red', alpha=0.7, s=80, label='Poison Drops (Actual)', zorder=3)
plt.plot(weeks, predictions_poison, color='darkred', linewidth=3, 
         label=f"Poison Drops Trend (R²={regression_results['poison']['r_squared']:.3f}, p={regression_results['poison']['p_value']:.4f})", zorder=2)

plt.title('Water vs Poison Drops Trends with Linear Regression Analysis', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=12)
plt.ylabel('Number of Drops', fontsize=12)
plt.legend(fontsize=10)
plt.grid(True, alpha=0.3)
plt.xticks(weeks)
plt.tight_layout()
plt.savefig('water_poison_drops_combined.png', dpi=DPI, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.show()
plt.close()

# 3. WATER-TO-POISON RATIO PLOT 
plt.figure(figsize=FIGSIZE)
stats = regression_results['ratio']
plt.scatter(weeks, weekly_trends['water_poison_ratio'], color='purple', alpha=0.7, s=80, label='Actual Data', zorder=3)
plt.plot(weeks, stats['predictions'], color='indigo', linewidth=3, 
         label=f"Regression Line\nR²={stats['r_squared']:.3f}, p={stats['p_value']:.4f}\nSlope: {stats['slope']:.3f} [{stats['slope_ci_lower']:.3f}, {stats['slope_ci_upper']:.3f}]", zorder=2)
plt.title('Water-to-Poison Ratio Trend Analysis', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Week Number', fontsize=12)
plt.ylabel('Water/Poison Ratio', fontsize=12)
plt.legend(fontsize=10)
plt.grid(True, alpha=0.3, zorder=1)
plt.xticks(weeks)
plt.tight_layout()
plt.savefig('water_poison_ratio_trend.png', dpi=DPI, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.show()
plt.close()

print("=== PLOTS SAVED SUCCESSFULLY ===")
print("High-resolution plots saved:")
print("1. sentiment_trends_combined.png (positive, negative, neutral together)")
print("2. water_poison_drops_combined.png (water & poison drops together)")
print("3. water_poison_ratio_trend.png (individual ratio plot)")
print(f"\nAll plots saved at {DPI} DPI resolution")

# Print  regression results
print("\n=== ENHANCED REGRESSION RESULTS WITH 95% CI AND EFFECT SIZES ===")
for metric, stats in regression_results.items():
    print(f"\n{stats['name'].upper()}:")
    print(f"  Slope: {stats['slope']:.4f} [{stats['slope_ci_lower']:.4f}, {stats['slope_ci_upper']:.4f}]")
    print(f"  R²: {stats['r_squared']:.4f}")
    print(f"  p-value: {stats['p_value']:.6f}")
    print(f"  Effect Size (f²): {stats['effect_size']['f_squared']:.4f} ({stats['effect_size']['effect_size_interpretation']})")
