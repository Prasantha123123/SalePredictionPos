<?php

namespace App\Services;

class ConversationManager
{
    /**
     * Clear session conversation memory.
     */
    public function clearMemory(): void
    {
        session()->forget('ai_chat_history');
    }

    /**
     * Retrieve conversation memory from session.
     */
    public function getHistory(): array
    {
        return session()->get('ai_chat_history', []);
    }

    /**
     * Add message to conversation memory.
     */
    public function appendHistory(string $role, string $content): void
    {
        $history = $this->getHistory();
        $history[] = ['role' => $role, 'content' => $content];
        
        // Limit history to last 15 messages to preserve tokens/session space
        if (count($history) > 15) {
            array_shift($history);
        }
        
        session()->put('ai_chat_history', $history);
    }
}
