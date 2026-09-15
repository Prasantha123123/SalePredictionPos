import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import joblib
from model import predict_sales, train_model, evaluate_with_rolling_cv, compare_feature_sets, METRICS_PATH

app = FastAPI(
    title="Smart POS ML Forecasting Service",
    description="Python FastAPI service powered by XGBoost, Random Forest, and Linear Regression for Sri Lankan SME sales predictions",
    version="1.3.0"
)

class SalesMetrics(BaseModel):
    date: str
    total_sales: float
    transactions: Optional[int] = 0
    discount_amount: Optional[float] = 0.0

class TrainRequest(BaseModel):
    history: List[SalesMetrics]

class PredictRequest(BaseModel):
    last_known: SalesMetrics
    history: Optional[List[SalesMetrics]] = None
    days: Optional[int] = 30

class CrossValidationRequest(BaseModel):
    history: List[SalesMetrics]
    n_splits: Optional[int] = 5
    min_train_size: Optional[int] = 40
    test_size: Optional[int] = 10

class FeatureComparisonRequest(BaseModel):
    history: List[SalesMetrics]
    n_splits: Optional[int] = 5
    min_train_size: Optional[int] = 40
    test_size: Optional[int] = 10

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Smart POS XGBoost & Random Forest Sales Predictor",
        "docs": "http://127.0.0.1:8001/docs",
        "health": "http://127.0.0.1:8001/health",
        "metrics": "http://127.0.0.1:8001/metrics",
        "cross_validation": "http://127.0.0.1:8001/evaluate/cross-validation",
        "feature_comparison": "http://127.0.0.1:8001/evaluate/feature-comparison"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "XGBoost & RF Sales Predictor"}

@app.get("/metrics")
def get_metrics_endpoint():
    """Retrieve details and accuracy metrics of the trained model."""
    if os.path.exists(METRICS_PATH):
        try:
            return joblib.load(METRICS_PATH)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading metrics: {str(e)}")
    return {"message": "No model trained yet. Run /train first."}

@app.post("/train")
def train_endpoint(payload: TrainRequest):
    try:
        data_dicts = [item.model_dump() for item in payload.history]
        metrics_summary = train_model(data_dicts)
        if metrics_summary:
            return {
                "message": "Model trained successfully.",
                "metrics": metrics_summary
            }
        else:
            return {"message": "Model training skipped. Insufficient data."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate/cross-validation")
def cross_validation_endpoint(payload: CrossValidationRequest):
    """
    Perform rolling-origin (expanding window / walk-forward) cross validation
    across multiple sequential chronological splits.
    """
    try:
        data_dicts = [item.model_dump() for item in payload.history]
        cv_results = evaluate_with_rolling_cv(
            historical_data=data_dicts,
            n_splits=payload.n_splits or 5,
            min_train_size=payload.min_train_size or 40,
            test_size=payload.test_size or 10
        )
        return cv_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate/feature-comparison")
def feature_comparison_endpoint(payload: FeatureComparisonRequest):
    """
    Systematic feature-set × model grid search over rolling-origin cross-validation.
    Compares 4 feature sets × 5 models across identical temporal folds.
    """
    try:
        data_dicts = [item.model_dump() for item in payload.history]
        results = compare_feature_sets(
            historical_data=data_dicts,
            n_splits=payload.n_splits or 5,
            min_train_size=payload.min_train_size or 40,
            test_size=payload.test_size or 10
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict_endpoint(payload: PredictRequest):
    try:
        last_known_dict = payload.last_known.model_dump()
        history_list = [item.model_dump() for item in payload.history] if payload.history else None
        predictions = predict_sales(last_known_dict, payload.days, history=history_list)
        
        # Structure output for tomorrow, next 7 days, and next 30 days
        tomorrow = predictions[0] if len(predictions) > 0 else None
        next_7_days = predictions[:7]
        next_30_days = predictions
        
        return {
            "tomorrow": tomorrow,
            "next_7_days": next_7_days,
            "next_30_days": next_30_days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
