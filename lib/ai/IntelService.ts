import { supabase } from '../supabase';
import { runIntelQuery, IntelResult } from './intel';

export interface IntelChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
  result?: IntelResult;
  meta?: {
    model_used?: string;
    depth_level?: number;
    research_mode?: boolean;
  };
}

export interface IntelQueryOptions {
  prompt: string;
  userId: string;
  modelUsed?: 'flash' | 'pro' | 'orbit-x' | 'gemini-3-pro' | 'gemini-3-image';
  depthLevel?: number;
  researchMode?: boolean;
  customInstructions?: string;
  profileInstructions?: string;
  canCustomize?: boolean;
  unlockedModels?: string[];
  conversationHistory?: Array<{ role: 'user' | 'model'; text: string }>;
  conversationMode?: boolean; // If true, simple chat instead of research
  thinkingEnabled?: boolean; // If true, enables thinking mode
  thinkingLevel?: 'low' | 'medium' | 'high'; // Thinking depth level
  mode?: 'chat' | 'image' | 'generation'; // Interaction mode
  image?: string; // Base64 encoded image data
  imageResolution?: '1K' | '2K' | '3K' | '4K'; // Resolution for generated images
}

const buildInstructions = (
  depthLevel: number,
  researchMode: boolean,
  custom?: string,
  profile?: string
) => {
  const trimmedCustom = custom?.trim();
  const trimmedProfile = profile?.trim();

  let base = trimmedCustom || trimmedProfile;

  // Define depth-specific requirements
  const bulletCount = depthLevel <= 3 ? '3-5' : depthLevel <= 6 ? '5-8' : '7-12';
  const sourceCount = depthLevel <= 3 ? '2-4' : depthLevel <= 6 ? '4-6' : '6-10';
  const conceptCount = depthLevel <= 3 ? '3-5' : depthLevel <= 6 ? '5-7' : '7-10';
  const includeEssay = depthLevel > 3;

  if (!base) {
    if (depthLevel <= 3) {
      base = 'Provide a concise, easy-to-understand summary with key bullet points. Keep it brief and accessible.';
    } else if (depthLevel <= 6) {
      base = 'Provide comprehensive academic-level analysis with proper citations, detailed explanations, and an in-depth essay exploring the topic thoroughly.';
    } else {
      base = 'Perform PhD-level deep analysis with extensive research, comprehensive citations, nuanced exploration of the topic, and a detailed multi-paragraph essay that covers the subject exhaustively.';
    }
  }

  if (researchMode) {
    base += ' Prioritize accuracy, cite credible sources, and provide detailed research-quality output.';
  }

  // Append JSON schema for structured output (works with responseMimeType: 'application/json')
  base += '\n\nProvide your response as a JSON object with these fields:';
  base += `\n- summary_bullets: array of ${bulletCount} key points. Format each as "Point 1: [description]", "Point 2: [description]", etc.`;
  base += `\n- sources: array of ${sourceCount} objects with title, url, and snippet (include more sources for deeper research)`;
  base += `\n- related_concepts: array of ${conceptCount} related topics for further exploration`;

  if (includeEssay) {
    base += `\n- essay: REQUIRED detailed essay (${depthLevel <= 6 ? '2-4 paragraphs' : '4-8 paragraphs'}) providing comprehensive analysis, context, and insights beyond the bullet points`;
  } else {
    base += '\n- essay: optional (can be omitted for quick summaries)';
  }

  return base;
};

const parseIntelResult = (response: any): IntelResult | undefined => {
  if (!response) return undefined;

  let parsed: any;
  if (typeof response === 'string') {
    try {
      parsed = JSON.parse(response);
    } catch (e) {
      console.warn('Intel history parse warning:', e);
      return undefined;
    }
  } else {
    parsed = response;
  }

  // Validate and ensure all required fields exist
  return {
    summary_bullets: Array.isArray(parsed.summary_bullets) ? parsed.summary_bullets : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    related_concepts: Array.isArray(parsed.related_concepts) ? parsed.related_concepts : [],
    essay: parsed.essay || undefined
  };
};

