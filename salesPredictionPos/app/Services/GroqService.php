<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class GroqService
{
    protected string $apiKey;
    protected string $model;
    protected array $fallbackModels = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'deepseek-r1-distill-llama-70b',
        'llama-3.3-70b-versatile',
    ];
    protected string $endpointUrl = 'https://api.groq.com/openai/v1/chat/completions';
    protected int $timeoutSeconds = 15;

    public function __construct()
    {
        $this->apiKey = config('services.groq.key', env('GROQ_API_KEY', ''));
        $this->model  = config('services.groq.model', env('GROQ_MODEL', 'qwen/qwen3.8-27b'));
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
        $modelsToTry = array_values(array_unique(array_filter(
            array_merge([$this->model], $this->fallbackModels)
        )));
        $lastError   = null;

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
                Log::warning("[GroqService] Model '{$modelName}' curl error: {$curlError}");
                $lastError = 'Groq Connection Timeout: Please verify your network status.';
                continue;
            }

            $data = json_decode($body, true);

            if ($status >= 200 && $status < 300) {
                $reply = $data['choices'][0]['message']['content'] ?? null;
                if (! empty($reply)) {
                    Log::info("[GroqService] AI response generated successfully using model: {$modelName}");
                    return self::sanitizeResponse($reply);
                }
                $lastError = 'Groq API returned an empty response.';
                continue;
            }

            $errMsg = $data['error']['message'] ?? "HTTP {$status}";

            // 404 / decommissioned / not found — try next model silently
            if ($status === 404 || str_contains($errMsg, 'decommissioned') || str_contains($errMsg, 'does not exist')) {
                Log::warning("[GroqService] Model '{$modelName}' not available, trying next: {$errMsg}");
                $lastError = $errMsg;
                continue;
            }

            // Hard errors — log and try next if available
            Log::error("[GroqService] Request failed. Status: {$status}. Model: {$modelName}. Error: {$errMsg}");
            $lastError = $errMsg;
        }

        // All models exhausted
        throw new \RuntimeException('All Groq models are unavailable. Last error: ' . ($lastError ?? 'unknown'));
    }

    /**
     * Clean and sanitize LLM response:
     * - Strips <think>...</think> and <thought>...</thought> tags (DeepSeek-R1, reasoning models)
     * - Strips raw scratchpad / chain-of-thought traces
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
