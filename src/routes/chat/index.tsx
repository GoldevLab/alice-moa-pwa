import { component$, useSignal, useStore, useStylesScoped$, useVisibleTask$, $, QRL, Slot, noSerialize } from '@builder.io/qwik';
import { routeLoader$, server$, Form, routeAction$, zod$, z } from '@builder.io/qwik-city';
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
// Import flag SVGs for each country
import US from 'country-flag-icons/string/3x2/US';
import ES from 'country-flag-icons/string/3x2/ES';
import IT from 'country-flag-icons/string/3x2/IT';
import FR from 'country-flag-icons/string/3x2/FR';
import BR from 'country-flag-icons/string/3x2/BR';
// Import Lucide icons from @qwikest/icons
import {
  LuVolume2,
  LuVolumeX,
  LuMic,
  LuMicOff,
  LuSend,
  LuAlertTriangle
} from '@qwikest/icons/lucide';
// Removed unused useAuthSession import
import { tursoClient } from '~/utils/turso'; // Assuming turso client setup

// --- Interfaces ---
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface PlacementContext {
  level: string | null;
  autoScore: number | null;
  maxAutoScore: number | null;
  feedbackSummary: string | null;
}

// Maximum number of messages to keep in context window
const MAX_CONTEXT_MESSAGES = 10;

interface FormValues {
  userResponse: string;
  language: string;
}

interface VoiceSettings {
  type: string;
  voice_id: string;
}

// --- Constants ---
const DID_API_URL = import.meta.env.DID_API_URL || "https://api.d-id.com";
// No usamos estas constantes pues usamos server$ para acceder a las claves
// const DID_API_KEY = import.meta.env.DID_API_KEY;
// const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;

// Get country code for language
const getLanguageCode = (langCode: string): string => {
  for (const lang of languages) {
    if (lang.value === langCode) {
      return lang.code;
    }
  }
  return 'US'; // Default to US
};
// Define flag SVGs for each language
const flagSvgs = {
  'US': US,
  'ES': ES,
  'IT': IT,
  'FR': FR,
  'BR': BR
};

const languages = [
  { value: "en-US", label: "English", code: 'US', flagSvg: flagSvgs['US'] },
  { value: "es-ES", label: "Spanish", code: 'ES', flagSvg: flagSvgs['ES'] },
  { value: "it-IT", label: "Italian", code: 'IT', flagSvg: flagSvgs['IT'] },
  { value: "fr-FR", label: "French", code: 'FR', flagSvg: flagSvgs['FR'] },
  { value: "pt-BR", label: "Portuguese", code: 'BR', flagSvg: flagSvgs['BR'] },
];

const languageMap: Record<string, string> = {
  'en-US': 'English',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'fr-FR': 'French',
  'pt-BR': 'Portuguese'
};

const voiceMap: Record<string, VoiceSettings> = {
  'en-US': { type: 'microsoft', voice_id: 'en-US-JennyNeural' },
  'es-ES': { type: 'microsoft', voice_id: 'es-ES-AbrilNeural' },
  'it-IT': { type: 'microsoft', voice_id: 'it-IT-IsabellaNeural' },
  'fr-FR': { type: 'microsoft', voice_id: 'fr-FR-DeniseNeural' },
  'pt-BR': { type: 'microsoft', voice_id: 'pt-BR-BrendaNeural' }
};
// --- Helper Functions ---
const getVoiceSettings = (languageCode: string): VoiceSettings => {
  return voiceMap[languageCode] || voiceMap['en-US']; // Default to English
};

const formatRecordingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const processTextForVoice = (text: string): string => {
    if (!text) return "";
    let processed = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    processed = processed.replace(/\*([^*]+)\*/g, "$1");
    processed = processed.replace(/~~([^~]+)~~/g, "$1");
    processed = processed.replace(/`([^`]+)`/g, "$1");
    processed = processed.replace(/```[a-z]*\n([\s\S]*?)```/g, "code block omitted");
    processed = processed.replace(/^#{1,6}\s+(.+)$/gm, "$1");
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    processed = processed.replace(/https?:\/\/\S+/g, "URL");
    processed = processed.replace(/www\.\S+/g, "URL");
    processed = processed.replace(/\n\s*[-•*+]\s*/g, ", ");
    processed = processed.replace(/\n/g, " ");
    processed = processed.replace(/[#_~<>{}|]/g, "");
    processed = processed.replace(/&[a-z]+;/g, " ");
    processed = processed.replace(/["']([^"']+)["']/g, "$1");
    processed = processed.replace(/\s+/g, " ").trim();
    return processed;
};

const sanitizeForPrompt = (text?: string | null, maxLength = 400): string => {
    if (!text) return "";
    return text
        .replace(/[`]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
};

// --- Server Functions ---

// IMPORTANT: Replace placeholder API keys with secure server-side access
// (e.g., using requestEv.env.get('DID_SECRET_KEY'))

const getAuthHeader = server$(function() {
    // Fetch the actual key securely on the server
    const apiKey = this.env.get('DID_API_KEY') || import.meta.env.DID_API_KEY; // Use the environment variable you have
    if (!apiKey) {
        console.error("D-ID API Key is not configured on the server.");
        return ''; // Or throw error
    }
    return `Basic ${apiKey}`;
});

const fetchWithRetries = server$(async function(url: string, options: RequestInit, retries = 0): Promise<Response> {
    const MAX_RETRY_COUNT = 3;
    const MAX_DELAY_SEC = 4;
    try {
        console.log(`Server Fetch: Making request to: ${url}`, { method: options.method });
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details');
            console.error(`Server Fetch: Request failed status ${response.status}: ${errorText}`);

            if (response.status === 401 || response.status === 403) {
                console.error('Server Fetch: Authentication failed. Check D-ID API key.');
                throw new Error(`Authentication failed: ${response.status}`);
            }

            if (retries < MAX_RETRY_COUNT) {
                const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), MAX_DELAY_SEC) * 3000;
                console.log(`Server Fetch: Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                // Note: 'this' context might be lost here if not careful. Re-invoking server$ might be needed.
                // For simplicity, direct recursion is shown, but consider implications.
                return fetchWithRetries(url, options, retries + 1);
            }
            throw new Error(`Server Fetch: Request failed status: ${response.status}`);
        }
        return response; // Return the raw Response object
    } catch (error: any) {
        if (retries < MAX_RETRY_COUNT) {
            const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), MAX_DELAY_SEC) * 3000;
            console.log(`Server Fetch: Request error: ${error.message}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetries(url, options, retries + 1);
        }
        console.error('Server Fetch: Max retries exceeded:', error);
        throw error;
    }
});


const serverInitConnection = server$(async function() {
    console.log("Server: Step 1: Creating a new stream");
    const authHeader = await getAuthHeader();
    if (!authHeader) throw new Error("Server Auth Header failed");

    const response = await fetchWithRetries(`${DID_API_URL}/talks/streams`, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source_url: "https://i.postimg.cc/fLdQq0DW/thumbnail.jpg", // Replace with your avatar image URL if needed
        }),
    });
    const data = await response.json();
    console.log("Server: Stream creation response:", data);
    if (!data.id || !data.session_id) {
        throw new Error("Server: Stream ID or Session ID missing");
    }
    return {
        streamId: data.id,
        offer: data.offer || data.jsep, // Handle potential variations
        iceServers: data.ice_servers,
        sessionId: data.session_id,
    };
});

const serverSendSdpAnswer = server$(async function(streamId: string, sessionId: string, answer: RTCSessionDescriptionInit) {
    console.log("Server: Step 3: Sending SDP answer");
    const authHeader = await getAuthHeader();
     if (!authHeader) throw new Error("Server Auth Header failed");

    const response = await fetchWithRetries(`${DID_API_URL}/talks/streams/${streamId}/sdp`, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            answer: answer,
            session_id: sessionId
        })
    });
    if (!response.ok) {
        throw new Error(`Server: SDP response error: ${response.status}`);
    }
    console.log("Server: SDP answer sent successfully");
    return await response.json(); // Or just return success status
});

const serverSendIceCandidate = server$(async function(streamId: string, sessionId: string, candidateData: any) {
    console.log("Server: Sending ICE candidate");
     const authHeader = await getAuthHeader();
     if (!authHeader) throw new Error("Server Auth Header failed");

    const response = await fetchWithRetries(`${DID_API_URL}/talks/streams/${streamId}/ice`, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...candidateData,
            session_id: sessionId,
        }),
    });
     if (!response.ok) {
        console.error(`Server: Failed to send ICE candidate: ${response.status}`);
        // Don't throw here, as ICE failures can sometimes be recovered
    } else {
        console.log('Server: ICE candidate sent successfully');
    }
});


const serverCreateTalk = server$(async function(text: string, voiceSettings: VoiceSettings, streamId: string, sessionId: string) {
    console.log("Server: Step 4: Creating a talk");
     const authHeader = await getAuthHeader();
     if (!authHeader) throw new Error("Server Auth Header failed");

    const response = await fetchWithRetries(`${DID_API_URL}/talks/streams/${streamId}`, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            script: {
                type: 'text',
                input: processTextForVoice(text), // Process text server-side too
                provider: {
                    type: voiceSettings.type,
                    voice_id: voiceSettings.voice_id
                }
            },
            config: { stitch: true },
            driver_url: "bank://lively" // Or your specific driver if needed
        })
    });
    if (!response.ok) {
        throw new Error(`Server: Talk request failed status: ${response.status}`);
    }
    const result = await response.json();
    console.log("Server: Talk created successfully:", result);
    return result;
});

