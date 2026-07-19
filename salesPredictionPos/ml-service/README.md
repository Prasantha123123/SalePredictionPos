# Sales Prediction ML Service

This is the Python FastAPI microservice that trains the XGBoost Regressor and outputs sales forecasts for Sri Lankan SMEs.

## Setup Instructions

1. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Server**:
   ```bash
   python main.py
   ```
   The service will run locally on [http://127.0.0.1:8001](http://127.0.0.1:8001).

## API Endpoints

- **GET `/health`**: Returns health status.
- **POST `/train`**: Supply historical daily sales metrics to retrain the XGBoost model.
- **POST `/predict`**: Pass the last day's sales metrics to generate forecasts.
