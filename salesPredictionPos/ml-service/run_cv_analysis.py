import json
import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from model import evaluate_with_rolling_cv

with open("sales_history.json", "r") as f:
    history = json.load(f)

print(f"Loaded {len(history)} historical sales days.")

cv_results = evaluate_with_rolling_cv(history, n_splits=5, min_train_size=40, test_size=12)

with open("current_cv_results.json", "w") as f:
    json.dump(cv_results, f, indent=2)

print("\n==================== 5-FOLD ROLLING-ORIGIN CV RESULTS ====================")
splits = cv_results.get("split_results", [])
models = ['xgboost', 'random_forest', 'linear_regression', 'ridge', 'lasso']

for split in splits:
    s_idx = split['split']
    t_win = split['train_window']
    v_win = split['test_window']
    t_sz = split['train_size']
    v_sz = split['test_size']
    print(f"\n--- FOLD {s_idx}: Train [{t_win}] ({t_sz} days) -> Test [{v_win}] ({v_sz} days) ---")
    for m in models:
        metrics = split['models'][m]
        print(f"  {m:<18}: R2 = {metrics['r2']:>8.4f} | MAPE = {metrics['mape']:>6.2f}% | RMSE = Rs. {metrics['rmse']:>9.2f}")

print("\n==================== AGGREGATE MODEL SUMMARY (MEAN ± STD) ====================")
summary = cv_results.get("summary", {})
for m in models:
    s = summary[m]
    print(f"  {m:<18}: R2 = {s['r2_mean']:>7.4f} ± {s['r2_std']:<6.4f} | MAPE = {s['mape_mean']:>6.2f}% ± {s['mape_std']:<5.2f}% | RMSE = Rs. {s['rmse_mean']:>8.2f} ± {s['rmse_std']:<7.2f}")

print(f"\nBest Model by CV MAPE: {cv_results.get('best_model_by_cv_mape')}")