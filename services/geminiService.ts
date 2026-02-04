/// <reference types="vite/client" />
import type { TaskInput, CriteriaScores, ToolSuggestion } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getApiKey(): string | null {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export interface GeminiEnhancement {
  reasoning: string;
  automationAdvice: string;
  suggestedTools: ToolSuggestion[];
}

/**
 * Call Gemini to generate reasoning and tool suggestions for a task.
 * Returns null if no API key or on error (caller should use rule-based defaults).
 */
export async function enhanceWithGemini(
  task: TaskInput,
  criteria: CriteriaScores,
  finalScore: number,
  category: string
): Promise<GeminiEnhancement | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const prompt = `You are an automation consultant. For this task, provide:
1. A short 1-2 sentence "reasoning" explaining why this task is or isn't suitable for automation (score ${finalScore}, category: ${category}).
2. A "suggestedTools" array of 1-3 tools. Each has: "category" (string), "name" (string), "explanation" (one short sentence).
3. A "automationAdvice" section with a paragraph of step-by-step instructions (max 3 sentences) on how to automate this specific task using the Gemini API or other tools.

Task: ${task.name}
Description: ${task.description}
Department: ${task.department}
Frequency: ${task.frequency}
Data inputs: ${task.inputs.join(', ') || 'none'}
Data outputs: ${task.outputs.join(', ') || 'none'}
Criteria scores: frequency=${criteria.frequency}, repetitiveness=${criteria.repetitiveness}, dataDependency=${criteria.dataDependency}, decisionVariability=${criteria.decisionVariability}, complexity=${criteria.complexity}

Respond with ONLY a valid JSON object: { "reasoning": "...", "automationAdvice": "...", "suggestedTools": [ { "category": "...", "name": "...", "explanation": "..." } ] }`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
      })
    });

    if (res.status === 429) {
      console.warn('Gemini API Rate Limit Exceeded (429)');
      return {
        reasoning: "AI service is currently busy (Rate Limit). Please try again in a minute.",
        automationAdvice: "Could not generate advice due to high traffic.",
        suggestedTools: []
      };
    }

    if (!res.ok) {
      console.error(`Gemini API Error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const json = text.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(json) as { reasoning?: string; automationAdvice?: string; suggestedTools?: Array<{ category?: string; name?: string; explanation?: string }> };
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
    const automationAdvice = typeof parsed.automationAdvice === 'string' ? parsed.automationAdvice : 'No specific advice generated.';
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
    console.error('Gemini API Error:', error);
    return null;
  }
}
