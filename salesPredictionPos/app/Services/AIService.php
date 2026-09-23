<?php

namespace App\Services;

use App\Services\AIAssistantService;
use App\Services\ConversationManager;
use App\Services\ContextBuilder;
use App\Services\PromptBuilder;
use App\Services\RecommendationService;
use App\Services\GeminiService;
use App\Services\GroqService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AIService
{
    public function __construct(
        protected ConversationManager $conversationManager,
        protected ContextBuilder $contextBuilder,
        protected PromptBuilder $promptBuilder,
        protected RecommendationService $recommendationService,
        protected GeminiService $geminiService,
        protected GroqService $groqService,
        protected AIAssistantService $aiAssistantService
    ) {}

    /**
     * Clear session conversation memory.
     */
    public function clearMemory(): void
    {
        $this->conversationManager->clearMemory();
    }

    /**
     * Retrieve conversation memory from session.
     */
    public function getHistory(): array
    {
        return $this->conversationManager->getHistory();
    }

    /**
     * Execute chat query.
     */
    public function ask(string $message): string
    {
        $user = Auth::user();
        if (! $user) {
            return "You must be authenticated to chat with the AI Assistant.";
        }

        // Determine user roles and permissions
        $roles = $user->getRoleNames()->toArray();
        $primaryRole = ! empty($roles) ? $roles[0] : 'Cashier';

        // Check if cached answer exists
        // Cache key includes role so different roles don't share cached responses
        $cacheKey = 'ai_query_' . md5($primaryRole . '_' . strtolower(trim($message)));
        if (cache()->has($cacheKey)) {
            $cachedResponse = cache()->get($cacheKey);
            $this->conversationManager->appendHistory('user', $message);
            $this->conversationManager->appendHistory('assistant', '[cached] ' . $cachedResponse);
            Log::info("AIService: Cache hit for role={$primaryRole}, key={$cacheKey}");
            return $cachedResponse;
        }

        // Per-user rate limit: max 10 AI requests per minute per user (prevents API abuse in production)
        $rateLimitKey = 'ai_rate_' . $user->id . '_' . date('YmdHi');
        $requestCount = (int) cache()->get($rateLimitKey, 0);
        if ($requestCount >= 10) {
            return "⚠️ **Rate Limit Reached**: You have sent too many requests in the past minute. Please wait a moment before trying again.";
        }
        cache()->put($rateLimitKey, $requestCount + 1, now()->addMinutes(1));

        try {
            // 1. Context Construction
            $context = $this->contextBuilder->build($primaryRole);

            // 2. Detect intent and query database if needed
            $intentResult = $this->aiAssistantService->detectIntent($message);
            $intent = $intentResult['intent'];
            $subject = $intentResult['subject'] ?? null;
            $dataContext = null;
            $isDataQuery = ($intent !== 'general');

            if ($isDataQuery) {
                $queryData = $this->aiAssistantService->queryDatabase($intent, $subject);
                if ($queryData !== null) {
                    $dataContext = $this->aiAssistantService->formatDataContext($intent, $queryData);
                }
            }

            // 3. System Prompt construction
            $systemPrompt = $this->promptBuilder->build($primaryRole, $user->name, $context, $dataContext);

            // 4. Relevant context slice injection into user query
            $relevantContext = $dataContext ?: $context;
            $userQueryWithContext = "Context:\n" . trim($relevantContext) . "\n\nQuestion: " . $message;

            // 5. Dispatch to AI Services (Gemini Primary -> Groq Fallback -> Offline Mock)
            $history = $this->conversationManager->getHistory();
            $reply = null;
            $providerUsed = null;
            $lastError = null;

            // Step 1: Attempt Gemini as Primary Provider
            $geminiKey = config('services.gemini.key', env('GEMINI_API_KEY', ''));
            if (! empty($geminiKey)) {
                try {
                    Log::info('[AIService] Attempting primary provider: Gemini...');
                    $rawReply = $this->geminiService->generateContent($systemPrompt, $history, $userQueryWithContext);
                    $cleaned = self::sanitizeResponse($rawReply);
                    if (! empty($cleaned)) {
                        $reply = $cleaned;
                        $providerUsed = 'Gemini';
                        Log::info('[AIService] Responded successfully via Gemini. (Provider: Gemini)');
                    }
                } catch (\Exception $e) {
                    Log::warning("[AIService] Gemini provider failed: {$e->getMessage()}. Falling back to Groq...");
                    $lastError = 'Gemini: ' . $e->getMessage();
                }
            } else {
                Log::info('[AIService] Gemini API key not configured. Proceeding to Groq fallback.');
            }

            // Step 2: Attempt Groq as Fallback Provider (or Primary if Gemini not configured)
            if ($reply === null && $this->groqService->isConfigured()) {
                try {
                    Log::info('[AIService] Attempting fallback provider: Groq...');
                    $rawReply = $this->groqService->generateContent($systemPrompt, $history, $userQueryWithContext);
                    $cleaned = self::sanitizeResponse($rawReply);
                    if (! empty($cleaned)) {
                        $reply = $cleaned;
                        $providerUsed = 'Groq';
                        Log::info('[AIService] Responded successfully via Groq fallback. (Provider: Groq)');
                    }
                } catch (\Exception $e) {
                    Log::error("[AIService] Groq provider failed: {$e->getMessage()}");
                    $lastError = ($lastError ? $lastError . ' | ' : '') . 'Groq: ' . $e->getMessage();
                }
            }

            // Step 3: Fallback to offline rule-based mock response if both failed or no keys configured
            if ($reply === null) {
                Log::error("[AIService] Both Gemini and Groq failed. Falling back to offline mode. Last error: " . ($lastError ?? 'unknown'));
                $reply = $this->mockAiFallback($message, $primaryRole, $context, $lastError, $dataContext);
            }
        } catch (\Exception $e) {
            Log::error('[AIService] Context building / processing error: ' . $e->getMessage());
            $reply = $this->mockAiFallback($message, $primaryRole, '', $e->getMessage());
        }

        // Final sanitation check on reply before caching and returning
        $reply = self::sanitizeResponse($reply);

        // Save conversation context
        $this->conversationManager->appendHistory('user', $message);
        $this->conversationManager->appendHistory('assistant', $reply);

        // Cache: 15 min for live data queries (freshness), 60 min for general/static answers
        // This dramatically reduces API calls in production without stale data issues
        $cacheTtl = ($isDataQuery ?? false) ? 15 : 60;
        cache()->put($cacheKey, $reply, now()->addMinutes($cacheTtl));

        return $reply;
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

        // 3. Handle raw scratchpad / chain-of-thought traces (e.g. "* User says...", "* Since the user...")
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

    /**
     * Rule-based fallback bot when Gemini API is not configured.
     */
    protected function mockAiFallback(string $message, string $role, string $context, ?string $apiError = null, ?string $dataContext = null): string
    {
        // If we have live database data, return it directly even in fallback mode
        if ($dataContext !== null && $dataContext !== '') {
            return "📊 **Live Database Results**\n\n" . $dataContext
                . "\n\n---\n*Data retrieved from your live POS database. AI formatting is unavailable — showing raw results.*";
        }

        $msgLower = strtolower($message);

        // System owner recognition
        if (str_contains($msgLower, 'prasantha')) {
            return "Prasantha is the system administrator and owner of Vibe Arc Cafe.";
        }

        // API Key instructions for Admins
        if (str_contains($msgLower, 'key') || str_contains($msgLower, 'gemini') || str_contains($msgLower, 'setup')) {
            return "### 🔑 How to Setup Google Gemini AI Assistant\nTo enable the live generative AI assistant, please follow these steps:\n1. Open your workspace project's `.env` file.\n2. Add your Google Gemini API key:\n   ```env\n   GEMINI_API_KEY=your-api-key-here\n   ```\n3. Restart your Laravel server (`php artisan serve`).\n\nOnce configured, the AI will dynamically review database charts, compile explanations, and provide predictive reorder recommendations using Google Gemini 2.5 Flash!";
        }

        // Reports and charts search trigger
        if (str_contains($msgLower, 'report') || str_contains($msgLower, 'analytics') || str_contains($msgLower, 'chart') || str_contains($msgLower, 'graph')) {
            if ($role === 'Cashier') {
                return "I'm sorry, cashiers do not have permission to view store reports.";
            }
            return "### 📊 Analytics & Reports Guide\nYou can access detailed performance reports in the **Analytics Reports** sidebar menu:\n- **Daily Sales Report**: Day-to-day revenue tracking.\n- **Product Sales Report**: Best-selling items and SKU counts.\n- **Category Sales Report**: Performance by department.\n- **Inventory Report**: Expiry logs and stock valuations.\n- **Profit Report**: Net margins and operating expenses.";
        }

        // Predictions & Forecasting trigger
        if (str_contains($msgLower, 'prediction') || str_contains($msgLower, 'forecast') || str_contains($msgLower, 'xgboost') || str_contains($msgLower, 'rmse')) {
            if ($role === 'Cashier' || $role === 'Inventory Staff') {
                return "I'm sorry, predictions and AI forecasts are restricted to Manager and Admin roles.";
            }
            return "### 🤖 Sales predictions & XGBoost\nPredictions are calculated by comparing three models: XGBoost, Random Forest, and Linear Regression. The system auto-selects the best model by testing Mean Absolute Percentage Error (MAPE). You can retrain models in the **AI Prediction** page.";
        }

        // User & Role management trigger
        if (str_contains($msgLower, 'user') || str_contains($msgLower, 'role') || str_contains($msgLower, 'team') || str_contains($msgLower, 'permission') || str_contains($msgLower, 'cashier') || str_contains($msgLower, 'admin')) {
            if ($role !== 'Admin' && $role !== 'Super Admin') {
                return "I'm sorry, user and role administration is restricted strictly to Admin users. Cashier and Manager roles cannot add or manage users.";
            }
            return "### 👥 User & Role Administration Guide\nTo add and manage staff accounts:\n1. Click on the **Team & Roles** option in the sidebar.\n2. Click the **Add User** button in the top right of the directory.\n3. Enter their name, email, password, and assign them a role (e.g. Admin, Manager, Cashier, or Inventory Staff).\n4. Save the user to activate their profile and permissions.";
        }

        // Expense tracking trigger
        if (str_contains($msgLower, 'expense') || str_contains($msgLower, 'expence')) {
            if ($role === 'Cashier' || $role === 'Inventory Staff') {
                return "I'm sorry, cashiers and inventory staff do not have permissions to view or register store expenses.";
            }
            return "### 💸 Managing Expenses Guide\nTo log and audit overhead expenses:\n1. Go to the **Expenses** section in the sidebar.\n2. Click the **Add Expense** button in the top right.\n3. Enter the expense description, select a Category (e.g. Rent, Utilities, Salaries), specify the amount, and select the date.\n4. Click **Save Expense** to register it.";
        }

        // Help guides
        if (str_contains($msgLower, 'product') && (str_contains($msgLower, 'create') || str_contains($msgLower, 'add'))) {
            return "### 📦 How to Create a Product\n1. Navigate to the **Products** section in the sidebar.\n2. Click the blue **Add Product** button in the top right.\n3. Enter the name, SKU, price, and select if it has an **Expiry Date**.\n4. Save the product. The system automatically creates an inventory tracker record.";
        }

        if (str_contains($msgLower, 'sale') || str_contains($msgLower, 'checkout') || str_contains($msgLower, 'pos') || str_contains($msgLower, 'bill') || str_contains($msgLower, 'invoice') || str_contains($msgLower, 'receipt')) {
            return "### 🛒 Smart POS Checkout Terminal Guide\n\n**What is the Smart POS?**\nThe **Smart POS** is your live checkout hub. It pulls catalog products dynamically, tracks barcode scans, deducts inventory batches using **FEFO (First-Expiring-First-Out)** logic, and posts transaction histories instantly to reports.\n\n**How to Make a POS Sale / Get a Bill:**\n1. Go to the **Smart POS** terminal in the sidebar.\n2. Click products in the catalogue grid to add them to your cart.\n3. Select a customer (optional) and discount code.\n4. Select your payment method (Cash, Card, or Digital) and click **Complete Sale** to complete the transaction and generate the bill.";
        }

        if (str_contains($msgLower, 'stock') || str_contains($msgLower, 'reorder') || str_contains($msgLower, 'low')) {
            if ($role === 'Cashier') {
                return "I'm sorry, cashier roles do not have permission to view low stock details. Please consult your manager.";
            }
            return "### ⚠️ Stock & Inventory Reorders\nAccording to the live database:\n- **Low stock alerts**: There are items requiring restock.\n- Go to **Inventory** in the sidebar to review the restock queue and manually adjust stock counts.";
        }

        if (str_contains($msgLower, 'expire') || str_contains($msgLower, 'expiry') || str_contains($msgLower, 'date')) {
            if ($role === 'Cashier') {
                return "I'm sorry, cashier roles do not have permission to view stock expiry status. Please consult your inventory staff.";
            }
            return "### ⏳ Stock Expirations\nDairy and Bakery products are tracked via **FEFO (First Expiring First Out)** logic. \n- Check the **Expiry & Waste Report** from the sidebar dropdown to see expired items and days remaining.";
        }

        // Generic welcome — show API error details if available
        if ($apiError) {
            return "👋 **Hello! I am your Smart POS Assistant.**\n\nI am currently running in **Offline Fallback Mode** because your configured `GEMINI_API_KEY` returned an error:\n> ⚠️ *{$apiError}*\n\nWhile this error persists, I can assist you with:\n- Operations guides (creating products, sales, suppliers)\n- Explaining forecast reports and accuracy metrics (MAPE/RMSE)\n- Reordering stock and tracking product expiry warnings";
        }

        return "👋 **Hello! I am your Smart POS Assistant.**\n\nI can assist you with:\n- Operations guides (creating products, sales, suppliers)\n- Explaining forecast reports and accuracy metrics (MAPE/RMSE)\n- Reordering stock and tracking product expiry warnings\n\n*Note: Add `GEMINI_API_KEY` to your `.env` file to unlock live conversation and customized analytics using Google Gemini 2.5 Flash!*";
    }
}
