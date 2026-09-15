<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\SalesPrediction;
use App\Services\PredictionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ForecastController extends Controller
{
    public function index(): Response
    {
        $futurePredictions = SalesPrediction::where('prediction_date', '>', Carbon::today())
            ->orderBy('prediction_date')
            ->get()
            ->map(fn ($p) => [
                'date' => $p->prediction_date->format('Y-m-d'),
                'day_name' => $p->prediction_date->format('l'),
                'predicted_amount' => round((float) $p->predicted_amount, 2),
                'confidence' => (float) $p->confidence,
                'model' => $p->model_used,
            ]);

        $historicalAccuracy = SalesPrediction::whereNotNull('actual_amount')
            ->where('prediction_date', '>=', Carbon::now()->subDays(30))
            ->orderBy('prediction_date')
            ->get()
            ->map(fn ($p) => [
                'date' => $p->prediction_date->format('Y-m-d'),
                'predicted' => round((float) $p->predicted_amount, 2),
                'actual' => round((float) $p->actual_amount, 2),
                'error_pct' => $p->actual_amount > 0
                    ? round(abs($p->predicted_amount - $p->actual_amount) / $p->actual_amount * 100, 1)
                    : null,
            ]);

        $avgAccuracy = $historicalAccuracy->whereNotNull('error_pct')->avg('error_pct');

        // Dynamic Real Stock Recommendations from actual Inventory Database
        $aiRecommendations = Inventory::with('product')
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->orderBy('quantity')
            ->limit(5)
            ->get()
            ->map(fn ($inv) => [
                'title' => $inv->product->name ?? 'Product Item',
                'action' => 'Restock +' . max(15, ($inv->low_stock_threshold * 2) - $inv->quantity) . ' units',
                'reason' => $inv->quantity <= 0
                    ? 'Current stock is 0 units (Out of Stock alert)'
                    : "Low stock limit reached ({$inv->quantity} units remaining)",
                'status' => $inv->quantity <= 0 ? 'urgent' : 'caution',
            ])
            ->toArray();

        $latestPrediction = SalesPrediction::whereNotNull('metrics')->latest()->first();
        $metrics = $latestPrediction ? $latestPrediction->metrics : null;
        $bestModelName = $latestPrediction ? $latestPrediction->model_used : 'xgboost';

        return Inertia::render('forecasts/index', [
            'futurePredictions' => $futurePredictions,
            'historicalAccuracy' => $historicalAccuracy,
            'averageErrorPercent' => round($avgAccuracy ?? 0, 1),
            'aiRecommendations' => $aiRecommendations,
            'modelInfo' => [
                'name' => ucfirst(str_replace('_', ' ', $bestModelName)) . ' Regressor',
                'features' => ['day_sin', 'day_cos', 'month_sin', 'month_cos', 'is_weekend', 'lag_1', 'lag_7', 'rolling_mean_7', 'transactions_lag1', 'transactions_roll7', 'discount_lag1', 'discount_roll7'],
                'metrics' => $metrics,
            ],
        ]);
    }

    /**
     * Retrain forecasting model and regenerate predictions
     */
    public function retrain(PredictionService $predictionService): RedirectResponse
    {
        $trained = $predictionService->trainModel();
        $predicted = $predictionService->fetchPredictions();

        if ($trained || $predicted) {
            return back()->with('success', 'Forecasting model retrained and future predictions updated successfully!');
        }

        return back()->with('error', 'Failed to retrain model. Ensure Python ML service is running on http://127.0.0.1:8001');
    }
}
