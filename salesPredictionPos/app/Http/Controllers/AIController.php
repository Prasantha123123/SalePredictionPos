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
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $reply = $this->aiService->ask($validated['message']);
        
        return response()->json([
            'status' => 'success',
            'reply' => $reply,
            'history' => $this->aiService->getHistory(),
        ]);
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
