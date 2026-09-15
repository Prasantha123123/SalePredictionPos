import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from datetime import datetime, timedelta

MODEL_PATH = os.path.join(os.path.dirname(__file__), "sales_xgb_model.joblib")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "model_metrics.joblib")

# Standardized feature vector: cyclical calendar encodings, autoregressive sales lags,
# and strictly lagged/rolling operational drivers (no contemporaneous target leakage)
FEATURE_COLUMNS = [
    'day_sin',
    'day_cos',
    'month_sin',
    'month_cos',
    'is_weekend',
    'lag_1',
    'lag_7',
    'rolling_mean_7',
    'transactions_lag1',
    'transactions_roll7',
    'discount_lag1',
    'discount_roll7'
]

# Candidate feature sets for systematic comparison via compare_feature_sets()
CANDIDATE_FEATURE_SETS = {
    'full': FEATURE_COLUMNS,   # all 12 features
    'core_6': [
        'day_sin', 'day_cos', 'is_weekend',
        'lag_1', 'lag_7', 'rolling_mean_7'
    ],
    'sales_only': [
        'lag_1', 'lag_7', 'rolling_mean_7', 'is_weekend'
    ],
    # 'importance_selected' is dynamic — top-5 by RF importance per split
}

def compute_iqr_bounds(series: pd.Series) -> tuple[float, float]:
    """
    Compute IQR lower and upper bounds strictly from a given Series (e.g. training set).
    """
    q1 = float(series.quantile(0.25))
    q3 = float(series.quantile(0.75))
    iqr = q3 - q1
    lower_bound = float(q1 - 1.5 * iqr)
    upper_bound = float(q3 + 1.5 * iqr)
    return lower_bound, upper_bound

def remove_outliers_iqr(series: pd.Series, bounds: tuple[float, float]) -> pd.Series:
    """
    Cap outliers in a Series using pre-computed bounds (lower_bound, upper_bound).
    Ensures test data is clipped using training-derived thresholds without leakage.
    """
    lower_bound, upper_bound = bounds
    return series.clip(lower=lower_bound, upper=upper_bound)

