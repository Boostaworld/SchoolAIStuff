import { GoogleGenAI } from '@google/genai';

const apiKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.API_KEY) ||
  '';

const genAI = new GoogleGenAI({ apiKey });

export interface ChallengeGenerationParams {
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  length_type: 'Sprint' | 'Medium' | 'Marathon';
  custom_prompt?: string;
}

export interface GeneratedChallenge {
  title: string;
  text_content: string;
  category: string;
  difficulty: string;
  length_type: string;
}

const LENGTH_GUIDELINES = {
  Sprint: '30-50 words (quick practice)',
  Medium: '80-150 words (standard challenge)',
  Marathon: '200-400 words (endurance test)'
};

const DIFFICULTY_GUIDELINES = {
  Easy: 'Simple vocabulary, common words, straightforward sentences',
  Medium: 'Mix of common and technical terms, moderate complexity',
  Hard: 'Complex vocabulary, technical jargon, special characters, code syntax'
};

const CATEGORY_EXAMPLES = {
  'Programming': 'Code snippets, function definitions, algorithms',
  'Technical': 'Technical documentation, system architecture, protocols',
  'Science': 'Scientific concepts, research findings, theories',
  'Business': 'Professional communication, reports, emails',
  'Creative': 'Stories, descriptions, creative writing',
  'Speed Training': 'Pangrams, word practice, quick drills',
  'Custom': 'User-specified content'
};

export async function generateTypingChallenge(params: ChallengeGenerationParams): Promise<GeneratedChallenge> {
  const lengthGuide = LENGTH_GUIDELINES[params.length_type];
  const difficultyGuide = DIFFICULTY_GUIDELINES[params.difficulty];
  const categoryExample = CATEGORY_EXAMPLES[params.category as keyof typeof CATEGORY_EXAMPLES] || params.category;

  const prompt = `You are a typing challenge generator for a typing speed training application called "Orbit OS".

Generate a typing challenge with these specifications:
- Category: ${params.category} (${categoryExample})
- Difficulty: ${params.difficulty} (${difficultyGuide})
- Length: ${params.length_type} (${lengthGuide})
${params.custom_prompt ? `- Custom Requirements: ${params.custom_prompt}` : ''}

IMPORTANT RULES:
1. Generate ONLY plain text content suitable for typing practice
2. For programming challenges, use realistic code with proper syntax
3. Avoid overly simple or repetitive content
4. Make it engaging and educational
5. Ensure accurate spelling and grammar
6. Include variety in sentence structure and vocabulary
7. For Sprint challenges, focus on commonly mistyped words or patterns
8. For Hard difficulty, include special characters, numbers, and technical terms

Return your response in this EXACT JSON format (no markdown, no code blocks):
{
  "title": "Challenge title (creative and descriptive)",
  "text_content": "The actual text content for typing (plain text only, no formatting)",
  "category": "${params.category}",
  "difficulty": "${params.difficulty}",
  "length_type": "${params.length_type}"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Clean up response (remove markdown code blocks if present)
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const generated = JSON.parse(cleanText);

    // Validate structure
    if (!generated.title || !generated.text_content) {
      throw new Error('Generated challenge missing required fields');
    }

    // Ensure word count is appropriate
    const wordCount = generated.text_content.split(/\s+/).length;
    const expectedRanges = {
      Sprint: [30, 50],
      Medium: [80, 150],
      Marathon: [200, 400]
    };

    const [min, max] = expectedRanges[params.length_type];
    if (wordCount < min * 0.8 || wordCount > max * 1.2) {
      console.warn(`Generated challenge word count (${wordCount}) outside expected range [${min}, ${max}]`);
    }

    return {
      title: generated.title,
      text_content: generated.text_content,
      category: params.category,
      difficulty: params.difficulty,
      length_type: params.length_type
    };
  } catch (error) {
    console.error('Challenge generation error:', error);
    throw new Error(`Failed to generate challenge: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Batch generate multiple challenges
export async function generateMultipleChallenges(
  params: ChallengeGenerationParams,
  count: number = 3
): Promise<GeneratedChallenge[]> {
  const promises = Array(count).fill(null).map(() => generateTypingChallenge(params));
  return Promise.all(promises);
}

// Generate personalized challenge based on user's weak keys
export async function generatePersonalizedChallenge(
  weakKeys: string[],
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
): Promise<GeneratedChallenge> {
  const prompt = `Generate a typing challenge that focuses on improving accuracy for these commonly mistyped keys: ${weakKeys.join(', ')}

Requirements:
- Create sentences that naturally incorporate these keys multiple times
- Difficulty: ${difficulty}
- Length: 80-120 words (Medium)
- Make it readable and engaging, not forced
- Use real words and proper grammar

Return JSON format:
{
  "title": "Personalized Training: [Focus Area]",
  "text_content": "The typing practice text",
  "category": "Personalized",
  "difficulty": "${difficulty}",
  "length_type": "Medium"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const text = (response.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().replace(/```json\n?/, '').replace(/\n?```$/, '');
    const generated = JSON.parse(text);

    return {
      title: generated.title,
      text_content: generated.text_content,
      category: 'Personalized',
      difficulty,
      length_type: 'Medium'
    };
  } catch (error) {
    console.error('Personalized challenge generation error:', error);
    throw error;
  }
}
