export function getOpenAiModel(): string | undefined {
  return process.env.OPENAI_MODEL;
}