export const fetchIntelHistory = async (userId: string): Promise<IntelChatMessage[]> => {
  const { data, error } = await supabase
    .from('intel_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load intel history:', error);
    return [];
  }

  return (data || []).flatMap((row: any) => {
    const result = parseIntelResult(row.response);
    const meta = {
      model_used: row.model_used,
      depth_level: row.depth_level,
      research_mode: row.research_mode
    };

    return [
      {
        id: `${row.id}-prompt`,
        role: 'user' as const,
        content: row.query,
        created_at: row.created_at,
        meta
      },
      {
        id: row.id,
        role: 'model' as const,
        content: 'Intel response',
        created_at: row.created_at,
        result,
        meta
      }
    ];
  });
};

export const sendIntelQueryWithPersistence = async (options: IntelQueryOptions) => {
  const modelUsed = options.modelUsed || 'flash';
  const depthLevel = options.depthLevel ?? 3;
  const researchMode = options.researchMode ?? modelUsed === 'orbit-x';
  const canCustomize = options.canCustomize || false;
  const unlockedModels = options.unlockedModels || ['flash'];
  const hasCustomInstruction = Boolean(options.customInstructions && options.customInstructions.trim().length > 0);
  const conversationMode = options.conversationMode || false;
  const thinkingEnabled = options.thinkingEnabled ?? true; // Default to enabled
  const thinkingLevel = options.thinkingLevel || 'medium'; // Default to medium
  const mode = options.mode || 'chat'; // Default to chat mode
  const image = options.image; // Image data if provided

  if (modelUsed !== 'flash' && !unlockedModels.includes(modelUsed)) {
    throw new Error('CLEARANCE_DENIED: Model not unlocked');
  }

  if (depthLevel > 3 && !canCustomize && !conversationMode) {
    throw new Error('CLEARANCE_DENIED: Depth limited to 3');
  }

  if (hasCustomInstruction && !canCustomize && !conversationMode) {
    throw new Error('CLEARANCE_DENIED: Custom instructions disabled');
  }

  let instruction = '';
  if (mode === 'generation') {
    instruction = 'You are a creative AI assistant capable of generating images. Create the image as requested by the user.';
  } else if (conversationMode) {
    instruction = 'You are a helpful AI assistant. Provide clear, concise answers based on the conversation context.';
  } else {
    instruction = buildInstructions(
      depthLevel,
      researchMode,
      options.customInstructions,
      options.profileInstructions
    );
  }

  console.log('[IntelService] Prepared request', {
    modelUsed,
    depthLevel,
    researchMode,
    conversationMode,
    thinkingEnabled,
    thinkingLevel: options.thinkingLevel || 'medium',
    mode,
    hasImage: Boolean(image),
    conversationHistoryLength: options.conversationHistory?.length || 0,
    promptPreview: options.prompt.slice(0, 200),
    instructionPreview: instruction.slice(0, 200),
    unlockedModels: unlockedModels?.join(',') || ''
  });

  const result = await runIntelQuery({
    prompt: options.prompt,
    instructions: instruction,
    model: modelUsed,
    researchMode: researchMode || modelUsed === 'orbit-x',
    depth: depthLevel,
    conversationHistory: options.conversationHistory,
    conversationMode,
    thinkingEnabled, // Pass thinking preference
    thinkingLevel, // Pass thinking level
    mode, // Pass interaction mode
    image, // Pass image data
    imageResolution: options.imageResolution // Pass image resolution
  });

  let sessionId: string | undefined;
  let created_at: string | undefined;

  const { data, error } = await supabase
    .from('intel_sessions')
    .insert({
      user_id: options.userId,
      model_used: modelUsed,
      depth_level: depthLevel,
      research_mode: researchMode,
      custom_instructions: instruction,
      query: options.prompt,
      response: JSON.stringify(result)
    })
    .select()
    .single();

  if (error) {
    // Persisting history should not block UI; log and continue
    console.warn('Intel history persistence failed:', error);
  } else {
    sessionId = data?.id;
    created_at = data?.created_at;
  }

  return { result, sessionId, created_at };
};
