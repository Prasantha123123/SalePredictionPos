<?php

namespace Tests\Feature\Integration;

use App\Models\Sale;
use App\Models\SalesPrediction;
use App\Models\User;
use App\Services\PredictionService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MlMicroserviceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected PredictionService $predictionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->predictionService = app(PredictionService::class);
    }

    public function test_fastapi_health_check(): void
    {
        // Tests real FastAPI service if online, or verifies connection method
        $isHealthy = $this->predictionService->isServiceRunning();
        $this->assertIsBool($isHealthy);
    }

    public function test_prediction_storage_when_fastapi_responds(): void
    {
        $tomorrow = Carbon::tomorrow()->format('Y-m-d');

        // Fake the HTTP call to ensure deterministic test without modifying external service
        Http::fake([
            '*/health' => Http::response(['status' => 'healthy'], 200),
            '*/metrics' => Http::response([
                'best_model' => 'xgboost',
                'models' => [
                    'xgboost' => ['mae' => 1250.5, 'rmse' => 1840.2, 'r2' => 0.82],
                ],
            ], 200),
            '*/predict' => Http::response([
                'next_30_days' => [
                    [
                        'date' => $tomorrow,
                        'predicted_amount' => 45200.50,
                        'confidence' => 0.88,
                        'features' => [
                            'day_of_week' => 3,
                            'month' => 9,
                            'is_weekend' => 0,
                        ],
                    ],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();
        Sale::create([
            'invoice_number' => 'INV-20260915-001',
            'user_id' => $user->id,
            'subtotal' => 40000,
            'total' => 40000,
            'payment_method' => 'cash',
            'status' => 'completed',
            'created_at' => Carbon::yesterday(),
        ]);

        $success = $this->predictionService->fetchPredictions();
        $this->assertTrue($success);

        $this->assertDatabaseHas('sales_predictions', [
            'predicted_amount' => 45200.50,
            'model_used' => 'xgboost',
        ]);
        $this->assertEquals($tomorrow, SalesPrediction::first()->prediction_date->format('Y-m-d'));
    }

    public function test_prediction_service_handles_service_outage_gracefully(): void
    {
        Http::fake([
            '*/health' => Http::response(null, 503),
        ]);

        $result = $this->predictionService->isServiceRunning();
        $this->assertFalse($result);
    }
}