const serverCloseStream = server$(async function(streamId: string, sessionId: string) {
    if (!streamId || !sessionId) return;
    console.log("Server: Step 5: Closing the stream");
     const authHeader = await getAuthHeader();
     if (!authHeader) {
         console.error("Server: Cannot close stream, auth header failed");
         return;
     };

    try {
        await fetchWithRetries(`${DID_API_URL}/talks/streams/${streamId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: sessionId })
        });
        console.log("Server: Stream closed successfully");
    } catch (error: any) {
        console.error("Server: Error closing stream:", error.message);
    }
});

// Function to trim messages to avoid exceeding context window limits
const trimChatHistory = (messages: ChatMessage[], maxMessages: number = MAX_CONTEXT_MESSAGES): ChatMessage[] => {
    if (messages.length <= maxMessages) return [...messages];
    
    // Find system messages (they should always be kept)
    const systemMessages = messages.filter(msg => msg.role === 'system');
    
    // Get the most recent messages, excluding system messages
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    const recentMessages = nonSystemMessages.slice(-maxMessages);
    
    // Combine system messages with recent messages
    return [...systemMessages, ...recentMessages];
};

const serverFetchLangChainResponse = server$(async function(
    userMessage: string,
    threadId: string,
    language: string,
    chatHistory: ChatMessage[] = [],
    placementContext?: PlacementContext | null
) {
    console.log("Server: Fetching LangChain response for thread:", threadId);
    const openAIApiKey = this.env.get('OPENAI_API_KEY') || import.meta.env.OPENAI_API_KEY;
    
    if (!openAIApiKey) {
        console.error("OpenAI API Key not configured on server.");
        return "Error: AI service not configured.";
    }

    try {
        const llm = new ChatOpenAI({
            openAIApiKey: openAIApiKey,
            model: "gpt-4o-mini",
            temperature: 0
        });

        const placementScoreText = placementContext?.autoScore !== null && placementContext?.autoScore !== undefined &&
            placementContext?.maxAutoScore !== null && placementContext?.maxAutoScore !== undefined
            ? ` (auto score ${placementContext?.autoScore}/${placementContext?.maxAutoScore})`
            : '';
        const placementInsight = placementContext?.level
            ? `Placement insight: Latest MOA placement test recommends ${placementContext.level}${placementScoreText}. Coach from this Teens course baseline, celebrate strengths, and map the bridge to the next Teens level.`
            : 'Placement insight: No placement test on record yet. Invite the learner to share current evidence or to complete the MOA placement test so you can calibrate instruction and assign the right Teens course.';
        const placementFeedbackText = placementContext?.feedbackSummary
            ? ` Recent academic feedback: ${sanitizeForPrompt(placementContext.feedbackSummary)}.`
            : '';
        const placementGuidance = `${placementInsight}${placementFeedbackText}`;

        const systemContent = `Before we begin - REMEMBER THIS: methods, habits, structures, and routines matter, but always keep it fun. Metodo MOA thrives on joyful rigor and reflective teaching. Keep asking, "Does knowing a lot about a subject automatically make us good teachers?"

Mission (MOA SCHOOL):
- Serve children, teens, and adults inside an interactive, family-like, communicative environment that highlights human values and community.
- Customize content per group, address particular needs, and use culture as a formative vehicle to help learners fall in love with the language.
- Recognize that learning a new language is complex, so accompany students with empathy: "Estamos aqui para ensenarte, ayudarte y aprender contigo."

Video reminder:
- "The Big Bang Theory - Sheldon teaches Penny Physics" is your cautionary tale. Avoid monologues; lean into relational, balanced facilitation.

Reflection axes to keep alive in every response: COMPETENCIAS | PERSONALIZADO | CULTURAL | COMUNICATIVO | MCER.

${placementGuidance}

Personalization:
- Personalization is co-created by teacher and learner. Ask for aspirations, objectives, preferred themes, and relevant info; encourage students to own their learning.
- Highlight positive traits to leverage and sensitive areas to strengthen; design assignments for home that extend practice and competence.
- Repeat the mantra: "Conozca a sus estudiantes."

Culture ("Link it"):
- As Enrico Arcaini (1991) noted, language study is inseparable from culture. Use cultural references to connect prior and new knowledge ("Learn it -> Link it") and to build new neural pathways.
- Promote values that create community while showing how culture makes the language meaningful.

MCER quick map:
- A1: Exchange everyday phrases, introduce oneself, request basic info when speech is slow and cooperative.
- A2: Navigate frequent topics (family, shopping, work, places) with simple exchanges and short past descriptions.
- B1: Grasp main points of clear speech/text on familiar matters, manage travel situations, narrate experiences, and justify opinions briefly.
- B2: Understand complex concrete/abstract content, interact fluently with natives, craft detailed texts with pros/cons.
- C1: Decode demanding texts, capture implicit meaning, express ideas fluently for social/academic/pro contexts with cohesive organization.
- C2: Comprehend almost everything heard/read, synthesize diverse sources, and communicate with nuanced precision.

Teaching style expectations:
- Avoid authoritarian traits (dominance, intimidation, ridicule, rigid one-way delivery, emotional distance) and permissive traits (anything-goes ambiguity, blurred limits, poor observation, ignoring feedback).
- Embody the equilibrado style: organized, differentiated, well-planned, self-possessed, strategy-rich, stimulating active participation, and fostering teacher-student communication.

Metodo MOA structure (PPU / "I do, We do, You do, Extend it"):
- Teacher-directed (I do / Presentation): deliver short segments, inductive teaching, retrieval practice, modeling, demonstrations, multimodal and real-life contexts.
- Guided (We do / Practice): connect practice tightly to presentation, use worksheets, role-play, deduction, declarative + procedural systems, and corrective feedback.
- Student-directed (You do / Use & Extend it): grant independence, act as guide-on-the-side, integrate problem/inquiry/exploratory/experiential work, WebQuests, cultural links, assignments for home, and "Extend it" opportunities for deeper dives.
- Always articulate SWAT ("Students will be able to...") goals per activity and monitor progression from teacher-driven to student-driven protagonism.
- Remember: executing PPU well is what makes a class truly MOA and keeps fun + learning in balance.

Lesson-plan cues to confirm or request:
- Teacher name, schedule, level, number of students, unit number, recommended time, main grammar focus.
- Warm up -> Presentation -> Practice -> Use (and Extend It) description with activity modes (video, song, presentation, game, dialogue, role-play, other) plus comments and code (e.g., MOA/ACAD/0001).
- Ensure cultural touchpoints, retrieval practice moments, and assignments are visible to learners.

Guidelines:
- Respond entirely in ${language} unless the learner explicitly requests a different language.
- Tie every suggestion to competencies, personalization, culture, communication, and MCER outcomes; cite strategies like inductive teaching, retrieval practice, worksheets, role-play, problem-based learning, Learn it -> Link it, and home assignments.
- Align explanations with the learner's placement level while nudging toward the next MCER band.
- Encourage learners to share interests/goals and remind them that personalization relies on both teacher and student effort.
- Provide actionable cultural links and next steps that gradually reduce teacher talk and increase student agency.
- Keep a warm, organized, encouraging tone - never authoritarian, never permissive; be the supportive guide.
- Avoid discussions about sexual content, violence, or religion; gently redirect to safe, pedagogical topics if prompted.

Your goal is to help the learner progress through Metodo MOA with joy, rigor, and community, weaving competencies, personalization, culture, communication, and MCER alignment into every response.`;
        
        // Add system message if not already present in history
        const hasSystemMessage = chatHistory.some(msg => msg.role === 'system');
        let processedHistory = [...chatHistory];
        
        if (!hasSystemMessage) {
            processedHistory.unshift({
                role: 'system',
                content: systemContent
            });
        }
        
        // Add current user message
        processedHistory.push({
            role: 'user',
            content: userMessage
        });
        
        // Trim history to avoid token limit issues
        const trimmedHistory = trimChatHistory(processedHistory);
        
        // Convert to LangChain message format
        const messages = trimmedHistory.map(msg => {
            if (msg.role === 'system') return new SystemMessage(msg.content);
            if (msg.role === 'user') return new HumanMessage(msg.content);
            return new AIMessage(msg.content);
        });

        console.log(`Server: Using ${messages.length} messages for context`);
        const response = await llm.invoke(messages);
        console.log("Server: LangChain response:", response.content);
        return response.content as string;

    } catch (error: any) {
        console.error("Server: Error in LangChain model:", error);
        return "I'm sorry, I encountered an error processing your request.";
    }
});

const serverProcessAudio = server$(async function(audioBase64: string, mimeType: string, language: string): Promise<string> {
    console.log("Server: Processing audio with OpenAI STT");
    const openAIApiKey = this.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
        console.error("OpenAI API Key not configured on server.");
        return "Error: Speech service not configured.";
    }

    try {
        // Convert base64 string back to binary data
        const binaryData = Buffer.from(audioBase64, 'base64');
        
        // Create a new FormData on the server side
        const formData = new FormData();
        
        // Create a Blob from the binary data
        const blob = new Blob([binaryData], { type: mimeType });
        
        // Append the blob with a filename
        formData.append("file", blob, "audio.webm");
        
        // Convertir el nombre del idioma a código ISO-639-1
        let languageCode = "";
        switch (language.toLowerCase()) {
            case "english": languageCode = "en"; break;
            case "spanish": languageCode = "es"; break;
            case "italian": languageCode = "it"; break;
            case "french": languageCode = "fr"; break;
            case "portuguese": languageCode = "pt"; break;
            default: languageCode = "en";
        }
        
        // Añadir el idioma en formato ISO-639-1 a la API de Whisper
        formData.append("language", languageCode);
        
        console.log(`Server: Audio processing - Using language code '${languageCode}' for '${language}'`);
        
        // Mejorar el prompt para proporcionar más contexto basado en el idioma
        formData.append("prompt", `The following is a conversation in ${language}. Please transcribe accurately maintaining the original language.`);
        
        formData.append("model", "whisper-1");
        formData.append("response_format", "text");

        console.log("Server: Sending audio data to OpenAI, size:", binaryData.length, "bytes");
        
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openAIApiKey}`,
                // Content-Type is set automatically by fetch for FormData
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Server: OpenAI STT API error:", response.status, errorData);
            throw new Error(`OpenAI STT API error: ${response.status}`);
        }

        const transcriptionText = await response.text();
        console.log(`Server: Transcription result (${language}):`, transcriptionText);
        console.log(`Server: Transcription length: ${transcriptionText.length} characters`);
        return transcriptionText.trim();

    } catch (error: any) {
        console.error("Server: Error processing audio with OpenAI:", error);
        return "Error processing audio.";
    }
});

