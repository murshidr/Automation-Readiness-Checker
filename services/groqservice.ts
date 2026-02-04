/// <reference types="vite/client" />
import type { TaskInput, CriteriaScores, ToolSuggestion } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getApiKey(): string | null {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export interface AIEnhancement {
    reasoning: string;
    automationAdvice: string;
    suggestedTools: ToolSuggestion[];
}

/**
 * Call Groq AI to generate reasoning and tool suggestions for a task.
 */
export async function enhanceWithGroq(
    task: TaskInput,
    criteria: CriteriaScores,
    finalScore: number,
    category: string
): Promise<AIEnhancement | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('No Groq API key found');
        return null;
    }

    const prompt = `You are an automation consultant. Analyze this task and provide a JSON response.

Task Details:
- Name: ${task.name}
- Description: ${task.description}
- Department: ${task.department}
- Frequency: ${task.frequency}
- Data Inputs: ${task.inputs.join(', ') || 'none'}
- Data Outputs: ${task.outputs.join(', ') || 'none'}
- Automation Score: ${finalScore}/100
- Category: ${category}
- Criteria Scores:
  * Frequency: ${criteria.frequency}
  * Repetitiveness: ${criteria.repetitiveness}
  * Data Dependency: ${criteria.dataDependency}
  * Decision Variability: ${criteria.decisionVariability}
  * Complexity: ${criteria.complexity}

Provide your analysis in this exact JSON format:
{
  "reasoning": "1-2 sentence explanation of why this task is/isn't suitable for automation",
  "automationAdvice": "2-3 sentence step-by-step guide on how to automate this using AI or other tools",
  "suggestedTools": [
    {
      "category": "tool category",
      "name": "specific tool name",
      "explanation": "one sentence explaining how this tool helps"
    }
  ]
}

Respond ONLY with valid JSON, no markdown formatting.`;

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Fast and smart model
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert automation consultant. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1024,
                response_format: { type: 'json_object' } // Forces JSON response
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Groq API Error: ${res.status} ${res.statusText}`, errorText);
            return null;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            console.error('No content in Groq response');
            return null;
        }

        // Parse the JSON response
        const parsed = JSON.parse(content) as {
            reasoning?: string;
            automationAdvice?: string;
            suggestedTools?: Array<{
                category?: string;
                name?: string;
                explanation?: string;
            }>;
        };

        // Validate and format the response
        const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
        const automationAdvice = typeof parsed.automationAdvice === 'string'
            ? parsed.automationAdvice
            : 'No specific advice generated.';

        const suggestedTools: ToolSuggestion[] = Array.isArray(parsed.suggestedTools)
            ? parsed.suggestedTools
                .filter(t => t && typeof t.category === 'string' && typeof t.name === 'string')
                .map(t => ({
                    category: String(t.category),
                    name: String(t.name),
                    explanation: typeof t.explanation === 'string' ? t.explanation : ''
                }))
            : [];

        return { reasoning, automationAdvice, suggestedTools };

    } catch (error) {
        console.error('Groq API Error:', error);
        return null;
    }
}