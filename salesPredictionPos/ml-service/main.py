import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import joblib
from model import predict_sales, train_model, METRICS_PATH

app = FastAPI(
    title="Smart POS ML Forecasting Service",
    description="Python FastAPI service powered by XGBoost and Random Forest for Sri Lankan SME sales predictions",
    version="1.1.0"
)

class SalesMetrics(BaseModel):
    date: str
    total_sales: float
    transactions: int
    discount_amount: float

class TrainRequest(BaseModel):
    history: List[SalesMetrics]

class PredictRequest(BaseModel):
    last_known: SalesMetrics
    days: Optional[int] = 30

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Smart POS XGBoost & Random Forest Sales Predictor",
        "docs": "http://127.0.0.1:8001/docs",
        "health": "http://127.0.0.1:8001/health",
        "metrics": "http://127.0.0.1:8001/metrics"
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

@app.post("/predict")
def predict_endpoint(payload: PredictRequest):
    try:
        last_known_dict = payload.last_known.model_dump()
        predictions = predict_sales(last_known_dict, payload.days)
        
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
