<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService,
    ) {}

    public function __invoke(): Response
    {
        return Inertia::render('dashboard', [
            'kpi' => $this->dashboardService->getKpiData(),
            'salesTrend' => $this->dashboardService->getSalesTrend(30),
            'topProducts' => $this->dashboardService->getTopProducts(5),
            'categoryDistribution' => $this->dashboardService->getCategoryDistribution(30),
            'predictions' => $this->dashboardService->getPredictions(7),
        ]);
    }
}