def prep_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare features for training or prediction across the chronological sequence.
    Expected columns: date, total_sales, transactions (optional), discount_amount (optional).
    
    Generates:
      - day_sin, day_cos, month_sin, month_cos, is_weekend (cyclical calendar features)
      - lag_1, lag_7, rolling_mean_7 (autoregressive sales features via shift(1))
      - transactions_lag1, transactions_roll7 (lagged transaction volume via shift(1))
      - discount_lag1, discount_roll7 (lagged discount amount via shift(1))
      
    Drops the initial rows that lack 7 days of historical context (no bfill leakage).
    """
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Clean and validate numerical series
    df['total_sales'] = pd.to_numeric(df['total_sales'], errors='coerce').fillna(0.0)
    if 'transactions' in df.columns:
        df['transactions'] = pd.to_numeric(df['transactions'], errors='coerce').fillna(0.0)
    else:
        df['transactions'] = 0.0

    if 'discount_amount' in df.columns:
        df['discount_amount'] = pd.to_numeric(df['discount_amount'], errors='coerce').fillna(0.0)
    else:
        df['discount_amount'] = 0.0

    # Cyclical Calendar Encodings (avoids false numeric distance/magnitude between days/months)
    day_of_week = df['date'].dt.dayofweek
    month = df['date'].dt.month
    
    df['day_sin'] = np.sin(2 * np.pi * day_of_week / 7.0)
    df['day_cos'] = np.cos(2 * np.pi * day_of_week / 7.0)
    df['month_sin'] = np.sin(2 * np.pi * month / 12.0)
    df['month_cos'] = np.cos(2 * np.pi * month / 12.0)
    df['is_weekend'] = day_of_week.isin([5, 6]).astype(int)
    
    # Lag and rolling features for total sales (shift(1) ensures no data leakage from current day's target)
    df['lag_1'] = df['total_sales'].shift(1)
    df['lag_7'] = df['total_sales'].shift(7)
    df['rolling_mean_7'] = df['total_sales'].shift(1).rolling(window=7, min_periods=1).mean()
    
    # Lagged and rolling features for transactions and discount_amount
    # shift(1) guarantees no contemporaneous target leakage during training
    df['transactions_lag1'] = df['transactions'].shift(1)
    df['transactions_roll7'] = df['transactions'].shift(1).rolling(window=7, min_periods=1).mean()
    df['discount_lag1'] = df['discount_amount'].shift(1)
    df['discount_roll7'] = df['discount_amount'].shift(1).rolling(window=7, min_periods=1).mean()
    
    # Drop rows where lag features are NaN (first 7 days of the whole series)
    # This avoids bfill() future-data leakage into early rows
    lag_cols = [
        'lag_1', 'lag_7', 'rolling_mean_7',
        'transactions_lag1', 'transactions_roll7',
        'discount_lag1', 'discount_roll7'
    ]
    df = df.dropna(subset=lag_cols).reset_index(drop=True)
    
    return df

def compute_mape(y_true, y_pred) -> float:
    """Calculate Mean Absolute Percentage Error."""
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

def train_model(historical_data: list) -> dict:
    """
    Train multiple models (XGBoost, Random Forest, Linear Regression),
    compare their performance metrics (RMSE, MAE, MAPE, R2),
    and save the best performing model.
    """
    if len(historical_data) < 17:  # Need 7 days for lag_7 + at least 10 usable training days
        print("Too little data to train models. Minimum 17 raw days required.")
        return {}
        
    df = pd.DataFrame(historical_data)
    df = prep_features(df)
    
    if len(df) < 10:
        print("Too little usable data after lag extraction. Minimum 10 usable days required.")
        return {}
    
    X = df[FEATURE_COLUMNS]
    y = df['total_sales']
    
    # Chronological Train/Test Split (80/20 time-series split, shuffle=False)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
    
    # Compute IQR bounds strictly on the training set to prevent test data leakage
    iqr_bounds = compute_iqr_bounds(y_train)
    
    # Apply training-derived bounds to clip both training and test target sets
    y_train = remove_outliers_iqr(y_train, iqr_bounds)
    y_test = remove_outliers_iqr(y_test, iqr_bounds)
    
    models = {
        'xgboost': xgb.XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42),
        'random_forest': RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        'linear_regression': LinearRegression(),
        'ridge': Ridge(alpha=1.0),
        'lasso': Lasso(alpha=1.0, max_iter=5000)
    }
    
    best_model_name = None
    best_model = None
    best_mape = float('inf')
    comparison_metrics = {}
    
    for name, model in models.items():
        # Train
        model.fit(X_train, y_train)
        
        # Predict on test set
        preds = model.predict(X_test)
        preds = np.clip(preds, a_min=0, a_max=None)
        
        # Calculate evaluation metrics
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        mae = float(mean_absolute_error(y_test, preds))
        mape = compute_mape(y_test, preds)
        r2 = float(r2_score(y_test, preds))
        
        comparison_metrics[name] = {
            'rmse': round(rmse, 2),
            'mae': round(mae, 2),
            'mape': round(mape, 2),
            'r2': round(r2, 4)
        }
        
        # Select best model by lowest MAPE
        if mape < best_mape:
            best_mape = mape
            best_model_name = name
            best_model = model
            
    # Save the best model
    joblib.dump(best_model, MODEL_PATH)
    
    # Save metrics metadata
    metrics_summary = {
        'best_model': best_model_name,
        'metrics': comparison_metrics[best_model_name],
        'comparison': comparison_metrics,
        'features': FEATURE_COLUMNS,
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    joblib.dump(metrics_summary, METRICS_PATH)
    
    print(f"Best model '{best_model_name}' successfully trained and saved with MAPE: {best_mape:.2f}%")
    return metrics_summary

def evaluate_with_rolling_cv(
    historical_data: list,
    n_splits: int = 5,
    min_train_size: int = 40,
    test_size: int = 10
) -> dict:
    """
    Perform rolling-origin (expanding window / walk-forward) time-series cross-validation.
    
    Evaluates XGBoost, Random Forest, and Linear Regression across multiple sequential temporal folds.
    For each split:
      - Feature engineering (prep_features) is applied to the chronological dataset.
      - Training set expands progressively from min_train_size.
      - Outlier IQR bounds are computed strictly on that fold's training target and applied to both train & test.
      - No future data or test data leaks into training.
      
    Returns:
      - split_results: Per-split metrics (RMSE, MAE, MAPE, R2, date windows, sizes)
      - summary: Mean and standard deviation for each metric per model
      - best_model_by_cv_mape: Best performing model across CV folds
    """
    if len(historical_data) < 17:
        return {"error": "Insufficient historical data for time-series cross-validation. Minimum 17 days required."}
        
    df = pd.DataFrame(historical_data)
    df = prep_features(df)
    
    total_samples = len(df)
    
    # Adaptive sizing check
    if total_samples < (min_train_size + test_size):
        min_train_size = max(15, int(total_samples * 0.6))
        test_size = max(5, int((total_samples - min_train_size) / n_splits))
        if total_samples < (min_train_size + test_size):
            return {"error": f"Insufficient usable records ({total_samples} available) for cross-validation."}

    # Calculate step size to distribute n_splits across available time range
    available_room = total_samples - min_train_size - test_size
    if n_splits > 1 and available_room > 0:
        step_size = max(1, available_room // (n_splits - 1))
    else:
        step_size = test_size

    split_results = []
    model_names = ['xgboost', 'random_forest', 'linear_regression', 'ridge', 'lasso']
    models_metrics_collector = {name: {'rmse': [], 'mae': [], 'mape': [], 'r2': []} for name in model_names}

    actual_splits = 0

    for split_idx in range(n_splits):
        train_end = min_train_size + (split_idx * step_size)
        test_end = train_end + test_size
        
        if test_end > total_samples:
            if train_end < total_samples:
                test_end = total_samples
            else:
                break
                
        train_df = df.iloc[:train_end].copy()
        test_df = df.iloc[train_end:test_end].copy()
        
        if len(test_df) < 3:
            break

        actual_splits += 1

        train_start_date = train_df['date'].min().strftime("%Y-%m-%d")
        train_end_date = train_df['date'].max().strftime("%Y-%m-%d")
        test_start_date = test_df['date'].min().strftime("%Y-%m-%d")
        test_end_date = test_df['date'].max().strftime("%Y-%m-%d")

        X_train = train_df[FEATURE_COLUMNS]
        y_train = train_df['total_sales']
        X_test = test_df[FEATURE_COLUMNS]
        y_test = test_df['total_sales']

        # Compute IQR outlier bounds strictly on this split's training portion
        iqr_bounds = compute_iqr_bounds(y_train)
        y_train_clipped = remove_outliers_iqr(y_train, iqr_bounds)
        y_test_clipped = remove_outliers_iqr(y_test, iqr_bounds)

        models = {
            'xgboost': xgb.XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42),
            'random_forest': RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
            'linear_regression': LinearRegression(),
            'ridge': Ridge(alpha=1.0),
            'lasso': Lasso(alpha=1.0, max_iter=5000)
        }

        split_model_metrics = {}

        for name, model in models.items():
            model.fit(X_train, y_train_clipped)
            preds = model.predict(X_test)
            preds = np.clip(preds, a_min=0, a_max=None)

            rmse = float(np.sqrt(mean_squared_error(y_test_clipped, preds)))
            mae = float(mean_absolute_error(y_test_clipped, preds))
            mape = compute_mape(y_test_clipped, preds)
            r2 = float(r2_score(y_test_clipped, preds))

            split_model_metrics[name] = {
                'rmse': round(rmse, 2),
                'mae': round(mae, 2),
                'mape': round(mape, 2),
                'r2': round(r2, 4)
            }

            models_metrics_collector[name]['rmse'].append(rmse)
            models_metrics_collector[name]['mae'].append(mae)
            models_metrics_collector[name]['mape'].append(mape)
            models_metrics_collector[name]['r2'].append(r2)

        split_results.append({
            'split': actual_splits,
            'train_size': len(train_df),
            'test_size': len(test_df),
            'train_window': f"{train_start_date} to {train_end_date}",
            'test_window': f"{test_start_date} to {test_end_date}",
            'models': split_model_metrics
        })

    # Aggregate summary metrics (mean +/- standard deviation across expanding folds)
    summary = {}
    best_model_name = None
    lowest_mean_mape = float('inf')

    for name, metric_dict in models_metrics_collector.items():
        summary[name] = {}
        for m in ['rmse', 'mae', 'mape', 'r2']:
            vals = metric_dict[m]
            mean_val = float(np.mean(vals)) if len(vals) > 0 else 0.0
            std_val = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
            
            summary[name][f"{m}_mean"] = round(mean_val, 2 if m != 'r2' else 4)
            summary[name][f"{m}_std"] = round(std_val, 2 if m != 'r2' else 4)

        if summary[name]['mape_mean'] < lowest_mean_mape:
            lowest_mean_mape = summary[name]['mape_mean']
            best_model_name = name

    return {
        'n_splits_requested': n_splits,
        'n_splits_completed': actual_splits,
        'total_usable_samples': total_samples,
        'features_used': FEATURE_COLUMNS,
        'split_results': split_results,
        'summary': summary,
        'best_model_by_cv_mape': best_model_name,
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def _build_models():
    """Canonical model factory used by both evaluate_with_rolling_cv and compare_feature_sets."""
    return {
        'xgboost': xgb.XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42),
        'random_forest': RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        'linear_regression': LinearRegression(),
        'ridge': Ridge(alpha=1.0),
        'lasso': Lasso(alpha=1.0, max_iter=5000)
    }

def compare_feature_sets(
    historical_data: list,
    n_splits: int = 5,
    min_train_size: int = 40,
    test_size: int = 10
) -> dict:
    """
    Systematic feature-set × model grid search over rolling-origin cross-validation.
    
    Evaluates four candidate feature sets:
      - 'full': all 12 current features
      - 'core_6': day_sin, day_cos, is_weekend, lag_1, lag_7, rolling_mean_7
      - 'sales_only': lag_1, lag_7, rolling_mean_7, is_weekend
      - 'importance_selected': top 5 features by RF feature_importances_ per split
    
    For each feature set, trains and evaluates all 5 models (xgboost, random_forest,
    linear_regression, ridge, lasso) on the SAME rolling CV splits, ensuring a fair
    comparison across (feature_set, model) combinations.
    """
    if len(historical_data) < 17:
        return {"error": "Insufficient historical data. Minimum 17 days required."}
    
    df = pd.DataFrame(historical_data)
    df = prep_features(df)
    
    total_samples = len(df)
    
    # Adaptive sizing (same logic as evaluate_with_rolling_cv)
    if total_samples < (min_train_size + test_size):
        min_train_size = max(15, int(total_samples * 0.6))
        test_size = max(5, int((total_samples - min_train_size) / n_splits))
        if total_samples < (min_train_size + test_size):
            return {"error": f"Insufficient usable records ({total_samples}) for cross-validation."}
    
    available_room = total_samples - min_train_size - test_size
    if n_splits > 1 and available_room > 0:
        step_size = max(1, available_room // (n_splits - 1))
    else:
        step_size = test_size
    
    model_names = list(_build_models().keys())
    
    # Static feature sets
    static_feature_sets = {
        'full': FEATURE_COLUMNS,
        'core_6': CANDIDATE_FEATURE_SETS['core_6'],
        'sales_only': CANDIDATE_FEATURE_SETS['sales_only'],
    }
    all_feature_set_names = list(static_feature_sets.keys()) + ['importance_selected']
    
    # Collectors: results[feature_set][model_name] = {rmse: [], mae: [], mape: [], r2: []}
    results_collector = {}
    for fs_name in all_feature_set_names:
        results_collector[fs_name] = {}
        for m_name in model_names:
            results_collector[fs_name][m_name] = {'rmse': [], 'mae': [], 'mape': [], 'r2': []}
    
    # Track which features were importance-selected per split
    importance_selections = []
    
    # Per-split detail records
    split_details = []
    actual_splits = 0
    
    for split_idx in range(n_splits):
        train_end = min_train_size + (split_idx * step_size)
        test_end = train_end + test_size
        
        if test_end > total_samples:
            if train_end < total_samples:
                test_end = total_samples
            else:
                break
        
        train_df = df.iloc[:train_end].copy()
        test_df = df.iloc[train_end:test_end].copy()
        
        if len(test_df) < 3:
            break
        
        actual_splits += 1
        
        train_start_date = train_df['date'].min().strftime('%Y-%m-%d')
        train_end_date = train_df['date'].max().strftime('%Y-%m-%d')
        test_start_date = test_df['date'].min().strftime('%Y-%m-%d')
        test_end_date = test_df['date'].max().strftime('%Y-%m-%d')
        
        y_train_raw = train_df['total_sales']
        y_test_raw = test_df['total_sales']
        
        # Compute IQR bounds strictly on training target
        iqr_bounds = compute_iqr_bounds(y_train_raw)
        y_train_clipped = remove_outliers_iqr(y_train_raw, iqr_bounds)
        y_test_clipped = remove_outliers_iqr(y_test_raw, iqr_bounds)
        
        # --- Determine importance_selected features for THIS split ---
        # Fit a RF on the full feature set to extract importances
        rf_for_importance = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
        rf_for_importance.fit(train_df[FEATURE_COLUMNS], y_train_clipped)
        importances = rf_for_importance.feature_importances_
        feature_importance_pairs = sorted(
            zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True
        )
        top_5_features = [f for f, _ in feature_importance_pairs[:5]]
        importance_selections.append({
            'split': actual_splits,
            'selected_features': top_5_features,
            'importances': {f: round(float(imp), 4) for f, imp in feature_importance_pairs}
        })
        
        # Build feature sets for this split (static + dynamic importance_selected)
        split_feature_sets = dict(static_feature_sets)
        split_feature_sets['importance_selected'] = top_5_features
        
        split_detail = {
            'split': actual_splits,
            'train_size': len(train_df),
            'test_size': len(test_df),
            'train_window': f"{train_start_date} to {train_end_date}",
            'test_window': f"{test_start_date} to {test_end_date}",
            'importance_selected_features': top_5_features,
            'feature_sets': {}
        }
        
        for fs_name, fs_cols in split_feature_sets.items():
            X_train_fs = train_df[fs_cols]
            X_test_fs = test_df[fs_cols]
            
            fs_model_metrics = {}
            models = _build_models()
            
            for m_name, model in models.items():
                model.fit(X_train_fs, y_train_clipped)
                preds = model.predict(X_test_fs)
                preds = np.clip(preds, a_min=0, a_max=None)
                
                rmse = float(np.sqrt(mean_squared_error(y_test_clipped, preds)))
                mae = float(mean_absolute_error(y_test_clipped, preds))
                mape = compute_mape(y_test_clipped, preds)
                r2 = float(r2_score(y_test_clipped, preds))
                
                fs_model_metrics[m_name] = {
                    'rmse': round(rmse, 2),
                    'mae': round(mae, 2),
                    'mape': round(mape, 2),
                    'r2': round(r2, 4)
                }
                
                results_collector[fs_name][m_name]['rmse'].append(rmse)
                results_collector[fs_name][m_name]['mae'].append(mae)
                results_collector[fs_name][m_name]['mape'].append(mape)
                results_collector[fs_name][m_name]['r2'].append(r2)
            
            split_detail['feature_sets'][fs_name] = fs_model_metrics
        
        split_details.append(split_detail)
    
    # --- Aggregate summary: mean +/- std per (feature_set, model) ---
    summary = {}
    best_combo = None
    best_mean_mape = float('inf')
    
    for fs_name in all_feature_set_names:
        summary[fs_name] = {}
        for m_name in model_names:
            collector = results_collector[fs_name][m_name]
            stats = {}
            for metric in ['rmse', 'mae', 'mape', 'r2']:
                vals = collector[metric]
                decimals = 4 if metric == 'r2' else 2
                mean_v = float(np.mean(vals)) if len(vals) > 0 else 0.0
                std_v = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
                stats[f'{metric}_mean'] = round(mean_v, decimals)
                stats[f'{metric}_std'] = round(std_v, decimals)
            summary[fs_name][m_name] = stats
            
            if stats['mape_mean'] < best_mean_mape:
                best_mean_mape = stats['mape_mean']
                best_combo = {'feature_set': fs_name, 'model': m_name}
    
    # Feature frequency across importance_selected splits
    feature_frequency = {}
    for sel in importance_selections:
        for f in sel['selected_features']:
            feature_frequency[f] = feature_frequency.get(f, 0) + 1
    feature_frequency_sorted = sorted(feature_frequency.items(), key=lambda x: x[1], reverse=True)
    
    return {
        'n_splits_requested': n_splits,
        'n_splits_completed': actual_splits,
        'total_usable_samples': total_samples,
        'feature_sets_evaluated': all_feature_set_names,
        'models_evaluated': model_names,
        'candidate_feature_sets': {
            'full': FEATURE_COLUMNS,
            'core_6': CANDIDATE_FEATURE_SETS['core_6'],
            'sales_only': CANDIDATE_FEATURE_SETS['sales_only'],
            'importance_selected': 'top 5 by RF feature_importances_ per split (dynamic)'
        },
        'split_details': split_details,
        'summary': summary,
        'best_combination': best_combo,
        'importance_selections': importance_selections,
        'importance_feature_frequency': feature_frequency_sorted,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

def predict_sales(last_known_data: dict, days_to_predict: int = 30, history: list = None) -> list:
    """
    Predict sales for the next N days recursively using autoregressive lag and rolling features.
    
    Defensively handles the history buffer:
    - Sorts chronologically and aggregates any duplicate date entries.
    - Uses partial history (1-6 entries) by padding at the front with the earliest available value.
    - Cold-start fallback (0 entries) uses last_known_data repeated 7 times.
    - Uses strictly lagged/rolling values for transactions and discounts (transactions_lag1,
      transactions_roll7, discount_lag1, discount_roll7), maintaining identical feature semantics
      between training and inference without contemporaneous target leakage.
    """
    current_date = datetime.strptime(last_known_data['date'], '%Y-%m-%d')
    base_sales = float(last_known_data.get('total_sales', 0.0))
    base_tx = float(last_known_data.get('transactions', 0.0))
    base_disc = float(last_known_data.get('discount_amount', 0.0))

    # Defensive parsing, de-duplication, and chronological sorting of incoming history
    sales_history = []
    tx_history = []
    disc_history = []

    if history and len(history) > 0:
        history_df = pd.DataFrame(history)
        history_df['date'] = pd.to_datetime(history_df['date'])
        history_df['total_sales'] = pd.to_numeric(history_df['total_sales'], errors='coerce').fillna(0.0)
        
        if 'transactions' in history_df.columns:
            history_df['transactions'] = pd.to_numeric(history_df['transactions'], errors='coerce').fillna(0.0)
        else:
            history_df['transactions'] = 0.0
            
        if 'discount_amount' in history_df.columns:
            history_df['discount_amount'] = pd.to_numeric(history_df['discount_amount'], errors='coerce').fillna(0.0)
        else:
            history_df['discount_amount'] = 0.0

        # De-duplicate entries by date and sort chronologically
        history_df = history_df.groupby('date', as_index=False).agg({
            'total_sales': 'sum',
            'transactions': 'sum',
            'discount_amount': 'sum'
        }).sort_values('date').reset_index(drop=True)

        k = len(history_df)
        if k >= 7:
            sales_history = history_df['total_sales'].tolist()
            tx_history = history_df['transactions'].tolist()
            disc_history = history_df['discount_amount'].tolist()
        elif k > 0:
            # Partial history padding (1 to 6 days): pad at the FRONT with earliest available value
            sales_raw = history_df['total_sales'].tolist()
            tx_raw = history_df['transactions'].tolist()
            disc_raw = history_df['discount_amount'].tolist()
            pad_len = 7 - k
            sales_history = [sales_raw[0]] * pad_len + sales_raw
            tx_history = [tx_raw[0]] * pad_len + tx_raw
            disc_history = [disc_raw[0]] * pad_len + disc_raw

    # Fallback to cold-start buffer if history is empty
    if len(sales_history) < 7:
        sales_history = [base_sales] * 7
        tx_history = [base_tx] * 7
        disc_history = [base_disc] * 7

    if not os.path.exists(MODEL_PATH):
        # Fallback statistical projection if model isn't built yet
        print("No trained model found. Using statistical baseline.")
        predictions = []
        curr_sales = base_sales if base_sales > 0 else 45000.0
        
        for i in range(1, days_to_predict + 1):
            pred_date = current_date + timedelta(days=i)
            day_of_week = pred_date.weekday()
            month = pred_date.month
            day_sin = np.sin(2 * np.pi * day_of_week / 7.0)
            day_cos = np.cos(2 * np.pi * day_of_week / 7.0)
            month_sin = np.sin(2 * np.pi * month / 12.0)
            month_cos = np.cos(2 * np.pi * month / 12.0)
            is_weekend = 1 if day_of_week in [5, 6] else 0
            
            multiplier = 1.25 if is_weekend else 0.95
            predicted_val = curr_sales * multiplier * np.random.uniform(0.95, 1.05)
            
            tx_lag1 = float(tx_history[-1])
            tx_roll7 = float(np.mean(tx_history[-7:]))
            disc_lag1 = float(disc_history[-1])
            disc_roll7 = float(np.mean(disc_history[-7:]))
            
            features_dict = {
                'day_sin': round(float(day_sin), 4),
                'day_cos': round(float(day_cos), 4),
                'month_sin': round(float(month_sin), 4),
                'month_cos': round(float(month_cos), 4),
                'is_weekend': int(is_weekend),
                'lag_1': round(curr_sales, 2),
                'lag_7': round(curr_sales, 2),
                'rolling_mean_7': round(curr_sales, 2),
                'transactions_lag1': round(tx_lag1, 2),
                'transactions_roll7': round(tx_roll7, 2),
                'discount_lag1': round(disc_lag1, 2),
                'discount_roll7': round(disc_roll7, 2),
            }
            
            # NOTE: heuristic confidence for display purposes only — not a statistical prediction interval
            confidence_val = round(float(np.random.uniform(78, 92)), 1)
            
            predictions.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "predicted_amount": round(float(predicted_val), 2),
                "confidence": confidence_val,
                "features": features_dict
            })
            curr_sales = predicted_val
        return predictions

    # Load trained model
    model = joblib.load(MODEL_PATH)
    predictions = []
    
    for i in range(1, days_to_predict + 1):
        pred_date = current_date + timedelta(days=i)
        day_of_week = pred_date.weekday()
        month = pred_date.month
        
        # Cyclical calendar features for prediction step
        day_sin = np.sin(2 * np.pi * day_of_week / 7.0)
        day_cos = np.cos(2 * np.pi * day_of_week / 7.0)
        month_sin = np.sin(2 * np.pi * month / 12.0)
        month_cos = np.cos(2 * np.pi * month / 12.0)
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        # Recalculate lag and rolling sales features at each recursive step
        lag_1 = float(sales_history[-1])
        lag_7 = float(sales_history[-7]) if len(sales_history) >= 7 else float(sales_history[0])
        last_7_days_sales = sales_history[-7:]
        rolling_mean_7 = float(sum(last_7_days_sales) / len(last_7_days_sales))
        
        # Recalculate lagged and rolling operational features from historical buffer
        tx_lag1 = float(tx_history[-1])
        last_7_days_tx = tx_history[-7:]
        tx_roll7 = float(sum(last_7_days_tx) / len(last_7_days_tx))
        
        disc_lag1 = float(disc_history[-1])
        last_7_days_disc = disc_history[-7:]
        disc_roll7 = float(sum(last_7_days_disc) / len(last_7_days_disc))
        
        features_dict = {
            'day_sin': round(float(day_sin), 4),
            'day_cos': round(float(day_cos), 4),
            'month_sin': round(float(month_sin), 4),
            'month_cos': round(float(month_cos), 4),
            'is_weekend': int(is_weekend),
            'lag_1': round(lag_1, 2),
            'lag_7': round(lag_7, 2),
            'rolling_mean_7': round(rolling_mean_7, 2),
            'transactions_lag1': round(tx_lag1, 2),
            'transactions_roll7': round(tx_roll7, 2),
            'discount_lag1': round(disc_lag1, 2),
            'discount_roll7': round(disc_roll7, 2),
        }
        
        feature_row = pd.DataFrame([features_dict])[FEATURE_COLUMNS]
        
        # Model inference
        pred_val = model.predict(feature_row)[0]
        pred_val = max(0.0, float(pred_val))
        
        # NOTE: heuristic confidence for display purposes only — not a statistical prediction interval
        confidence_val = round(float(max(70.0, 95.0 - (i * 0.4))), 1)
        
        predictions.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "predicted_amount": round(pred_val, 2),
            "confidence": confidence_val,
            "features": features_dict
        })
        
        # Update history buffers recursively for subsequent iterations
        sales_history.append(pred_val)
        tx_history.append(tx_roll7)
        disc_history.append(disc_roll7)
        
    return predictions
