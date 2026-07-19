<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SalesPrediction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PredictionService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ml_service.url', 'http://127.0.0.1:8001');
    }

    /**
     * Fetch daily sales history, structure it, and train the XGBoost model.
     */
    public function trainModel(): bool
    {
        try {
            // Aggregate sales by date for the last 90 days
            $history = Sale::where('status', 'completed')
                ->where('created_at', '>=', now()->subDays(90))
                ->selectRaw('DATE(created_at) as date, SUM(total) as total_sales, COUNT(*) as transactions, SUM(discount_amount) as discount_amount')
                ->groupByRaw('DATE(created_at)')
                ->orderBy('date')
                ->get()
                ->map(fn ($row) => [
                    'date' => $row->date,
                    'total_sales' => (float) $row->total_sales,
                    'transactions' => (int) $row->transactions,
                    'discount_amount' => (float) $row->discount_amount,
                ])
                ->toArray();

            if (count($history) < 10) {
                Log::warning('Insufficient sales days to train XGBoost model. Count: ' . count($history));
                return false;
            }

            $response = Http::timeout(15)->post("{$this->baseUrl}/train", [
                'history' => $history,
            ]);

            if ($response->successful()) {
                Log::info('ML service model trained successfully: ' . $response->body());
                return true;
            }

            Log::error('Failed to train ML model. Service response: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('Error calling ML service /train: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Grab yesterday's actual metrics, call FastAPI, and insert predicted tomorrow/future sales predictions.
     */
    public function fetchPredictions(): bool
    {
        try {
            // Get yesterday's stats to seed recursive predict features
            $yesterday = Carbon::yesterday()->format('Y-m-d');
            $metrics = Sale::where('status', 'completed')
                ->whereDate('created_at', $yesterday)
                ->selectRaw('SUM(total) as total_sales, COUNT(*) as transactions, SUM(discount_amount) as discount_amount')
                ->first();

            $lastKnown = [
                'date' => $yesterday,
                'total_sales' => (float) ($metrics->total_sales ?? 0),
                'transactions' => (int) ($metrics->transactions ?? 0),
                'discount_amount' => (float) ($metrics->discount_amount ?? 0),
            ];

            // If no sales yesterday, fallback to latest daily sales record to prevent complete failure
            if ($lastKnown['total_sales'] <= 0) {
                $latestDay = Sale::where('status', 'completed')
                    ->selectRaw('DATE(created_at) as date, SUM(total) as total_sales, COUNT(*) as transactions, SUM(discount_amount) as discount_amount')
                    ->groupByRaw('DATE(created_at)')
                    ->orderBy('date', 'desc')
                    ->first();

                if ($latestDay) {
                    $lastKnown = [
                        'date' => $latestDay->date,
                        'total_sales' => (float) $latestDay->total_sales,
                        'transactions' => (int) $latestDay->transactions,
                        'discount_amount' => (float) $latestDay->discount_amount,
                    ];
                }
            }

            $response = Http::timeout(10)->post("{$this->baseUrl}/predict", [
                'last_known' => $lastKnown,
                'days' => 30,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Store predictions
                foreach ($data['next_30_days'] as $pred) {
                    SalesPrediction::updateOrCreate(
                        ['prediction_date' => $pred['date']],
                        [
                            'predicted_amount' => $pred['predicted_amount'],
                            'confidence' => $pred['confidence'],
                            'model_used' => 'xgboost',
                            'features' => [
                                'day_of_week' => Carbon::parse($pred['date'])->dayOfWeek,
                                'month' => Carbon::parse($pred['date'])->month,
                                'is_weekend' => Carbon::parse($pred['date'])->isWeekend() ? 1 : 0,
                            ],
                        ]
                    );
                }

                // Fill actual amounts for past predictions for visualization comparison
                $this->updateHistoricalActuals();

                return true;
            }

            Log::error('Failed to retrieve predictions. Response: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('Error calling ML service /predict: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Compute actual totals for historical predictions where actuals are missing.
     */
    private function updateHistoricalActuals(): void
    {
        $predictions = SalesPrediction::whereNull('actual_amount')
            ->where('prediction_date', '<=', Carbon::today())
            ->get();

        foreach ($predictions as $p) {
            $actual = Sale::where('status', 'completed')
                ->whereDate('created_at', $p->prediction_date)
                ->sum('total');

            $p->update(['actual_amount' => $actual]);
        }
    }
}
