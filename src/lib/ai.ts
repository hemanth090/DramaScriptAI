import { Redis } from "@upstash/redis";
import { DRAMA_SYSTEM_PROMPT, buildDramaPrompt } from "./prompt";
import { env } from "./env";

interface AIResult {
  script: string;
  model: string;
  cached: boolean;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

async function hashPrompt(prompt: string): Promise<string> {
  const data = new TextEncoder().encode(prompt.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callChatAPI(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  maxTokens = 8000
): Promise<string | null> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: DRAMA_SYSTEM_PROMPT },
        { role: "user", content: systemPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`AI API error (${response.status}):`, errText.slice(0, 300));
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  // Accept "Episode" or "EP" format
  return content && (content.includes("Episode") || content.includes("EP")) ? content : null;
}

export async function generateScript(userPrompt: string, episodes = 8, duration = "30-60"): Promise<AIResult> {
  const systemPrompt = buildDramaPrompt(userPrompt, episodes, duration);

  // 1. Check cache
  const r = getRedis();
  if (r) {
    try {
      const hash = await hashPrompt(`${userPrompt}:${episodes}:${duration}`);
      const cached = await r.get<string>(`ds:cache:${hash}`);
      if (cached) {
        return { script: cached, model: "cache", cached: true };
      }
    } catch {
      // continue without cache
    }
  }

  // 2. Try Groq (fastest, cheapest)
  const groqKey = env.GROQ_API_KEY;
  const groqModel = env.GROQ_MODEL;
  if (groqKey) {
    try {
      const script = await callChatAPI(
        "https://api.groq.com/openai/v1",
        groqKey,
        groqModel,
        systemPrompt,
        8000
      );
      if (script) {
        await cacheResult(r, `${userPrompt}:${episodes}:${duration}`, script);
        return { script, model: groqModel, cached: false };
      }
    } catch (err) {
      console.error("Groq API error:", err instanceof Error ? err.message : err);
    }
  }

  // 3. Try Grok (xAI)
  const xaiKey = env.XAI_API_KEY;
  const xaiModel = env.XAI_MODEL;
  if (xaiKey) {
    try {
      const script = await callChatAPI(
        "https://api.x.ai/v1",
        xaiKey,
        xaiModel,
        systemPrompt
      );
      if (script) {
        await cacheResult(r, `${userPrompt}:${episodes}:${duration}`, script);
        return { script, model: xaiModel, cached: false };
      }
    } catch (err) {
      console.error("Grok API error:", err instanceof Error ? err.message : err);
    }
  }

  // 4. Try OpenAI
  const openaiKey = env.OPENAI_API_KEY;
  const openaiModel = env.OPENAI_MODEL;
  if (openaiKey) {
    try {
      const script = await callChatAPI(
        "https://api.openai.com/v1",
        openaiKey,
        openaiModel,
        systemPrompt
      );
      if (script) {
        await cacheResult(r, `${userPrompt}:${episodes}:${duration}`, script);
        return { script, model: openaiModel, cached: false };
      }
    } catch (err) {
      console.error("OpenAI API error:", err instanceof Error ? err.message : err);
    }
  }

  // 5. Demo fallback
  if (!groqKey && !xaiKey && !openaiKey) {
    return { script: generateDemoScript(userPrompt), model: "demo", cached: false };
  }

  throw new Error("AI generation failed across all providers.");
}

async function cacheResult(
  r: Redis | null,
  cacheKey: string,
  script: string
): Promise<void> {
  if (!r) return;
  try {
    const hash = await hashPrompt(cacheKey);
    await r.set(`ds:cache:${hash}`, script, { ex: 24 * 60 * 60 }); // 24h TTL
  } catch {
    // ignore cache errors
  }
}

function generateDemoScript(prompt: string): string {
  return `---
SERIES TITLE: "${prompt}" — Ek Kahani Jo Dil Cheer De
GENRE: Drama / Thriller / Romance
TOTAL EPISODES: 8
TARGET: Instagram Reels / YouTube Shorts (30-60 sec each)
---

## Episode 1: "Pehli Nazar Ka Dhoka"
**Duration:** ~45 seconds
**Scene:** A busy college cafeteria. Warm golden-hour lighting through large windows. Camera follows the protagonist walking in slow motion.

**Dialogues:**
ARJUN: "Bro, woh dekh... nayi ladki ayi hai college mein."
VIKRAM: "Chhod yaar, teri har baar ki kahani hai..."
ARJUN: "Nahi bro, this time it's different. I can feel it."
PRIYA (voiceover, looking at phone): "New city, new college... aur ek nayi shuruwaat."
ARJUN (bumps into Priya, coffee spills): "Oh shit! I'm so sorry—"
PRIYA (angry): "Dekh ke nahi chal sakte? Pura dress kharab kar diya!"
ARJUN: "Main... main clean karwa dunga—"
PRIYA: "Rehne do. Pehle din aur pehla impression — dono barbaad."

**Cliffhanger:** As Priya walks away, Arjun notices she dropped her diary. He opens it — the first page has HIS photo with a red cross on it.

---

## Episode 2: "Diary Mein Raaz"
**Duration:** ~50 seconds
**Scene:** Arjun's hostel room, night. Dim desk lamp. Close-up shots of diary pages.

**Dialogues:**
ARJUN (reading diary, whispering): "Yeh kya hai... isme meri photo kyun hai?"
VIKRAM: "Bro kya padh raha hai itna serious hokar?"
ARJUN: "Vikram... yeh ladki, Priya — isko meri poori life ke baare mein pata hai."
VIKRAM: "Kya matlab? Stalker hai kya?"
ARJUN: "Nahi... isme likha hai — 'Arjun ko uski galti ka ehsaas karana hai. Woh nahi jaanta usne kya kiya hai.'"

**Cliffhanger:** The last page of the diary shows a childhood photo of Arjun and Priya together — they knew each other as kids.

---

## Episode 3-8: [Full episodes generated with AI]

> This is a DEMO script. Connect an AI provider (Grok or OpenAI) in your .env.local to generate complete 8-episode scripts with unique storylines, dialogues, and cliffhangers.

---
**CREATOR NOTES:**
- **Cast needed:** 3 main actors + supporting cast
- **Key locations:** College campus, hostel room, rooftop, cafeteria
- **Posting schedule:** Release 2 episodes/day for 4 days. Best time: 7-9 PM IST
- **Suggested hashtags:** #DramaScript #ShortDrama #MicroDrama #ShortSeries #ReelsSeries`;
}