const serverSaveChatMessage = server$(async function(sessionId: string, userMessage: string, botResponse: string, userId: string | undefined) {
    if (!userId) {
        console.warn("Server: Cannot save chat message, user not logged in.");
        return;
    }
    console.log("Server: Saving chat message for user:", userId);
    try {
        const client = tursoClient(this); // Pass full request event context
        
        // Check if the chat_history table exists and has the expected columns
        const tableInfo = await client.execute({
            sql: "PRAGMA table_info(chat_history)"
        });
        
        // Log the table structure for debugging
        console.log("Chat history table structure:", tableInfo.rows);
        
        // Get all column names for error handling
        const columnNames = tableInfo.rows.map((row: any) => row.name);
        console.log("Chat history columns:", columnNames.join(', '));
        
        // Verify user_id column exists and handle potential naming issues
        const userIdColumn = tableInfo.rows.find((row: any) =>
            row.name === 'user_id' || row.name === 'userId');
            
        if (!userIdColumn) {
            console.error("Server: chat_history table is missing the user_id/userId column!");
            return;
        }
        
        // Use the actual column name from the database
        const userIdColumnName = userIdColumn.name;
        console.log(`Server: Using column name "${userIdColumnName}" for user ID`);
        
        try {
            // Dynamically build SQL with correct column name
            const insertSQL = `INSERT INTO chat_history (${userIdColumnName}, role, content, timestamp) VALUES (?, ?, ?, ?)`;
            
            // Save user message
            const userResult = await client.execute({
                sql: insertSQL,
                args: [userId, 'user', userMessage, new Date().toISOString()]
            });
            console.log("Server: User message saved successfully", userResult);
            
            // Save assistant message
            const assistantResult = await client.execute({
                sql: insertSQL,
                args: [userId, 'assistant', botResponse, new Date().toISOString()]
            });
            console.log("Server: Assistant message saved successfully", assistantResult);
        } catch (insertError: any) {
            console.error("Server: SQL insert error:", insertError.message);
            if (insertError.message.includes('no column named')) {
                console.error("Server: Column name error - check that column names match exactly with the schema");
                console.error("Server: Available columns:", columnNames.join(', '));
                console.error("Server: Attempted to use column:", userIdColumnName);
            }
            throw insertError; // Re-throw to be caught by outer try/catch
        }
        
        console.log("Server: Chat messages saved successfully");
    } catch (error: any) {
        console.error("Server: Error saving chat message to Turso:", error.message);
        console.error("Server: Error details:", error);
    }
});

const serverUpdateUserLang = server$(async function(userId: string | undefined, lang: string) {
     if (!userId) {
        console.warn("Server: Cannot update language, user not logged in.");
        return;
    }
    console.log("Server: Updating language for user:", userId, "to", lang);
     try {
        const client = tursoClient(this); // Pass full request event context
        // Get table info to check the actual column names
        const tableInfo = await client.execute({
            sql: "PRAGMA table_info(users)"
        });
        
        // Log the table structure for debugging
        console.log("Users table structure:", tableInfo.rows);
        
        // Try to find the chatbot language column (might be chatbotLang or chatbot_lang)
        const langColumnInfo = tableInfo.rows.find((row: any) =>
            row.name.toLowerCase().includes('chatbot') && row.name.toLowerCase().includes('lang'));
        
        if (langColumnInfo) {
            const langColumnName = langColumnInfo.name;
            console.log(`Found language column: ${langColumnName}`);
            
            await client.execute({
                sql: `UPDATE users SET ${langColumnName} = ? WHERE id = ?`,
                args: [lang, userId]
            });
            console.log("Server: User language updated successfully");
        } else {
            console.error("Server: Couldn't find chatbot language column in users table");
        }
    } catch (error: any) {
        console.error("Server: Error updating user language in Turso:", error.message);
    }
});


// Constants for managing context window
// Use the MAX_CONTEXT_MESSAGES constant defined earlier

// Function to load chat history
const serverLoadChatHistory = server$(async function(userId: string | undefined, limit: number = 50) {
    if (!userId) {
        console.warn("Server: Cannot load chat history, user not logged in.");
        return [];
    }
    
    console.log("Server: Loading chat history for user:", userId);
    try {
        const client = tursoClient(this);
        
        // Get most recent conversation thread for this user
        // We'll load in ascending order to get chronological conversation
        const result = await client.execute({
            sql: "SELECT role, content, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC LIMIT ?",
            args: [userId, limit * 2] // Double the limit to account for user/assistant pairs
        });
        
        // Group messages by conversation pairs to ensure we have complete exchanges
        const messages = result.rows.map((row: any) => ({
            role: row.role,
            content: row.content,
            timestamp: row.timestamp
        }));
        
        console.log(`Server: Loaded ${messages.length} chat history messages`);
        
        // If we have a lot of messages, trim to latest complete conversations
        if (messages.length > MAX_CONTEXT_MESSAGES) {
            // Keep the most recent complete conversations
            const startIndex = Math.max(0, messages.length - MAX_CONTEXT_MESSAGES);
            // Make sure we don't start in the middle of a conversation pair
            const adjustedIndex = messages[startIndex].role === 'assistant' ? startIndex - 1 : startIndex;
            const trimmedMessages = messages.slice(Math.max(0, adjustedIndex));
            console.log(`Server: Trimmed history from ${messages.length} to ${trimmedMessages.length} messages`);
            return trimmedMessages;
        }
        
        return messages;
    } catch (error: any) {
        console.error("Server: Error loading chat history:", error.message);
        return [];
    }
});

// --- Route Loader ---
export const useInitialData = routeLoader$(async (requestEv) => {
    const session = requestEv.sharedMap.get('session');
    let userLanguage = 'en-US'; // Default
    let userId: string | undefined = undefined;
    let placementContext: PlacementContext = {
        level: null,
        autoScore: null,
        maxAutoScore: null,
        feedbackSummary: null
    };

    // First check for session.user.id
    if (session?.user?.id) {
        userId = session.user.id;
    } else {
        // Fallback to checking the auth_token cookie directly
        const authToken = requestEv.cookie.get('auth_token')?.value;
        if (!authToken) {
            // If no auth token, redirect to login
            console.log("[CHAT] No authentication found, redirecting to login");
            throw requestEv.redirect(302, '/auth/');
        }
        // Use the auth token as the user ID
        console.log("[CHAT] Using auth_token cookie for authentication");
        userId = authToken;
    }
    
    try { // Start try block for DB query
        const client = tursoClient(requestEv); // Pass full request event
        // At this point, userId is guaranteed to be a string (not undefined)
        // because we checked with if (!session?.user?.id) above
        const id = userId as string; // Explicitly cast to string for TypeScript
        
        // Get table info to check actual column names
        const tableInfo = await client.execute({
            sql: "PRAGMA table_info(users)"
        });
        
        // Log the table structure for debugging
        console.log("[CHAT] Users table structure:", tableInfo.rows);
        
        // Try to find the chatbot language column (might be chatbotLang or chatbot_lang)
        const langColumnInfo = tableInfo.rows.find((row: any) =>
            row.name.toLowerCase().includes('chatbot') && row.name.toLowerCase().includes('lang'));
        
        if (langColumnInfo) {
            const langColumnName = langColumnInfo.name;
            console.log(`[CHAT] Found language column: ${langColumnName}`);
            
            // Use a fixed alias in the query to avoid TypeScript dynamic property access issues
            const result = await client.execute({
                sql: `SELECT ${langColumnName} AS chatbot_language FROM users WHERE id = ? LIMIT 1`,
                args: [id]
            });
            
            if (result.rows.length > 0 && result.rows[0].chatbot_language) {
                const langValue = result.rows[0].chatbot_language;
                // Ensure the loaded language is valid
                const validLang = languages.some(l => l.value === langValue);
                if (validLang) {
                    userLanguage = langValue as string;
                } else {
                    console.warn(`[CHAT] Loaded invalid language '${langValue}' for user ${userId}, using default.`);
                }
            }
        } else {
            console.warn("[CHAT] Couldn't find chatbot language column in users table");
        }

        try {
            const placementResult = await client.execute({
                sql: `SELECT level, auto_score, max_auto_score, feedback_summary
                      FROM placement_test_attempts
                      WHERE user_id = ?
                      ORDER BY datetime(created_at) DESC
                      LIMIT 1`,
                args: [id]
            });

            if (placementResult.rows.length > 0) {
                const placementRow = placementResult.rows[0] as any;
                placementContext = {
                    level: placementRow.level ? String(placementRow.level) : null,
                    autoScore: placementRow.auto_score !== undefined && placementRow.auto_score !== null
                        ? Number(placementRow.auto_score)
                        : null,
                    maxAutoScore: placementRow.max_auto_score !== undefined && placementRow.max_auto_score !== null
                        ? Number(placementRow.max_auto_score)
                        : null,
                    feedbackSummary: placementRow.feedback_summary ? String(placementRow.feedback_summary) : null
                };
            }
        } catch (placementError) {
            console.warn(`[CHAT] Could not load placement context for user ${userId ?? 'unknown'}:`, placementError);
        }
    } catch (e: any) { // Catch block for the DB query try
        console.error("[CHAT] Failed to load user language from DB:", e.message);
    } // Closing brace for try block

    return {
        initialLanguage: userLanguage,
        userId: userId,
        // Generate initial thread ID here if not persisting per user
        initialThreadId: crypto.randomUUID(),
        placementContext
    };
});


