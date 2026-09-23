import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from model import compare_feature_sets

filename = sys.argv[1] if len(sys.argv) > 1 else "fresh_sales_export.json"

if not os.path.isabs(filename) and not os.path.exists(filename):
    candidate = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(candidate):
        filename = candidate

with open(filename, "r") as f:
    history = json.load(f)

print(f"Loaded {len(history)} historical sales days from {filename}.")

grid_results = compare_feature_sets(history, n_splits=5, min_train_size=40, test_size=10)

print("\n==================== FEATURE SET x MODEL GRID SEARCH SUMMARY ====================")
summary = grid_results.get("summary", {})
models = ['xgboost', 'random_forest', 'linear_regression', 'ridge', 'lasso']
feature_sets = ['full', 'core_6', 'sales_only', 'importance_selected']

for fs in feature_sets:
    print(f"\n--- Feature Set: {fs} ---")
    for m in models:
        stats = summary.get(fs, {}).get(m, {})
        print(f"  {m:<18}: R2 = {stats.get('r2_mean', 0):>7.4f} +/- {stats.get('r2_std', 0):<6.4f} | MAPE = {stats.get('mape_mean', 0):>6.2f}% +/- {stats.get('mape_std', 0):<5.2f}% | RMSE = Rs. {stats.get('rmse_mean', 0):>8.2f} +/- {stats.get('rmse_std', 0):<7.2f}")

print("\n==================== BEST COMBINATION (CHAMPION) ====================")
best = grid_results.get("best_combination", {})
fs_winner = best.get('feature_set')
m_winner = best.get('model')
winner_stats = summary.get(fs_winner, {}).get(m_winner, {})

print(f"Feature Set: {fs_winner}")
print(f"Model:       {m_winner}")
print(f"CV MAPE:     {winner_stats.get('mape_mean')}% +/- {winner_stats.get('mape_std')}%")
print(f"CV R2:       {winner_stats.get('r2_mean')} +/- {winner_stats.get('r2_std')}")
print(f"CV RMSE:     Rs. {winner_stats.get('rmse_mean')} +/- {winner_stats.get('rmse_std')}")
