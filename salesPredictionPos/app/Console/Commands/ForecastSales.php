<?php

namespace App\Console\Commands;

use App\Services\PredictionService;
use Illuminate\Console\Command;

class ForecastSales extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'forecast:sales {--train : Retrain the model before predicting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Triggers sales forecasting via ML service';

    /**
     * Execute the console command.
     */
    public function handle(PredictionService $predictionService): int
    {
        if ($this->option('train')) {
            $this->info('Starting XGBoost model training on FastAPI...');
            if ($predictionService->trainModel()) {
                $this->info('Training command sent successfully.');
            } else {
                $this->error('Model training failed.');
            }
        }

        $this->info('Fetching forecasts from ML service...');
        if ($predictionService->fetchPredictions()) {
            $this->info('Sales predictions successfully updated.');
            return Command::SUCCESS;
        }

        $this->error('Failed to update sales predictions.');
        return Command::FAILURE;
    }
}
