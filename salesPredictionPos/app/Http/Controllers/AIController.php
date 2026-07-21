<?php

namespace App\Http\Controllers;

use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    /**
     * Handle user chat query.
     */
    public function chat(Request $request): JsonResponse
    {
        // Extend execution time: fallback chain (gemma as last resort) can take up to 50s
        set_time_limit(60);

        try {
            $validated = $request->validate([
                'message' => 'required|string|max:1000',
            ]);

            $reply = $this->aiService->ask($validated['message']);

            return response()->json([
                'status' => 'success',
                'reply' => $reply,
                'history' => $this->aiService->getHistory(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'reply' => 'Invalid message. Please enter a valid message (max 1000 characters).',
                'history' => $this->aiService->getHistory(),
            ], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AIController chat error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'reply' => 'An unexpected error occurred. Please try again.',
                'history' => $this->aiService->getHistory(),
            ], 500);
        }
    }

    /**
     * Get chat conversation history.
     */
    public function history(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'history' => $this->aiService->getHistory(),
        ]);
    }

    /**
     * Clear current chat conversation history.
     */
    public function clear(): JsonResponse
    {
        $this->aiService->clearMemory();
        return response()->json([
            'status' => 'success',
            'message' => 'Chat history cleared successfully.',
            'history' => [],
        ]);
    }
}
