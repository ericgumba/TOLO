"use client";

import { useEffect, useRef, useState } from "react";

import { QuizFormButtons } from "@/app/components/quiz/quiz-form-buttons";
import { appendSpeechTranscript } from "@/lib/quiz/speech";

type AnswerCardProps = {
  questionId: string;
  from: string;
  answer?: string;
  draftAnswer?: string;
  editable: boolean;
  hints?: string[];
  revealedAnswer?: string | null;
  formAction?: (formData: FormData) => void;
  onDraftAnswerChange?: (nextValue: string) => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
  length: number;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  const extendedWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };

  return extendedWindow.SpeechRecognition ?? extendedWindow.webkitSpeechRecognition ?? null;
}

function getSpeechRecognitionErrorMessage(error?: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone access was blocked. Allow microphone access and retry.";
  }

  if (error === "no-speech") {
    return "No speech was detected. Try again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found. Check your audio input and retry.";
  }

  return "Speech-to-text could not start in this browser.";
}

export function AnswerCard({
  questionId,
  from,
  answer,
  draftAnswer = "",
  editable,
  hints = [],
  revealedAnswer = null,
  formAction,
  onDraftAnswerChange,
}: AnswerCardProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningBaseAnswerRef = useRef(draftAnswer);
  const currentAnswerRef = useRef(draftAnswer);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    currentAnswerRef.current = draftAnswer;

    if (!isListening) {
      listeningBaseAnswerRef.current = draftAnswer;
    }
  }, [draftAnswer, isListening]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;

      if (!recognition) {
        return;
      }

      try {
        recognition.abort?.();
      } catch {}

      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  function handleSpeechResult(event: SpeechRecognitionEventLike) {
    let transcript = "";

    for (let index = 0; index < event.results.length; index += 1) {
      const alternative = event.results[index]?.[0]?.transcript;

      if (typeof alternative === "string" && alternative.trim().length > 0) {
        transcript += ` ${alternative}`;
      }
    }

    onDraftAnswerChange?.(appendSpeechTranscript(listeningBaseAnswerRef.current, transcript));
  }

  function ensureRecognition(): SpeechRecognitionLike | null {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US";
    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) => {
      setSpeechError(getSpeechRecognitionErrorMessage(event.error));
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;

    return recognition;
  }

  function handleMicrophoneClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = ensureRecognition();

    if (!recognition) {
      setSpeechError("Speech-to-text is not available in this browser.");
      return;
    }

    listeningBaseAnswerRef.current = currentAnswerRef.current;
    setSpeechError(null);

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("Speech-to-text could not start in this browser.");
      setIsListening(false);
    }
  }

  if (!editable) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{answer}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="from" value={from} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
          <button
            type="button"
            onClick={handleMicrophoneClick}
            aria-pressed={isListening}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
              isListening
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-zinc-300 text-slate-700 hover:bg-zinc-100"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V7a3.5 3.5 0 1 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Zm5.5-3.5a.75.75 0 0 1 1.5 0 7 7 0 0 1-6.25 6.96V22a.75.75 0 0 1-1.5 0v-3.04A7 7 0 0 1 5 12a.75.75 0 0 1 1.5 0 5.5 5.5 0 0 0 11 0Z" />
            </svg>
            {isListening ? "Stop microphone" : "Use microphone"}
          </button>
        </div>
        <textarea
          id="answer"
          name="answer"
          value={draftAnswer}
          onChange={(event) => onDraftAnswerChange?.(event.target.value)}
          className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Write your answer here"
          required
        />
        {isListening ? (
          <p className="text-sm text-emerald-700">Listening... your speech is being added to the answer box.</p>
        ) : null}
        {speechError ? <p className="text-sm text-amber-700">{speechError}</p> : null}
        <QuizFormButtons hintCount={hints.length} answerRevealed={revealedAnswer !== null} />
        {hints.length > 0 ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Hints</p>
            <ul className="mt-2 flex flex-col gap-2">
              {hints.map((hint, index) => (
                <li key={`hint-${index + 1}`} className="text-sm text-blue-900">
                  <span className="font-semibold">Hint {index + 1}:</span> {hint}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {revealedAnswer ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Revealed answer</p>
            <p className="mt-2 text-sm text-emerald-950">{revealedAnswer}</p>
          </div>
        ) : null}
      </form>
    </section>
  );
}
