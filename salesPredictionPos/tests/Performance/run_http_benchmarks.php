<?php

require __DIR__ . '/../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Http;

echo "=== Running HTTP Endpoint Response Benchmarks (Local Server) ===\n";

$baseUrl = 'http://127.0.0.1:8000';

function measureUrl(string $name, callable $requestFn, int $iterations = 10): array
{
    $times = [];
    $success = 0;
    $fail = 0;

    for ($i = 0; $i < $iterations; $i++) {
        $t0 = microtime(true);
        try {
            $status = $requestFn();
            $elapsed = (microtime(true) - $t0) * 1000;
            if ($status >= 200 && $status < 400) {
                $times[] = $elapsed;
                $success++;
            } else {
                $fail++;
            }
        } catch (\Throwable $e) {
            $fail++;
        }
    }

    sort($times);
    $count = count($times);
    $min = $count ? min($times) : 0;
    $max = $count ? max($times) : 0;
    $avg = $count ? array_sum($times) / $count : 0;
    $mid = (int) floor($count / 2);
    $median = $count ? (($count % 2 === 0) ? ($times[$mid - 1] + $times[$mid]) / 2 : $times[$mid]) : 0;
    $p95Index = (int) ceil(0.95 * $count) - 1;
    $p95 = $count ? $times[max(0, min($p95Index, $count - 1))] : 0;

    return [
        'name' => $name,
        'stats' => [
            'min' => round($min, 2),
            'max' => round($max, 2),
            'avg' => round($avg, 2),
            'median' => round($median, 2),
            'p95' => round($p95, 2),
            'count' => $count,
        ],
        'success' => $success,
        'failed' => $fail,
    ];
}

$httpResults = [];

// 1. Login page render
$httpResults['login_page'] = measureUrl('GET /login (Auth page render)', function () use ($baseUrl) {
    $res = Http::timeout(5)->get("{$baseUrl}/login");
    return $res->status();
}, 10);

// 2. Home redirect
$httpResults['home_redirect'] = measureUrl('GET / (Root redirect to login)', function () use ($baseUrl) {
    $res = Http::withoutRedirecting()->timeout(5)->get("{$baseUrl}/");
    return $res->status();
}, 10);

echo "\n=== HTTP BENCHMARK RESULTS ===\n";
printf("%-40s | %8s | %8s | %8s | %8s | %8s | %5s\n", "Endpoint", "Min(ms)", "Avg(ms)", "Med(ms)", "P95(ms)", "Max(ms)", "Count");
echo str_repeat('-', 93) . "\n";

foreach ($httpResults as $item) {
    $s = $item['stats'];
    printf(
        "%-40s | %8.2f | %8.2f | %8.2f | %8.2f | %8.2f | %5d\n",
        substr($item['name'], 0, 40),
        $s['min'],
        $s['avg'],
        $s['median'],
        $s['p95'],
        $s['max'],
        $s['count']
    );
}

// Append to performance_benchmark_results.json
$perfFile = __DIR__ . '/performance_benchmark_results.json';
if (file_exists($perfFile)) {
    $existing = json_decode(file_get_contents($perfFile), true);
    $existing['benchmarks'] = array_merge($existing['benchmarks'], $httpResults);
    file_put_contents($perfFile, json_encode($existing, JSON_PRETTY_PRINT));
}

echo "\nUpdated benchmarks written to performance_benchmark_results.json\n";
