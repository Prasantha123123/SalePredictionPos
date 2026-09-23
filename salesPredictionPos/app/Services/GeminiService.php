<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $fallbackModel = 'gemini-2.0-flash-lite';
    protected string $endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
    protected int $timeoutSeconds = 25;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key', env('GEMINI_API_KEY', ''));
        $this->model  = config('services.gemini.model', 'gemini-3.6-flash');
    }

    /**
     * Send chat query to Google Gemini API.
     */
    public function generateContent(string $systemPrompt, array $history, string $currentMessage): string
    {
        if (empty($this->apiKey)) {
            Log::warning('Google Gemini API Key is missing.');
            throw new \RuntimeException('Gemini API key is not configured.');
        }

        $payload = $this->buildPayload($systemPrompt, $history, $currentMessage);

        // Only gemini-3.6-flash is confirmed available with this API key.
        // 503 = temporary high demand — retry up to 3 times with a short delay.
        // gemma-4-26b-a4b-it confirmed working on production server (log: 12:16:23 SUCCESS)
        $models = [
            ['name' => $this->model,         'timeout' => 15],  // gemini-3.6-flash (primary)
            ['name' => 'gemma-4-26b-a4b-it', 'timeout' => 30],  // confirmed fallback!
        ];

        foreach ($models as $index => $modelConfig) {
            $modelName    = $modelConfig['name'];
            $modelTimeout = $modelConfig['timeout'];

            // Retry up to 3 attempts on 503 (high demand / transient)
            $attempts   = 0;
            $maxRetries = 3;
            $lastEx     = null;

            while ($attempts < $maxRetries) {
                $attempts++;
                try {
                    $result = $this->callApi($modelName, $payload, $modelTimeout);
                    if ($result !== null) {
                        return $result;
                    }
                } catch (\RuntimeException $e) {
                    $lastEx = $e;
                    // Retry only on transient 503 errors
                    if ($attempts < $maxRetries && str_contains($e->getMessage(), 'Service Unavailable')) {
                        Log::warning("Gemini '{$modelName}' 503 attempt {$attempts}/{$maxRetries}, retrying in 1s...");
                        sleep(1);
                        continue;
                    }
                    // Non-retriable error or max retries reached
                    break;
                }
            }

            if ($lastEx !== null) {
                $isLast = ($index === array_key_last($models));
                if (!$isLast) {
                    $nextModel = $models[$index + 1]['name'];
                    Log::warning("Gemini model '{$modelName}' failed after {$attempts} attempts: {$lastEx->getMessage()}. Trying '{$nextModel}'.");
                    continue;
                }
                throw $lastEx;
            }
        }

        throw new \RuntimeException('Gemini API is temporarily unavailable. Please try again in a moment.');
    }

    /**
     * Build the Gemini API request payload.
     */
    protected function buildPayload(string $systemPrompt, array $history, string $currentMessage): array
    {
        // Format history & current query into Gemini contents payload
        $contents = [];
        foreach ($history as $msg) {
            // Map role 'assistant' to Gemini 'model'
            $role = $msg['role'] === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [
                    ['text' => $msg['content']]
                ]
            ];
        }

        // Append current query
        $contents[] = [
            'role' => 'user',
            'parts' => [
                ['text' => $currentMessage]
            ]
        ];

        return [
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemPrompt]
                ]
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.3,
                'maxOutputTokens' => 512,
            ]
        ];
    }

    /**
     * Execute the HTTP call to Google Gemini API for a given model.
     * Uses native PHP curl to reliably enforce IPv4 and avoid Guzzle wrapper issues.
     */
    protected function callApi(string $model, array $payload, int $timeout = 10): ?string
    {
        $apiUrl = "{$this->endpointUrl}{$model}:generateContent?key={$this->apiKey}";
        $jsonPayload = json_encode($payload);

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $jsonPayload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => config('services.curl_ssl_verify', app()->isProduction()),
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);

        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            Log::error("Gemini API Connection Timeout: {$curlError} for {$apiUrl}");
            throw new \RuntimeException('Connection Timeout: The request took too long. Please verify your network status.');
        }

        try {
            $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            Log::error("Gemini API invalid JSON for model {$model}: {$body}");
            throw new \RuntimeException("Invalid response from Gemini API.");
        }

        if ($status >= 200 && $status < 300) {
            $reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if (! empty($reply)) {
                Log::info("Gemini AI response generated successfully using model: {$model}");
                return $reply;
            }
            Log::warning('Gemini API returned an empty candidate content payload.');
            throw new \RuntimeException('Gemini API returned empty text response.');
        }

        Log::error("Gemini API Request failed. Model: {$model}. Status: {$status}. Body: {$body}");

        $msg = match ($status) {
            401 => 'Unauthorized: Please verify your GEMINI_API_KEY is correct.',
            403 => 'Forbidden: Access blocked. Make sure your API key has the necessary Gemini permissions.',
            404 => "Model Not Found: The model '{$model}' is unavailable for your API key.",
            429 => 'Rate Limit Exceeded: You have hit the Gemini query quota. Please wait a moment and try again.',
            500, 503 => 'Service Unavailable: Google Gemini API is experiencing server difficulties. Please try again later.',
            default => "API Error ({$status}): I encountered difficulties communicating with Google Gemini."
        };

        throw new \RuntimeException($msg);
    }
}
