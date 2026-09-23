<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class GroqService
{
    protected string $apiKey;
    // Active Groq models (as of 2025 — updated from deprecated llama-3.3-70b-versatile)
    protected string $model = 'llama-3.3-70b-versatile';
    protected array $fallbackModels = [
        'llama-3.1-8b-instant',
        'gemma2-9b-it',
        'mixtral-8x7b-32768',
    ];
    protected string $endpointUrl = 'https://api.groq.com/openai/v1/chat/completions';
    protected int $timeoutSeconds = 15;

    public function __construct()
    {
        $this->apiKey = config('services.groq.key', env('GROQ_API_KEY', ''));
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * Send chat query to Groq API (OpenAI-compatible format).
     */
    public function generateContent(string $systemPrompt, array $history, string $currentMessage): string
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('Groq API key is not configured.');
        }

        // Build OpenAI-format messages array
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        foreach ($history as $msg) {
            $messages[] = [
                'role'    => $msg['role'] === 'assistant' ? 'assistant' : 'user',
                'content' => $msg['content'],
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $currentMessage];

        // Try primary model first, then fallbacks in order
        $modelsToTry = array_merge([$this->model], $this->fallbackModels);
        $lastError    = null;

        foreach ($modelsToTry as $modelName) {
            $payload = json_encode([
                'model'       => $modelName,
                'messages'    => $messages,
                'temperature' => 0.3,
                'max_tokens'  => 512,
            ]);

            $ch = curl_init($this->endpointUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    "Authorization: Bearer {$this->apiKey}",
                ],
                CURLOPT_SSL_VERIFYPEER => config('services.curl_ssl_verify', app()->isProduction()),
                CURLOPT_TIMEOUT        => $this->timeoutSeconds,
                CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            ]);

            $body      = curl_exec($ch);
            $status    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                Log::warning("Groq model '{$modelName}' curl error: {$curlError}");
                $lastError = 'Groq Connection Timeout: Please verify your network status.';
                continue;
            }

            $data = json_decode($body, true);

            if ($status >= 200 && $status < 300) {
                $reply = $data['choices'][0]['message']['content'] ?? null;
                if (! empty($reply)) {
                    Log::info("Groq AI response generated successfully using model: {$modelName}");
                    return trim($reply);
                }
                $lastError = 'Groq API returned an empty response.';
                continue;
            }

            $errMsg = $data['error']['message'] ?? "HTTP {$status}";

            // 404 / decommissioned — try next model silently
            if ($status === 404 || str_contains($errMsg, 'decommissioned') || str_contains($errMsg, 'does not exist')) {
                Log::warning("Groq model '{$modelName}' not available, trying next: {$errMsg}");
                $lastError = $errMsg;
                continue;
            }

            // Hard errors — stop immediately
            Log::error("Groq API Request failed. Status: {$status}. Model: {$modelName}. Error: {$errMsg}");
            $msg = match ($status) {
                401 => 'Groq Unauthorized: Please verify your GROQ_API_KEY is correct.',
                429 => 'Groq Rate Limit: You have hit the Groq query quota. Please wait a moment.',
                500, 503 => 'Groq Service Unavailable: Please try again later.',
                default   => "Groq API Error ({$status}): {$errMsg}",
            };
            throw new \RuntimeException($msg);
        }

        // All models exhausted
        throw new \RuntimeException('All Groq models are unavailable. Last error: ' . ($lastError ?? 'unknown'));
    }
}