// --- Component ---
export default component$(() => {
    useStylesScoped$(STYLES);
    const initialData = useInitialData();
    // const session = useAuthSession(); // Removed as session object is not used directly

    // --- State Signals & Stores ---
    const streamId = useSignal("");
    const sessionId = useSignal("");
    const connected = useSignal(false);
    const initiating = useSignal(false);
    const loading = useSignal(false); // For AI response/talk generation
    const muteVideo = useSignal(false);
    const avatarDisabled = useSignal(false);
    const connectionError = useSignal<string | null>(null);
    const isRecording = useSignal(false);
    const recordingTime = useSignal(0);
    const threadId = useSignal(initialData.value?.initialThreadId ?? crypto.randomUUID()); // Use optional chaining and default

    const chatHistory = useStore<ChatMessage[]>([]);
    const chatHistoryLoaded = useSignal(false);
    const formValues = useStore<FormValues>({
        userResponse: "",
        language: initialData.value?.initialLanguage ?? 'en-US', // Use optional chaining and default
    });

    // --- Refs ---
    const videoRef = useSignal<HTMLVideoElement>();
    const chatMessagesRef = useSignal<HTMLDivElement>();
    const inputRef = useSignal<HTMLInputElement>();
    const peerConnectionRef = useSignal<any>(null);
    const recorderRef = useSignal<any>(null);
    const timerIntervalRef = useSignal<NodeJS.Timeout | null>(null);
    const statsIntervalIdRef = useSignal<NodeJS.Timeout | null>(null);
    const lastBytesReceivedRef = useSignal(0);
    const videoIsPlayingRef = useSignal(false);
    const connectionTimeoutRef = useSignal<NodeJS.Timeout | null>(null);


    // --- QRL Functions for WebRTC/Component Logic ---

    // Define these functions outside useVisibleTask$ so they can be called by event handlers too

    const setVideoElement$ = $((stream: MediaStream | null) => {
        const video = videoRef.value;
        if (!video) return;

        if (stream) {
            console.log("Setting video stream with tracks:", stream.getTracks().length);
            stream.getTracks().forEach(track => {
                console.log(`Track: ${track.id}, kind: ${track.kind}, state: ${track.readyState}`);
            });
            
            // IMPORTANT: We need to avoid stopping tracks coming from the peer connection
            // as that can cause them to end prematurely
            
            // Only stop tracks if they're not from our WebRTC connection
            if (video.srcObject && !peerConnectionRef.value) {
                try {
                    console.log("Stopping non-WebRTC tracks");
                    (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                } catch (err) {
                    console.warn("Error stopping tracks:", err);
                }
            }
            
            // Set the new stream without stopping its tracks
            video.srcObject = stream;
            video.loop = false;
            video.muted = muteVideo.value; // Ensure mute state is respected
            
            // Make sure the video is not hidden
            video.style.visibility = 'visible';
            video.style.display = 'block';
            video.style.display = 'block';
            
            // Play with fallback to muted if needed
            video.play().catch(e => {
                console.error('Error playing stream video:', e);
                if (e.name === 'NotAllowedError') {
                    console.log('Autoplay policy error, trying with muted video');
                    video.muted = true;
                    video.play().catch(e2 => {
                        console.error('Still cannot play stream even with mute:', e2);
                    });
                }
            });
        } else {
            console.log("Clearing video stream");
            if (video.srcObject) {
               (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
            // After clearing, always revert to idle video
            playIdleVideo$(); // Switch to idle when stream is removed - Call the QRL version
        }
    });
const playIdleVideo$ = $(() => {
    // Don't switch to idle if we know we're loading - avatar should appear soon
    if (loading.value || initiating.value) {
        console.log("Not playing idle video while loading or initiating");
        return;
    }

    const video = videoRef.value;
    if (!video) {
        console.error("Cannot play idle video - video element reference is null");
        return;
    }

    console.log("Attempting to play idle video");
    
    // Check if we have an actively playing stream and an active connection
    const pc = peerConnectionRef.value;
    const hasActiveConnection = pc && pc.connectionState === 'connected';
    
    // First, check if we should even switch to idle
    if (hasActiveConnection && video.srcObject instanceof MediaStream) {
        const activeTracks = video.srcObject.getVideoTracks().filter(t => t.readyState === 'live' && !t.muted);
        
        // If we have active live video tracks *with* actual data flowing, don't switch
        if (activeTracks.length > 0 && videoIsPlayingRef.value) {
            console.log("Active video stream with data is playing, not switching to idle");
            return;
        }
        
        console.log("Switching to idle despite connection because stream is inactive");
    }
    
    // At this point, we know we need to switch to idle
    
    // Properly handle WebRTC stream cleanup
    if (video.srcObject instanceof MediaStream) {
        try {
            // Detach tracks from video element first
            const currentTracks = video.srcObject.getTracks();
            
            if (hasActiveConnection) {
                // If we still have an active connection, just detach tracks without stopping
                console.log("Preserving WebRTC tracks while switching to idle");
                currentTracks.forEach(track => {
                    console.log(`Track preserved: ${track.id}, kind: ${track.kind}, state: ${track.readyState}`);
                });
            } else {
                // If connection is gone, we can safely stop all tracks
                console.log("No active connection, safely stopping all tracks");
                currentTracks.forEach(track => {
                    console.log(`Stopping track: ${track.id}, kind: ${track.kind}, state: ${track.readyState}`);
                    track.stop();
                });
            }
        } catch (err) {
            console.warn("Error handling stream tracks:", err);
        }
    }
    
    // If the idle video is already playing properly, don't restart it
    if (video.src &&
        video.src.includes('prs_alice.idle.mp4') &&
        !video.paused &&
        !video.ended &&
        video.readyState >= 3) { // HAVE_FUTURE_DATA or better
        console.log("Idle video already playing correctly, no need to restart");
        return;
    }

    // Clear the srcObject reference (after we've dealt with the tracks)
    video.srcObject = null;
    
    // Reset any previous video state
    video.pause();
    video.removeAttribute('srcObject'); // Ensure srcObject is fully cleared
    video.currentTime = 0;

    // Use a direct, absolute path to the idle video
    const fullVideoPath = window.location.origin + '/prs_alice.idle.mp4';
    console.log("Idle video path:", fullVideoPath);

    // Set properties and force play with a more structured approach
    try {
        // First, clear any previous src to avoid conflicts
        video.removeAttribute('src');
        video.load(); // Important to fully reset video state
        
        // Configure for maximum autoplay compatibility
        video.muted = true; // Force muted initially
        video.loop = true;
        video.style.display = 'block';
        video.autoplay = true;
        video.playsInline = true;
        video.controls = false;
        
        // Set the src and load
        video.src = fullVideoPath;
        video.load(); // Load the new source
        
        console.log("Video configured, attempting to play idle video");
        
        // Play with structured error handling and multiple fallbacks
        const attemptPlay = () => {
            return video.play()
                .then(() => {
                    console.log("Idle video playing successfully");
                    videoIsPlayingRef.value = false; // We're in idle mode
                    
                    // Restore user's mute preference after successful play
                    setTimeout(() => {
                        video.muted = muteVideo.value;
                    }, 300);
                    
                    return true;
                })
                .catch(error => {
                    console.error("Error playing idle video:", error);
                    return false;
                });
        };
        
        // First attempt
        attemptPlay().then(success => {
            if (!success) {
                // First fallback: forced mute + delay
                console.log("Retrying with forced mute after delay");
                video.muted = true;
                
                setTimeout(() => {
                    attemptPlay().then(fallbackSuccess => {
                        if (!fallbackSuccess) {
                            // Final fallback: reload video + forced settings
                            console.log("Final retry with video reload");
                            video.load();
                            video.muted = true;
                            video.autoplay = true;
                            video.currentTime = 0;
                            
                            video.play().catch(finalError => {
                                console.error("All idle video play attempts failed:", finalError);
                            });
                        }
                    });
                }, 500);
            }
        });
    } catch (err) {
        console.error("Exception setting up idle video:", err);
    }
});

    const onVideoStatusChange$ = $((isPlaying: boolean, stream: MediaStream | null) => {
        console.log("Video status change called - isPlaying:", isPlaying, "stream exists:", !!stream);
        
        // If we're in the middle of certain operations, we should defer video changes
        const isProcessing = initiating.value || loading.value;
        
        if (isPlaying && stream) {
            // Verify the stream actually has active video tracks before switching
            const videoTracks = stream.getVideoTracks();
            const hasActiveTracks = videoTracks.length > 0 && videoTracks.some(track => track.readyState === 'live');
            
            console.log(`Stream has ${videoTracks.length} video tracks, active: ${hasActiveTracks}`);
            
            if (hasActiveTracks) {
                console.log("Setting active video stream with live tracks");
                
                // Special handling if we're in a processing state
                if (isProcessing) {
                    console.log("Currently initiating or loading, scheduling stream for later");
                    // Store reference to stream to use when ready, but don't immediately set
                    setTimeout(() => {
                        if (videoRef.value) {
                            console.log("Setting delayed video stream");
                            // Use a safe method to set the video source without stopping existing tracks
                            const video = videoRef.value;
                            
                            // Only replace stream if not already set or if the track IDs changed
                            if (!video.srcObject ||
                                !(video.srcObject instanceof MediaStream) ||
                                video.srcObject.getVideoTracks().length === 0) {
                                
                                console.log("Setting stream with safe transition");
                                video.srcObject = stream;
                                video.muted = muteVideo.value;
                                video.style.display = 'block';
                                
                                video.play().catch(e => {
                                    console.error("Error playing delayed video:", e);
                                    if (e.name === 'NotAllowedError') {
                                        video.muted = true;
                                        video.play().catch(e2 => console.error("Still cannot play video:", e2));
                                    }
                                });
                            } else {
                                console.log("Video already has a valid srcObject, skipping update");
                            }
                        }
                    }, 1000);
                    return;
                }
                
                // Normal flow for setting video stream
                if (videoRef.value) {
                    try {
                        const video = videoRef.value;
                        
                        // CRITICAL: If we had a src URL (from idle video), we need to clear it properly first
                        if (video.src) {
                            video.pause();
                            video.removeAttribute('src');
                            video.load(); // Important to reset the video element
                        }
                        
                        console.log("Setting stream directly to video element");
                        video.srcObject = stream;
                        video.muted = muteVideo.value;
                        video.style.display = 'block';
                        
                        // Force play with retries
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => {
                                console.error('Error playing video:', e);
                                if (e.name === 'NotAllowedError') {
                                    video.muted = true;
                                    video.play().catch(e2 => console.error('Still cannot play video:', e2));
                                }
                            });
                        }
                    } catch (err) {
                        console.error("Error setting video stream:", err);
                    }
                } else {
                    console.warn("Video ref is null, cannot set stream");
                }
            } else {
                console.log("Stream has no active tracks or all tracks ended");
                // Only switch to idle if we're not in the middle of something important
                if (!isProcessing) {
                    console.log("No processing in progress, switching to idle video");
                    playIdleVideo$();
                } else {
                    console.log("Processing in progress, keeping current video state");
                }
            }
        } else {
            // We're explicitly told to play idle video
            if (!isProcessing) {
                console.log("No active stream, playing idle video");
                playIdleVideo$();
            } else {
                console.log("Loading or initiating, not switching to idle video yet");
            }
        }
    });

    const onIceGatheringStateChange$ = $(() => {
        const pc = peerConnectionRef.value;
        if (!pc) return;
        console.log('ICE gathering state:', pc.iceGatheringState);
    });

    const onIceCandidate$ = $(async (event: RTCPeerConnectionIceEvent) => {
        const pc = peerConnectionRef.value;
        if (!event.candidate || !streamId.value || !sessionId.value || !pc) return;
        console.log('ICE candidate:', event.candidate);
        const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
        try {
            await serverSendIceCandidate(streamId.value, sessionId.value, {
                candidate, sdpMid, sdpMLineIndex
            });
        } catch (error) {
            console.error('Client: Failed to send ICE candidate via server:', error);
        }
    });

    const onIceConnectionStateChange$ = $(() => {
        const pc = peerConnectionRef.value;
        if (!pc) return;
        const state = pc.iceConnectionState;
        console.log('ICE connection state:', state);

        if (state === 'connected' || state === 'completed') {
            if (connectionTimeoutRef.value) {
                clearTimeout(connectionTimeoutRef.value);
                connectionTimeoutRef.value = null;
            }
            connected.value = true;
            connectionError.value = null;
            console.log('Connection established successfully');
        } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            console.error('ICE connection failed or closed');
            // Attempt cleanup, but avoid recursive connection attempts here
            closePC$(false); // Close without triggering server close yet - Call QRL version
            connected.value = false;
            connectionError.value = 'Connection failed. Please try reconnecting.';
        }
    });

     const onConnectionStateChange$ = $(() => {
        const pc = peerConnectionRef.value;
        if (!pc) return;
        const state = pc.connectionState;
        console.log('Peer connection state:', state);
        if (state === 'connected') {
            connected.value = true;
            connectionError.value = null;
        } else if (state === 'failed' || state === 'closed') {
            connected.value = false;
            connectionError.value = 'Connection failed. Please try reconnecting.';
            closePC$(false); // Call QRL version
        }
    });

    const onSignalingStateChange$ = $(() => {
        const pc = peerConnectionRef.value;
        if (!pc) return;
        console.log('Signaling state:', pc.signalingState);
    });
const onTrack$ = $((event: RTCTrackEvent) => {
    console.log('onTrack event fired:', event);
    const pc = peerConnectionRef.value;
    if (!event.track || !pc) {
        console.log('onTrack: Event received but no valid track or PC found.');
        return;
    }
    
    console.log(`Track received: ${event.track.id}, kind: ${event.track.kind}, state: ${event.track.readyState}`);
    
    // Keep track of all received tracks for debugging
    event.track.addEventListener('ended', () => {
        console.log(`Track ended: ${event.track.id}, kind: ${event.track.kind}`);
    });
    
    // Create a listener for when the track starts actually flowing data
    event.track.addEventListener('unmute', () => {
        console.log(`Track unmuted: ${event.track.id}, kind: ${event.track.kind}`);
        if (event.streams && event.streams.length > 0) {
            // Store the stream directly to avoid garbage collection
            const stream = event.streams[0];
            
            // If this is a video track, try to use it
            if (event.track.kind === 'video' && stream.getVideoTracks().length > 0) {
                console.log('Video stream available after unmute');
                
                // Only set the video src directly if we're not currently in the middle of loading
                // or if we specifically want to show the avatar animation
                if (!loading.value || videoIsPlayingRef.value) {
                    // Directly set to video element to avoid our helper function that might
                    // be stopping tracks inadvertently
                    const video = videoRef.value;
                    if (video) {
                        console.log('Setting unmuted stream directly to video element');
                        
                        // Just set the srcObject directly without stopping tracks
                        video.srcObject = stream;
                        video.style.display = 'block';
                        video.muted = muteVideo.value;
                        
                        video.play().catch(e => {
                            console.error('Error playing unmuted stream:', e);
                            if (e.name === 'NotAllowedError') {
                                video.muted = true;
                                video.play().catch(e2 => {
                                    console.error('Still cannot play unmuted stream:', e2);
                                });
                            }
                        });
                    }
                } else {
                    console.log('Not setting video element yet as we are still loading or waiting for active tracks');
                }
            }
        }
    });

    // Don't clear stats interval - we need it to continuously monitor stream activity
    // But we should clear any existing interval first to avoid duplicates
    if (statsIntervalIdRef.value) {
        clearInterval(statsIntervalIdRef.value);
        statsIntervalIdRef.value = null;
    }

    // Create a more robust stats gathering interval
    statsIntervalIdRef.value = setInterval(async () => {
        if (!pc || pc.connectionState !== 'connected') {
            if (statsIntervalIdRef.value) clearInterval(statsIntervalIdRef.value);
            statsIntervalIdRef.value = null;
            return;
        }
        
        try {
            // Get stats for all receivers instead of just this track
            // This is more reliable especially when tracks change
            const receivers = pc.getReceivers();
            let foundActiveVideo = false;
            let totalBytesReceived = 0;
            
            // First check if we have any active video tracks at all
            const videoTracks = receivers
                .filter((receiver: RTCRtpReceiver) => receiver.track && receiver.track.kind === 'video' && receiver.track.readyState === 'live')
                .map((receiver: RTCRtpReceiver) => receiver.track);
                
            console.log(`Found ${videoTracks.length} active video tracks`);
            
            if (videoTracks.length > 0) {
                // Then get detailed stats for each track
                const stats = await pc.getStats();
                
                stats.forEach((report: RTCStats) => {
                    if (report.type === 'inbound-rtp' && 'mediaType' in report && report.mediaType === 'video') {
                        foundActiveVideo = true;
                        
                        const bytesReceived = 'bytesReceived' in report ? report.bytesReceived as number : 0;
                        totalBytesReceived += bytesReceived;
                        
                        // Consider video actively playing if we're receiving increasing data
                        const isActivelyReceivingData = bytesReceived > lastBytesReceivedRef.value && bytesReceived > 0;
                        const videoStatusChanged = videoIsPlayingRef.value !== isActivelyReceivingData;
                        
                        if (videoStatusChanged) {
                            videoIsPlayingRef.value = isActivelyReceivingData;
                            
                            if (isActivelyReceivingData) {
                                console.log("D-ID video stream now actively receiving data, switching from idle");
                                
                                // Get all tracks to create a complete stream
                                const allTracks = receivers
                                    .filter((receiver: RTCRtpReceiver) => receiver.track && receiver.track.readyState === 'live')
                                    .map((receiver: RTCRtpReceiver) => receiver.track);
                                    
                                // Create a fresh stream with all active tracks
                                const completeStream = new MediaStream(allTracks);
                                
                                // Use our status change handler to update the video
                                onVideoStatusChange$(true, completeStream);
                            } else if (!loading.value) {
                                console.log("D-ID video stream paused, reverting to idle");
                                onVideoStatusChange$(false, null);
                            }
                        }
                        // Store total bytes for next comparison
                        lastBytesReceivedRef.value = totalBytesReceived;
                    }
                });
            }
            
            // Handle case when no active video is found but we thought we were playing
            if (!foundActiveVideo && videoIsPlayingRef.value) {
                console.log("No active video tracks found in stats");
                videoIsPlayingRef.value = false;
                
                // Only switch to idle if we're not in the middle of loading something
                if (!loading.value) {
                    onVideoStatusChange$(false, null);
                }
            }
        } catch (error) {
            console.error('Error getting stats:', error);
        }
    }, 1000);

    console.log("Track handler set up, waiting for active video data before switching from idle");
});

    const closePC$ = $((triggerServerClose = true) => {
        const pc = peerConnectionRef.value;
        if (!pc) return;
        console.log('Client: Closing peer connection');

        pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange$);
        pc.removeEventListener('icecandidate', onIceCandidate$);
        pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange$);
        pc.removeEventListener('connectionstatechange', onConnectionStateChange$);
        pc.removeEventListener('signalingstatechange', onSignalingStateChange$);
        pc.removeEventListener('track', onTrack$);

        if (statsIntervalIdRef.value) {
            clearInterval(statsIntervalIdRef.value);
            statsIntervalIdRef.value = null;
        }
         if (connectionTimeoutRef.value) {
            clearTimeout(connectionTimeoutRef.value);
            connectionTimeoutRef.value = null;
        }

        // Stop video tracks associated with the connection
        const video = videoRef.value;
        if (video?.srcObject && video.srcObject instanceof MediaStream) {
            console.log("Stopping tracks during PC close - this IS the right place to stop tracks");
            
            // Here we SHOULD stop all tracks as the connection is being terminated
            const tracks = video.srcObject.getTracks();
            console.log(`Stopping ${tracks.length} tracks during peer connection close`);
            
            tracks.forEach(track => {
                console.log(`Stopping track: ${track.id}, kind: ${track.kind}, state: ${track.readyState}`);
                track.stop();
            });
            
            video.srcObject = null;
        }

        pc.close();
        peerConnectionRef.value = null; // Update the signal
        connected.value = false; // Ensure connected state is false
        videoIsPlayingRef.value = false; // Reset video playing state
        lastBytesReceivedRef.value = 0;

        console.log('Client: Peer connection closed');

        // Optionally trigger server-side stream closure
        if (triggerServerClose && streamId.value && sessionId.value) {
            serverCloseStream(streamId.value, sessionId.value).catch(err => {
                console.error("Client: Error during server close stream:", err);
            });
            streamId.value = "";
            sessionId.value = "";
        }
         // Ensure idle video plays after closing
        // Intenta reproducir el video de espera con retraso para dar tiempo a limpiar recursos
        setTimeout(() => {
            playIdleVideo$();
            console.log("Reproduciendo video de espera después de cerrar conexión");
        }, 500);
    });

    const createPeerConnection$ = $(async (offer: RTCSessionDescriptionInit, iceServers: RTCIceServer[]) => {
        if (peerConnectionRef.value) {
            console.warn("Closing existing peer connection before creating new one.");
            closePC$(false); // Close client-side only first - Call QRL version
        }

        try {
            console.log("Client: Creating Peer Connection");
            const newPC = new RTCPeerConnection({ iceServers });

            // Use the QRL handlers
            newPC.addEventListener('icegatheringstatechange', onIceGatheringStateChange$);
            newPC.addEventListener('icecandidate', onIceCandidate$);
            newPC.addEventListener('iceconnectionstatechange', onIceConnectionStateChange$);
            newPC.addEventListener('connectionstatechange', onConnectionStateChange$);
            newPC.addEventListener('signalingstatechange', onSignalingStateChange$);
            newPC.addEventListener('track', onTrack$);

            console.log("Client: Setting remote description");
            await newPC.setRemoteDescription(offer); // Offer is already an object

            console.log("Client: Creating answer");
            const answer = await newPC.createAnswer();

            console.log("Client: Setting local description");
            await newPC.setLocalDescription(answer);

            peerConnectionRef.value = noSerialize(newPC); // Use noSerialize to prevent serialization issues
            return answer;

        } catch (error) {
            console.error('Client: Error creating peer connection:', error);
            peerConnectionRef.value = null; // Ensure ref is null on error
            throw error;
        }
    });

    const connect$ = $(async () => {
        if (avatarDisabled.value) {
            console.log("Avatar disabled, skipping connect");
            return;
        }
        if (connected.value || initiating.value) return; // Prevent multiple concurrent attempts

        initiating.value = true;
        connectionError.value = null;
        closePC$(false); // Close existing client-side connection if any, don't trigger server close yet - Call QRL version

        try {
            playIdleVideo$(); // Start with idle video - Call QRL version

            console.log("Client: Calling serverInitConnection");
            const { streamId: newStreamId, offer, iceServers, sessionId: newSessionId } = await serverInitConnection();

            streamId.value = newStreamId;
            sessionId.value = newSessionId;

            console.log("Client: Stream/Session IDs received:", newStreamId, newSessionId);
            console.log("Client: Creating peer connection with offer");
            const answer = await createPeerConnection$(offer, iceServers); // Call QRL version

            console.log("Client: Sending SDP answer via server");
            await serverSendSdpAnswer(newStreamId, newSessionId, answer);

            // Set connection timeout
             if (connectionTimeoutRef.value) clearTimeout(connectionTimeoutRef.value);
             connectionTimeoutRef.value = setTimeout(() => {
                if (!connected.value) {
                    console.error('Connection timeout - checking status');
                     const pc = peerConnectionRef.value; // Check current value
                     if (pc && (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
                        console.log('Connection appears stable despite timeout - forcing connected state');
                        connected.value = true; // Force connected state if ICE seems okay
                        connectionError.value = null;
                    } else {
                        console.error('Connection truly timed out');
                        connectionError.value = "Connection timed out. Please try reconnecting.";
                        closePC$(true); // Close connection fully including server - Call QRL version
                    }
                }
            }, 15000); // 15 second timeout

            console.log("Client: Waiting for ICE connection...");

        } catch (error: any) {
            console.error('Client: Error during connection initialization:', error);
            connectionError.value = `Connection error: ${error.message || 'Unknown error'}`;
            closePC$(true); // Ensure full cleanup on error - Call QRL version
            connected.value = false;
            streamId.value = "";
            sessionId.value = "";
            
            // Ensure the video plays on error with a slight delay
            setTimeout(() => {
                playIdleVideo$(); // Retry playing idle video with a delay
                console.log("Attempting to play idle video after connection error");
            }, 1000);
        } finally {
            initiating.value = false;
        }
    });


    // --- Client-Side Effects (useVisibleTask$) ---

    // Initialize & Cleanup WebRTC / D-ID Connection
    useVisibleTask$(({ cleanup }) => {
        console.log("Inicializando componente de chat...");
        
        // Reproducir video de espera inmediatamente con reintento
        setTimeout(() => {
            playIdleVideo$();
            console.log("Primer intento de reproducir video de espera");
            
            // Reintento adicional por si acaso
            setTimeout(() => {
                if (!connected.value) {
                    playIdleVideo$();
                    console.log("Segundo intento de reproducir video de espera");
                }
            }, 2000);
        }, 500);
        
        // Intento de conexión después de un retraso para asegurar que el DOM esté listo
        setTimeout(() => {
            if (!avatarDisabled.value) {
                connect$();
            }
        }, 1500);

        // Cleanup function when component unmounts
        cleanup(() => {
            console.log("Client: Cleanup running");
             closePC$(true); // Call the QRL function for full cleanup
             // Clear any other intervals/timeouts if necessary
             if (timerIntervalRef.value) clearInterval(timerIntervalRef.value);
             if (statsIntervalIdRef.value) clearInterval(statsIntervalIdRef.value);
             if (connectionTimeoutRef.value) clearTimeout(connectionTimeoutRef.value);
        });
    });

    // React to avatar toggle
    useVisibleTask$(({ track }) => {
        const disabled = track(() => avatarDisabled.value);
        if (disabled) {
            closePC$(true);
            connected.value = false;
            streamId.value = "";
            sessionId.value = "";
            connectionError.value = null;
        } else if (!connected.value && !initiating.value) {
            connect$();
        }
    });

    // Load chat history on component initialization or when userId changes
    useVisibleTask$(async ({ track }) => { 
        track(() => initialData.value?.userId); // Re-run this effect if userId changes

        const currentUserId = initialData.value?.userId;

        // Clear chat history before loading new history or showing default messages.
        // This ensures that if a user logs out and another logs in, or if userId changes,
        // the old history is cleared immediately.
        chatHistory.splice(0, chatHistory.length);
        chatHistoryLoaded.value = false; // Reset loaded status

        if (!currentUserId) {
            console.log("[CHAT HISTORY] No user ID, showing default welcome message.");
            // Optionally, you could set loading.value here if you want a spinner
            chatHistory.push({
                role: "assistant",
                content: "Welcome! Please log in to see your chat history or start a new conversation."
            });
            chatHistoryLoaded.value = true;
            return;
        }
        
        console.log(`[CHAT HISTORY] Loading chat history for user: ${currentUserId}`);
        // Consider adding a loading state specific to chat history loading if it's slow
        // loading.value = true; // This is a general loading signal, might be okay for now

        try {
            const history = await serverLoadChatHistory(currentUserId);
            
            if (history && history.length > 0) {
                // Map all fields, including timestamp if available and used in UI
                const mappedHistory = history.map((msg: any) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content as string,
                    timestamp: msg.timestamp as string | undefined 
                }));
                chatHistory.splice(0, chatHistory.length, ...mappedHistory);
                console.log(`[CHAT HISTORY] Loaded ${history.length} messages for user ${currentUserId}.`);
            } else {
                console.log(`[CHAT HISTORY] No history found for user ${currentUserId}. Displaying welcome message.`);
                chatHistory.push({
                    role: "assistant",
                    content: "Welcome to the MOA chatbot! How can I help you today?"
                });
            }
        } catch (error) {
            console.error(`[CHAT HISTORY] Error loading chat history for user ${currentUserId}:`, error);
            // Ensure a message is present even on error
            chatHistory.push({
                role: "assistant",
                content: "Sorry, I couldn't load your chat history at the moment. Please try again later."
            });
        } finally {
            chatHistoryLoaded.value = true;
            // loading.value = false; // Reset general loading if it was set for history loading
        }
    });

    // Scroll chat to bottom on new message
    useVisibleTask$(({ track }) => {
        track(() => chatHistory.length);
        const chatEl = chatMessagesRef.value;
        if (chatEl) {
            // Delay scroll slightly to allow DOM update
            setTimeout(() => {
                chatEl.scrollTop = chatEl.scrollHeight;
            }, 50);
        }
    });

    // --- Event Handlers ($) ---

    const handleLanguageChange$ = $(async (event: Event) => {
        const newLang = (event.target as HTMLSelectElement).value;
        formValues.language = newLang;
        // Persist language preference to DB if user is logged in
        // Use optional chaining for safety
        if (initialData.value?.userId) {
           await serverUpdateUserLang(initialData.value.userId, newLang);
        }
    });

    const toggleMuteVideo$ = $(() => {
        muteVideo.value = !muteVideo.value;
        if (videoRef.value) {
            videoRef.value.muted = muteVideo.value;
        }
        console.log(`Video ${muteVideo.value ? 'muted' : 'unmuted'}`);
    });

    const handleReconnectClick$ = $(() => { // Now this can simply call the connect$ QRL
         console.log("Manual reconnect triggered");
         connect$(); // Call the refactored connect QRL
    });

    const toggleAvatar$ = $(() => {
        avatarDisabled.value = !avatarDisabled.value;
        if (avatarDisabled.value) {
            closePC$(true);
            connected.value = false;
            streamId.value = "";
            sessionId.value = "";
            connectionError.value = null;
        }
    });


    const startTalk$ = $(async (userInput: string) => {
        if (!userInput.trim()) return;

        loading.value = true;
        connectionError.value = null; // Clear previous errors on new interaction

        // Add user message immediately
        chatHistory.push({ role: 'user', content: userInput });
        if (inputRef.value) inputRef.value.value = ''; // Clear input field

        try {
            // 1. Get LangChain Response
            console.log("Client: Fetching LangChain response with chat history context");
            
            // Convert chat UI messages to format expected by LangChain
            const historyForLangChain = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            const botResponse = await serverFetchLangChainResponse(
                userInput,
                threadId.value,
                languageMap[formValues.language] || 'English',
                historyForLangChain,
                initialData.value?.placementContext ?? null
            );

            // Add assistant message
            chatHistory.push({ role: 'assistant', content: botResponse });

            // 2. Save to DB (fire and forget)
            // Use optional chaining for safety
            if (initialData.value?.userId) {
                serverSaveChatMessage(sessionId.value || 'no-session', userInput, botResponse, initialData.value.userId)
                    .catch(err => console.error("Client: Failed to save chat message:", err));
            }


            // 3. Create D-ID Talk (if not muted and connected)
            if (muteVideo.value || avatarDisabled.value) {
                console.log("Video muted, skipping talk creation.");
                loading.value = false;
                return;
            }

            // Ensure connection is ready
            if (!connected.value || !streamId.value || !sessionId.value) {
                console.warn("Not connected, attempting to connect before talk...");
                try {
                    // First try reconnecting
                    await connect$(); // Try to establish connection
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for connection to establish
                    
                    // Check again if we're connected
                    if (!connected.value || !streamId.value || !sessionId.value) {
                        console.error("Connection failed after reconnect attempt, cannot create talk.");
                        connectionError.value = "Connection failed. Cannot play response.";
                        loading.value = false;
                        return;
                    }
                    
                    console.log("Successfully reconnected, proceeding with talk creation");
                } catch (error) {
                    console.error("Error during reconnection attempt:", error);
                    connectionError.value = "Connection failed. Cannot play response.";
                    loading.value = false;
                    return;
                }
            }
            
            // Double check connection before proceeding
            if (!connected.value || !streamId.value || !sessionId.value) {
                console.error("Still not connected, cannot create talk.");
                connectionError.value = "Not connected. Cannot play response.";
                 loading.value = false;
                 return; // Don't proceed if not connected
            }
            console.log("Client: Creating talk");
            const voiceSettings = getVoiceSettings(formValues.language);
            await serverCreateTalk(botResponse, voiceSettings, streamId.value, sessionId.value);
            console.log("Client: Talk request sent");
            
            // Ensure we're properly monitoring for the talk video stream
            if (peerConnectionRef.value && videoRef.value) {
                console.log("Setting up enhanced talk stream detection");
                
                // Reset detection variables
                videoIsPlayingRef.value = false;
                lastBytesReceivedRef.value = 0;
                // Clear any existing stats interval
                if (statsIntervalIdRef.value) {
                    clearInterval(statsIntervalIdRef.value);
                    statsIntervalIdRef.value = null;
                }
                
                // Add a more frequent check specifically for talk stream
                const pc = peerConnectionRef.value;
                statsIntervalIdRef.value = setInterval(async () => {
                    if (!pc || pc.connectionState !== 'connected') {
                        if (statsIntervalIdRef.value) {
                            clearInterval(statsIntervalIdRef.value);
                            statsIntervalIdRef.value = null;
                        }
                        return;
                    }
                    
                    try {
                        // Get all active tracks first
                        const receivers = pc.getReceivers();
                        const activeVideoTracks = receivers
                            .filter((receiver: RTCRtpReceiver) => receiver.track &&
                                   receiver.track.kind === 'video' &&
                                   receiver.track.readyState === 'live')
                            .map((receiver: RTCRtpReceiver) => receiver.track);
                        
                        console.log(`Found ${activeVideoTracks.length} active video tracks`);
                        
                        // Only proceed with stats if we have video tracks
                        if (activeVideoTracks.length > 0) {
                            // Get detailed stats to check if we're receiving actual data
                            const stats = await pc.getStats();
                            let hasActiveVideoData = false;
                            let currentBytesReceived = 0;
                            
                            // Parse stats to check for active video data flow
                            stats.forEach((report: RTCStats) => {
                                if (report.type === 'inbound-rtp' &&
                                    'mediaType' in report &&
                                    report.mediaType === 'video') {
                                    
                                    currentBytesReceived = 'bytesReceived' in report ?
                                        report.bytesReceived as number : 0;
                                    
                                    // Check if bytes are increasing, indicating active data
                                    hasActiveVideoData = currentBytesReceived > lastBytesReceivedRef.value &&
                                                       currentBytesReceived > 0;
                                    
                                    if (hasActiveVideoData && !videoIsPlayingRef.value) {
                                        console.log("Talk video stream now active with data flow");
                                        videoIsPlayingRef.value = true;
                                        
                                        // Create fresh stream with all active tracks
                                        const allActiveTracks = receivers
                                            .filter((r: RTCRtpReceiver) => r.track && r.track.readyState === 'live')
                                            .map((r: RTCRtpReceiver) => r.track);
                                        
                                        const refreshedStream = new MediaStream(allActiveTracks);
                                        onVideoStatusChange$(true, refreshedStream);
                                    }
                                    
                                    // Update for next comparison
                                    lastBytesReceivedRef.value = currentBytesReceived;
                                }
                            });
                            
                            // Handle case where video should be playing but no data is flowing
                            if (!hasActiveVideoData && videoIsPlayingRef.value && !loading.value) {
                                console.log("Talk video stream has no active data flow, reverting to idle");
                                videoIsPlayingRef.value = false;
                                onVideoStatusChange$(false, null);
                            }
                        } else if (videoIsPlayingRef.value && !loading.value) {
                            // No active video tracks but we think we're playing
                            console.log("No active video tracks found, reverting to idle");
                            videoIsPlayingRef.value = false;
                            onVideoStatusChange$(false, null);
                        }
                    } catch (error) {
                        console.error("Error monitoring video stream:", error);
                    }
                }, 750); // Slightly more frequent checking for smoother transitions
                // Initial check for active tracks
                const initialReceivers = pc.getReceivers();
                const initialVideoTracks = initialReceivers
                    .filter((receiver: RTCRtpReceiver) => receiver.track &&
                            receiver.track.kind === 'video' &&
                            receiver.track.readyState === 'live')
                    .map((receiver: RTCRtpReceiver) => receiver.track);
                
                // Setup interval to check for talk stream activation
                const talkStreamCheckInterval = setInterval(() => {
                    if (initialVideoTracks.length > 0) {
                        console.log(`Initial check: Found ${initialVideoTracks.length} active video tracks`);
                    
                    // Make sure all video tracks are enabled
                    initialVideoTracks.forEach((track: MediaStreamTrack) => {
                        console.log(`Ensuring video track is enabled: ${track.id}`);
                        track.enabled = true;
                    });
                    
                    // Get all active tracks (video and audio)
                    const allActiveTracks = initialReceivers
                        .filter((receiver: RTCRtpReceiver) => receiver.track && receiver.track.readyState === 'live')
                        .map((receiver: RTCRtpReceiver) => receiver.track);
                    
                    // Create a new stream with all active tracks
                    try {
                        const mediaStream = new MediaStream(allActiveTracks);
                        
                        // Set directly to video element without stopping tracks
                        const video = videoRef.value;
                        if (video) {
                            // Check if we need to update the video element
                            const needsUpdate = !video.srcObject ||
                                (video.srcObject as MediaStream).getVideoTracks().length === 0 ||
                                (video.srcObject as MediaStream).getVideoTracks()[0].readyState !== 'live';
                            if (needsUpdate) {
                                console.log("Updating video element with active stream");
                            
                            // Direct assignment without stopping tracks
                            video.srcObject = mediaStream;
                            video.muted = muteVideo.value;
                            video.style.display = 'block';
                            
                            // Play the video
                            video.play().catch(e => {
                                console.error('Error playing video:', e);
                                if (e.name === 'NotAllowedError') {
                                    video.muted = true;
                                    video.play().catch(e2 => {
                                        console.error('Still cannot play video:', e2);
                                    });
                                }
                            });
                            }
                        }
                        } catch (err) {
                            console.error("Error creating media stream:", err);
                        }
                    }
                }, 300); // Check very frequently for talk stream activation
            }
            
        } catch (error: any) {
            console.error("Client: Error during startTalk:", error);
            chatHistory.push({ role: 'assistant', content: `Error: ${error.message || 'Could not process request.'}` });
            connectionError.value = `Error: ${error.message || 'Could not process request.'}`;
            // Attempt to play idle video on error to reset visual state
            if (videoRef.value) {
                playIdleVideo$();
            }
        } finally {
            loading.value = false;
        }
    });

    const handleSendClick$ = $(() => {
        if (inputRef.value && inputRef.value.value.trim()) {
            startTalk$(inputRef.value.value);
        }
    });

    const handleKeyUp$ = $((event: KeyboardEvent) => {
        if (event.key === 'Enter' && inputRef.value && inputRef.value.value.trim()) {
            startTalk$(inputRef.value.value);
        }
    });

    // --- Audio Recording ---
    
    // Define processAudio$ first, before it's used in event listeners
    const processAudio$ = $(async (audioBlob: Blob) => {
        loading.value = true; // Indicate processing
        
        // Mostrar mensaje de retroalimentación en la interfaz
        chatHistory.push({
            role: 'assistant',
            content: `Procesando grabación de voz en ${getLanguageCode(formValues.language)} ${languageMap[formValues.language] || 'English'}...`
        });
        
        try {
            // Convert Blob to base64 string for easier serialization
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            console.log("Client: Audio converted to base64, size:", base64Audio.length);
            console.log(`Client: Processing voice recording in ${formValues.language} (${languageMap[formValues.language] || 'English'})`);
            
            // Send the base64 string to the server along with mime type
            // Eliminar el último mensaje si es el de procesamiento
            if (chatHistory.length > 0 &&
                chatHistory[chatHistory.length - 1].role === 'assistant' &&
                chatHistory[chatHistory.length - 1].content.startsWith('Procesando grabación de voz')) {
                chatHistory.pop();
            }
            
            const transcription = await serverProcessAudio(
                base64Audio,
                audioBlob.type,  // Pass the mime type
                languageMap[formValues.language] || 'English'
            );

            if (transcription && !transcription.startsWith("Error:")) {
                // Mostrar la transcripción antes de la respuesta
                console.log(`Client: Transcription successful in ${formValues.language}: "${transcription}"`);
                
                // Añadir mensaje con la transcripción y desencadenar respuesta AI
                await startTalk$(transcription);
            } else {
                console.error(`Client: Transcription failed in ${formValues.language}:`, transcription);
                
                // Mensaje de error más detallado para el usuario
                chatHistory.push({
                    role: 'assistant',
                    content: `No pude procesar correctamente el audio en ${languageMap[formValues.language] || 'English'}. Por favor, intenta de nuevo o escribe tu mensaje.`
                });
            }
        } catch (error: any) {
            console.error(`Client: Error processing audio in ${formValues.language}:`, error);
            
            // Eliminar el mensaje de procesamiento si existe
            if (chatHistory.length > 0 &&
                chatHistory[chatHistory.length - 1].role === 'assistant' &&
                chatHistory[chatHistory.length - 1].content.startsWith('Procesando grabación de voz')) {
                chatHistory.pop();
            }
            
            // Mensaje de error más amigable y específico para el idioma
            const errorMsg = `Lo siento, hubo un problema procesando tu grabación en ${getLanguageCode(formValues.language)} ${languageMap[formValues.language]}. ${error.message}`;
            chatHistory.push({ role: 'assistant', content: errorMsg });
        } finally {
            loading.value = false;
        }
    });
    
    const startRecording$ = $(async () => {
        if (isRecording.value) return;

        try {
            // Configuración de audio optimizada para reconocimiento de voz
            const audioConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                }
            };
            
            console.log(`Client: Starting voice recording for language: ${formValues.language} (${languageMap[formValues.language] || 'English'})`);
            
            const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            
            // Intentar usar audio/webm;codecs=opus para mejor calidad, con fallback a audio/webm
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                console.log('Client: Opus codec not supported, using standard audio/webm');
            }
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });
            recorderRef.value = noSerialize(mediaRecorder);

            const audioChunks: Blob[] = [];

            mediaRecorder.addEventListener("dataavailable", (event) => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                
                // Log video tracks to help with debugging
                console.log("Found", stream.getVideoTracks().length, "active video tracks");
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                
                // Update state
                isRecording.value = false;
                recorderRef.value = null;
                
                // Clear timer
                if (timerIntervalRef.value) clearInterval(timerIntervalRef.value);
                recordingTime.value = 0;

                // Process audio if we have data
                if (audioBlob.size > 0) {
                    await processAudio$(audioBlob);
                } else {
                    console.log("Empty recording, skipping processing.");
                }
            });

            mediaRecorder.start();
            isRecording.value = true;
            recordingTime.value = 0; // Reset timer
            if (timerIntervalRef.value) clearInterval(timerIntervalRef.value); // Clear previous interval
            timerIntervalRef.value = setInterval(() => {
                recordingTime.value++;
            }, 1000);

            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 30000);

        } catch (error) {
            console.error("Error starting recording:", error);
            isRecording.value = false;
            alert("Could not start recording. Please ensure microphone permission is granted.");
        }
    });

    const stopRecording$ = $(() => {
        if (recorderRef.value && recorderRef.value.state === 'recording') {
            recorderRef.value.stop();
            // State changes (isRecording=false, etc.) handled in 'stop' event listener
        }
         if (timerIntervalRef.value) {
            clearInterval(timerIntervalRef.value);
            timerIntervalRef.value = null;
        }
    });

    const toggleRecording$ = $(() => {
        if (isRecording.value) {
            stopRecording$();
        } else {
            startRecording$();
        }
    });


    // --- Render ---
    useVisibleTask$(() => {
        // Ajuste dinámico del layout con cálculo preciso para evitar scroll
        const adjustLayout = () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            
            // Cálculo más preciso para prevenir scroll
            const navbarHeight = 58;
            // Margen de seguridad adicional para evitar scrollbar
            const safetyMargin = 10;
            // Footer/input height más el padding/margin
            const bottomHeight = 5;
            
            // Altura disponible real con todos los márgenes necesarios
            const availableHeight = vh - navbarHeight - safetyMargin - bottomHeight;
            
            // Ajuste proporciones para que encaje perfectamente sin scroll
            const videoHeight = Math.floor(availableHeight * 0.38);
            const chatHeight = availableHeight - videoHeight;
            
            // Variables CSS para el layout completo
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--vw', `${vw}px`);
            document.documentElement.style.setProperty('--available-height', `${availableHeight}px`);
            document.documentElement.style.setProperty('--video-height', `${videoHeight}px`);
            document.documentElement.style.setProperty('--chat-height', `${chatHeight}px`);
            
            // Ajustes de tamaño para elementos UI basados en el ancho
            const inputHeight = Math.max(32, Math.min(40, Math.floor(vw * 0.03)));
            document.documentElement.style.setProperty('--input-height', `${inputHeight}px`);
        };
        
        // Ejecutar al cargar y cuando cambie el tamaño
        adjustLayout();
        window.addEventListener('resize', adjustLayout);
        return () => window.removeEventListener('resize', adjustLayout);
    });
    
    return (
        <div class="chat-container" style={{ height: 'var(--available-height, 70vh)' }}>

            {/* Video Panel - Similar a la imagen de referencia */}
            <div class="video-panel">
                <video
                    ref={videoRef}
                    id="talk-video"
                    autoplay
                    playsInline
                    muted={muteVideo.value}
                    class="video-element"
                    preload="auto"
                />
                
                {loading.value && (
                    <div class="video-processing-indicator">
                        <Spinner />
                        <span>Processing...</span>
                    </div>
                )}
                
                {initiating.value && (
                    <div class="video-connecting-overlay">
                        <Spinner />
                        <p>Connecting to Avatar...</p>
                    </div>
                )}
                
                {/* Control Panel - Minimalista como en la imagen */}
                <div class="control-panel">
                    <div class="control-left">
                        {/* Language selection with country codes */}
                        <div class="language-icons">
                            {languages.map((option) => (
                                <button
                                    key={option.value}
                                    onClick$={async () => {
                                        formValues.language = option.value;
                                        if (initialData.value?.userId) {
                                            await serverUpdateUserLang(initialData.value.userId, option.value);
                                        }
                                    }}
                                    class={`lang-icon-btn ${formValues.language === option.value ? 'active' : ''}`}
                                    title={option.label}
                                    aria-label={option.label}
                                    dangerouslySetInnerHTML={option.flagSvg}
                                >
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div class="control-right">
                        <label class="flex items-center gap-2 text-xs font-medium text-gray-700 mr-3">
                            <input
                                type="checkbox"
                                class="h-4 w-4 accent-emerald-600"
                                checked={avatarDisabled.value}
                                onChange$={toggleAvatar$}
                            />
                            <span>{avatarDisabled.value ? 'Avatar OFF' : 'Avatar ON'}</span>
                        </label>
                        {!connected.value && !initiating.value && (
                            <button
                                onClick$={handleReconnectClick$}
                                disabled={avatarDisabled.value}
                                class={`connect-button ${avatarDisabled.value ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {avatarDisabled.value ? 'Avatar off' : 'Connect'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Panel - Limpio y elegante como en la imagen */}
            <div class="chat-panel">
                {/* Header similar a la imagen */}
              
                
                {/* Mensajes de Chat */}
                <div
                    ref={chatMessagesRef}
                    class="chat-messages">
                    {chatHistory.map((message, index) => (
                        <div
                            key={index}
                            class={`message-container ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                            <div class={`message-bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                                <div class="message-sender">
                                    {message.role === 'user' ? 'You' : 'Assistant'}
                                </div>
                                <p class="message-content">{message.content}</p>
                            </div>
                        </div>
                    ))}
                    
                    {loading.value && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                        <div class="message-container assistant-message">
                            <div class="message-bubble assistant-bubble">
                                <div class="message-sender">Assistant</div>
                                <div class="typing-indicator"><span></span><span></span><span></span></div>
                            </div>
                        </div>
                    )}
                    </div>

                {/* Input Area - Fixed at bottom on mobile */}
                <div class="chat-input-container fixed-mobile-input">
                    <div class="chat-input-wrapper">
                        <button
                            onClick$={toggleMuteVideo$}
                            class="volume-button control-btn"
                            aria-label={muteVideo.value ? 'Unmute Video' : 'Mute Video'}>
                            {muteVideo.value ? <LuVolumeX class="w-4 h-4" /> : <LuVolume2 class="w-4 h-4" />}
                        </button>
                        
                        {/* Language icons hidden on mobile (moved to top panel) */}
                        <div class="language-icons desktop-only">
                            {languages.map((option) => (
                                <button
                                    key={option.value}
                                    onClick$={async () => {
                                        formValues.language = option.value;
                                        if (initialData.value?.userId) {
                                            await serverUpdateUserLang(initialData.value.userId, option.value);
                                        }
                                    }}
                                    class={`lang-icon-btn ${formValues.language === option.value ? 'active' : ''}`}
                                    title={option.label}
                                    aria-label={option.label}
                                    dangerouslySetInnerHTML={option.flagSvg}
                                >
                                </button>
                            ))}
                        </div>
                        
                        <button
                            onClick$={toggleRecording$}
                            disabled={initiating.value || loading.value}
                            class={`mic-button ${isRecording.value ? 'recording' : ''}`}
                            aria-label={isRecording.value ? 'Stop Recording' : 'Start Recording'}>
                            {isRecording.value ? <LuMic class="w-4 h-4" /> : <LuMicOff class="w-4 h-4" />}
                        </button>
                        
                        <input
                            ref={inputRef}
                            onKeyUp$={handleKeyUp$}
                            type="text"
                            placeholder={initiating.value ? "Connecting..." : "Type a message..."}
                            disabled={initiating.value || loading.value}
                            class="chat-input"
                        />
                        
                        <button
                            onClick$={handleSendClick$}
                            disabled={initiating.value || loading.value}
                            class="send-button">
                            {loading.value ? <Spinner size="small" /> : <LuSend class="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Spinner component kept as is, since it's a custom animated component
export const Spinner = component$<{ size?: 'small' | 'medium' }>(({ size = 'medium' }) => {
    const sizeClass = size === 'small' ? 'w-4 h-4 border-2' : 'w-5 h-5 border-[3px]';
    return <div class={`animate-spin rounded-full ${sizeClass} border-white border-t-transparent`} role="status" aria-label="loading"></div>;
});


// --- Styles ---
export const STYLES = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes bubble-appear {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-bubble-appear {
  animation: bubble-appear 0.3s ease forwards;
}

.typing-indicator span {
  width: 5px;
  height: 5px;
  background-color: currentColor;
  border-radius: 50%;
  display: inline-block;
  margin: 0 1px;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
.animate-pulse {
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}

/* Custom scrollbar (optional) */
/* Ensure the app takes exactly the viewport size */
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
}

/* Estilos CSS para el nuevo diseño limpio y minimalista */
/* Base Styles */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Main Container */
.chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* Video Panel */
.video-panel {
  width: 100%;
  position: relative;
  height: var(--video-height, 40vh);
  background-color: #000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.control-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background-color: rgba(255, 255, 255, 0.9);
}

.control-left, .control-right {
  display: flex;
  align-items: center;
}

/* Adjust language icons in control panel for mobile */
.control-left .language-icons {
  display: flex;
  gap: 4px;
}

.volume-button {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background-color: #eaeaea;
  border: none;
  margin-right: 10px;
  cursor: pointer;
}

.language-selector {
  height: 30px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background-color: white;
  font-size: 14px;
}

.connect-button {
  padding: 6px 16px;
  background-color: #0cd15b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

/* Chat Panel */
.chat-panel {
  flex-grow: 1;
  height: var(--chat-height, 50vh);
  background-color: white;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 12px 16px;
  background-color: #f1f1f4;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-title {
  font-weight: 500;
  color: #333;
  font-size: 15px;
}

.chat-subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-container {
  display: flex;
}

.user-message {
  justify-content: flex-end;
}

.assistant-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  animation: bubble-appear 0.2s ease-out;
}

.user-bubble {
  background-color: #1a85ff;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-bubble {
  background-color: #f1f1f4;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-sender {
  font-size: 11px;
  margin-bottom: 4px;
  opacity: 0.8;
  font-weight: 500;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Input Area */
.chat-input-container {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
}

/* Fixed Mobile Input */
.fixed-mobile-input {
  position: relative;
}

/* Fixed position for mobile */
@media (max-width: 767px) {
  .fixed-mobile-input {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #f8f9fa;
    padding: 10px 16px;
    z-index: 20;
    border-top: 1px solid #e0e0e0;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  }
  
  /* Add padding at the bottom of chat messages to prevent overlap with fixed input */
  .chat-messages {
    padding-bottom: 70px !important;
  }
}

.chat-input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  width: 100%;
  border-radius: 24px;
  border: 1px solid #e0e0e0;
  padding: 0 6px;
  height: 42px;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.mic-button {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.language-icons {
  display: flex;
  gap: 2px;
  margin: 0 2px;
}

/* This space intentionally left blank - removing obsolete CSS */

.lang-icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.2s ease;
}

/* Control panel language icons should be slightly smaller */
.control-left .lang-icon-btn {
  width: 34px;
  height: 24px;
  border-radius: 3px;
}

.lang-icon-btn:hover {
  transform: scale(1.05);
}

.lang-icon-btn.active {
  box-shadow: 0 0 0 2px #1a85ff, 0 0 0 4px rgba(26, 133, 255, 0.3);
}

/* SVG flag styling */
.lang-icon-btn svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mic-button.recording {
  color: #f44336;
  animation: pulse 1.5s infinite;
}

.chat-input {
  flex-grow: 1;
  height: 100%;
  border: none;
  padding: 0 8px;
  font-size: 14px;
}

.chat-input:focus {
  outline: none;
}

.send-button {
  min-width: 32px;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #1a85ff;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

/* Loading and Status Indicators */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #888;
  animation: typing 1.4s infinite both;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

.video-processing-indicator {
  position: absolute;
  right: 10px;
  bottom: 60px;
  background-color: rgba(0,0,0,0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.video-connecting-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: 10px;
}

/* Animations */
@keyframes bubble-appear {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

@keyframes typing {
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
}
/* Responsive Adjustments */
@media (min-width: 768px) {
  .chat-container {
    flex-direction: row;
  }
  
  .video-panel {
    width: 40%;
    height: var(--available-height, 90vh);
  }
  
  .chat-panel {
    width: 60%;
    height: var(--available-height, 100vh);
  }
  
  .control-panel {
    height: 40px;
  }
  
  .chat-input-wrapper {
    max-width: 90%;
    margin: 0 auto;
  }
  
  /* Reset fixed position for desktop */
  .fixed-mobile-input {
    position: relative;
    box-shadow: none;
  }
  
  /* Show language icons in input area only on desktop */
  .desktop-only {
    display: flex;
  }
}

/* Hide on mobile */
.desktop-only {
  display: none;
}

/* Hide scrollbars but maintain functionality */
.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  overflow: hidden;
}

/* Hide scrollbars on main layout */
.h-screen.w-screen.max-w-full {
  overflow: hidden;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 3px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .overflow-y-auto::-webkit-scrollbar {
    width: 3px;
  }
}
`;

