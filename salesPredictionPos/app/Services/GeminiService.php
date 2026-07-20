<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $fallbackModel = 'gemini-2.0-flash';
    protected string $endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
    protected int $timeoutSeconds = 30;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key', env('GEMINI_API_KEY', ''));
        $this->model = config('services.gemini.model', 'gemini-3.5-flash');
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

        // Try primary model, then fallback model on 404
        $models = [$this->model, $this->fallbackModel];

        foreach ($models as $model) {
            try {
                $result = $this->callApi($model, $payload);
                if ($result !== null) {
                    return $result;
                }
            } catch (\RuntimeException $e) {
                // If it's a 404 (model unavailable), try next model
                if (str_contains($e->getMessage(), 'Model Not Found') && $model !== end($models)) {
                    Log::warning("Gemini model '{$model}' unavailable, trying fallback '{$this->fallbackModel}'.");
                    continue;
                }
                throw $e;
            }
        }

        throw new \RuntimeException('All Gemini models failed to generate a response.');
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
                'temperature' => 0.5,
                'maxOutputTokens' => 1000,
            ]
        ];
    }

    /**
     * Execute the HTTP call to Google Gemini API for a given model.
     */
    protected function callApi(string $model, array $payload): ?string
    {
        $apiUrl = "{$this->endpointUrl}{$model}:generateContent?key={$this->apiKey}";

        try {
            $response = Http::timeout($this->timeoutSeconds)
                ->withOptions(['verify' => false])
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($apiUrl, $payload);

            if ($response->successful()) {
                $reply = $response->json('candidates.0.content.parts.0.text');
                if (! empty($reply)) {
                    Log::info("Gemini AI response generated successfully using model: {$model}");
                    return $reply;
                }
                Log::warning('Gemini API returned an empty candidate content payload.');
                throw new \RuntimeException('Gemini API returned empty text response.');
            }

            $status = $response->status();
            $body = $response->body();
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

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Gemini API Connection Timeout: ' . $e->getMessage());
            throw new \RuntimeException('Connection Timeout: The request took too long. Please verify your network status.', 0, $e);
        }
    }
}
