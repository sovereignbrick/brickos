# Dr. Alex AI Assistant

Dr. Alex is Sovereign Health's built-in AI health assistant. It provides contextual guidance based on your actual health data, not generic advice.

## How It Works

When you open a Dr. Alex conversation, the system provides the AI with relevant context from your health profile: recent measurements, trends, active medications, supplements, and your protocol. Dr. Alex can reference your data to give specific, personalized responses.

Your personal information (name, email) is never sent to the AI provider. Only anonymized health data is included in the context.

## 6 Specialist Modes

Each mode focuses the conversation on a specific area of health:

### General Health
Broad health questions and overall wellness guidance. Use this mode when your question does not fit neatly into another category.

### Trends Analysis
Discussion of your measurement trends over time. Dr. Alex can identify patterns, compare phases, and highlight markers that are improving or declining.

### Lab Interpretation
Help understanding lab results. Paste your lab values or ask about specific markers. Dr. Alex explains what the numbers mean in the context of your history and protocol.

### Diet & Nutrition
Dietary recommendations based on your markers. Dr. Alex can suggest foods that may help specific markers and flag dietary patterns that could be affecting your results.

### Supplements
Supplement recommendations with dosage guidance. Dr. Alex considers your current medications to flag potential interactions and suggests evidence-based options for markers outside optimal range.

### Protocols
Guidance on fasting protocols, ketogenic diets, and carnivore approaches. Dr. Alex explains how different protocols affect specific markers and can help you choose a protocol based on your health goals.

## Starting a Conversation

1. Click "Dr. Alex" in the navigation
2. Select a specialist mode
3. Type your question or concern
4. Dr. Alex responds with context-aware guidance

Conversations are stored in your account and can be revisited. Each conversation belongs to a single specialist mode.

## Quota System (SaaS)

In SaaS mode, Dr. Alex conversations are limited by your license tier:

| Tier | Chats per Month |
|------|-----------------|
| Glimpse (free) | 5 |
| Focus | 25 |
| Insight | 100 |
| Clarity | 500 |
| Horizon | Unlimited |

A "chat" counts as one conversation thread, not individual messages. You can send multiple messages within a conversation without using additional quota.

## Bring Your Own Key (OSS)

In self-hosted mode (`SHI_MODE=oss`), Dr. Alex uses your own OpenAI-compatible API key. Set `OPENAI_API_KEY` in your `.env` file. There are no conversation quotas in OSS mode.

Any OpenAI-compatible API endpoint works, including local models served through tools like Ollama with an OpenAI-compatible proxy.

## Important Notes

- Dr. Alex is not a doctor. Its responses are informational, not medical advice.
- Consult a healthcare professional before making changes to medications, supplements, or treatment plans.
- Dr. Alex does not have access to your name, email, or other personally identifying information.
