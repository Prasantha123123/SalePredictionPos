<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class GroqService
{
    protected string $apiKey;
    protected string $model = 'llama-3.3-70b-versatile';
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

        $payload = json_encode([
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.5,
            'max_tokens'  => 1000,
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
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT        => $this->timeoutSeconds,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);

        $body     = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            Log::error("Groq API Connection Error: {$curlError}");
            throw new \RuntimeException('Groq Connection Timeout: Please verify your network status.');
        }

        $data = json_decode($body, true);

        if ($status >= 200 && $status < 300) {
            $reply = $data['choices'][0]['message']['content'] ?? null;
            if (! empty($reply)) {
                Log::info("Groq AI response generated successfully using model: {$this->model}");
                return trim($reply);
            }
            throw new \RuntimeException('Groq API returned an empty response.');
        }

        $errMsg = $data['error']['message'] ?? "HTTP {$status}";
        Log::error("Groq API Request failed. Status: {$status}. Error: {$errMsg}");

        $msg = match ($status) {
            401 => 'Groq Unauthorized: Please verify your GROQ_API_KEY is correct.',
            429 => 'Groq Rate Limit: You have hit the Groq query quota. Please wait a moment.',
            500, 503 => 'Groq Service Unavailable: Please try again later.',
            default => "Groq API Error ({$status}): {$errMsg}",
        };

        throw new \RuntimeException($msg);
    }
}
