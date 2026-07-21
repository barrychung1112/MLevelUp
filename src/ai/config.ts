export interface AiConfig {
  apiKey: string;
  model: string;
  promptVersion: string;
}

type AiEnvironment = Readonly<Record<string, string | undefined>>;

export function readAiConfig(
  environment: AiEnvironment = process.env,
): AiConfig | null {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    model: environment.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    promptVersion: environment.OPENAI_PROMPT_VERSION?.trim() || "phase3-en-v1",
  };
}

export function readDailyQuestAiConfig(
  environment: AiEnvironment = process.env,
): AiConfig | null {
  const config = readAiConfig(environment);
  if (!config) return null;
  return {
    ...config,
    promptVersion:
      environment.OPENAI_DAILY_QUEST_PROMPT_VERSION?.trim() || "daily-quest-v1",
  };
}
