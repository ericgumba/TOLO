function normalizeSpeechTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}

export function appendSpeechTranscript(answer: string, transcript: string): string {
  const normalizedTranscript = normalizeSpeechTranscript(transcript);

  if (normalizedTranscript.length === 0) {
    return answer;
  }

  if (answer.trim().length === 0) {
    return normalizedTranscript;
  }

  if (/\s$/.test(answer)) {
    return `${answer}${normalizedTranscript}`;
  }

  return `${answer} ${normalizedTranscript}`;
}
