<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $apiVersion;
    protected string $endpointUrl;
    protected array $fallbackModels = [
        'gemini-2.0-flash',
        'gemini-3.6-flash',
        'gemini-2.5-flash',
    ];
    protected int $timeoutSeconds = 20;

    public function __construct()
    {
        $this->apiKey     = config('services.gemini.key', env('GEMINI_API_KEY', ''));
        $this->model      = config('services.gemini.model', env('GEMINI_MODEL', 'gemini-2.0-flash'));
        $this->apiVersion = config('services.gemini.api_version', env('GEMINI_API_VERSION', 'v1beta'));
        $this->endpointUrl = "https://generativelanguage.googleapis.com/{$this->apiVersion}/models/";
    }

    /**
     * Send chat query to Google Gemini API.
     */
    public function generateContent(string $systemPrompt, array $history, string $currentMessage): string
    {
        if (empty($this->apiKey)) {
            Log::warning('[GeminiService] Google Gemini API Key is missing.');
            throw new \RuntimeException('Gemini API key is not configured.');
        }

        $payload = $this->buildPayload($systemPrompt, $history, $currentMessage);

        // Build list of models to try: primary model first, followed by fallbacks
        $modelsToTry = array_values(array_unique(array_filter(
            array_merge([$this->model], $this->fallbackModels)
        )));

        $lastEx = null;

        foreach ($modelsToTry as $index => $modelName) {
            $attempts   = 0;
            $maxRetries = 2;

            while ($attempts < $maxRetries) {
                $attempts++;
                try {
                    $result = $this->callApi($modelName, $payload, $this->timeoutSeconds);
                    if ($result !== null) {
                        return self::sanitizeResponse($result);
                    }
                } catch (\RuntimeException $e) {
                    $lastEx = $e;

                    // Retry only on transient 503 errors
                    if ($attempts < $maxRetries && str_contains($e->getMessage(), 'Service Unavailable')) {
                        Log::warning("[GeminiService] Model '{$modelName}' 503 attempt {$attempts}/{$maxRetries}, retrying in 1s...");
                        sleep(1);
                        continue;
                    }

                    // On 404 Not Found (e.g. deprecated model name), immediately switch to next model
                    if (str_contains($e->getMessage(), 'Model Not Found') || str_contains($e->getMessage(), '404')) {
                        Log::warning("[GeminiService] Model '{$modelName}' not found (404). Trying next fallback model.");
                        break;
                    }

                    // Other non-retriable errors
                    break;
                }
            }

            if ($lastEx !== null && $index < count($modelsToTry) - 1) {
                $nextModel = $modelsToTry[$index + 1];
                Log::warning("[GeminiService] Model '{$modelName}' failed ({$lastEx->getMessage()}). Falling back to '{$nextModel}'.");
            }
        }

        throw $lastEx ?? new \RuntimeException('Gemini API is temporarily unavailable.');
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
                Log::info("[GeminiService] AI response generated successfully using model: {$model}");
                return self::sanitizeResponse($reply);
            }
            Log::warning('[GeminiService] API returned an empty candidate content payload.');
            throw new \RuntimeException('Gemini API returned empty text response.');
        }

        Log::error("[GeminiService] API Request failed. Model: {$model}. Status: {$status}. Body: {$body}");

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

    /**
     * Clean and sanitize LLM response:
     * - Strips <think>...</think> and <thought>...</thought> tags (DeepSeek-R1, reasoning models)
     * - Strips raw scratchpad / chain-of-thought traces (bullet deliberations)
     * - Trims excess whitespace and outer wrapping quotes
     */
    public static function sanitizeResponse(?string $text): string
    {
        if (empty($text)) {
            return '';
        }

        // 1. Strip <think>...</think> and <thought>...</thought> tags
        $cleaned = preg_replace('/<(think|thought)[^>]*>[\s\S]*?<\/\1>/i', '', $text);

        // 2. Handle unmatched opening <think> tags (if output was truncated while thinking)
        $cleaned = preg_replace('/<(think|thought)[^>]*>[\s\S]*$/i', '', $cleaned);

        // 3. Handle raw scratchpad / chain-of-thought traces
        if (preg_match('/(\*\s*(User says|Since the user|Wait,\s*the user|Role:|Constraints:|The user|The assistant)|reasoning:|^The user said|^The user is)/im', $cleaned)) {
            $lines = preg_split('/\r\n|\r|\n/', trim($cleaned));
            $cleanLines = [];

            for ($i = count($lines) - 1; $i >= 0; $i--) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;

                if (preg_match('/^[\*\-]?\s*"([^"]+)"(?:\s*(?:or|fits).*|$)/i', $line, $m)) {
                    $cleanLines[] = $m[1];
                    break;
                }

                if (preg_match('/^([\*\-]\s*)?(User says|Since the user|Wait,\s*the user|Role|User Identity|Goal|Constraints|The user|The assistant|Output ONLY|1-3 sentences|No reasoning|A simple|Maintain a|Offer assistance|Acknowledge)/i', $line)) {
                    continue;
                }

                $cleanLines[] = ltrim($line, "*- \t");
            }

            if (!empty($cleanLines)) {
                $cleaned = implode("\n", array_reverse($cleanLines));
            }
        }

        $cleaned = trim($cleaned);

        if (str_starts_with($cleaned, '"') && str_ends_with($cleaned, '"') && substr_count($cleaned, '"') === 2) {
            $cleaned = trim($cleaned, '"');
        }

        return $cleaned;
    }
}
