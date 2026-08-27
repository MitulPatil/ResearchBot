import { useState } from "react";

export default function ResearchForm({
  onSubmit,
  disabled = false,
}) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || disabled) {
      return;
    }

    onSubmit(trimmedQuestion);
  };

  const canSubmit =
    question.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Heading */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            What do you want to research?
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Ask a question and ResearchBot will create a
            research plan before searching the web.
          </p>
        </div>

        {/* Question input */}
        <label
          htmlFor="research-question"
          className="sr-only"
        >
          Research question
        </label>

        <textarea
          id="research-question"
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          placeholder="e.g. How will AI agents change software engineering?"
          disabled={disabled}
          rows={5}
          maxLength={2000}
          className="
            w-full
            resize-none
            rounded-xl
            border
            border-slate-300
            bg-slate-50
            px-4
            py-3
            text-sm
            text-slate-900
            outline-none
            transition
            placeholder:text-slate-400
            focus:border-slate-500
            focus:bg-white
            focus:ring-2
            focus:ring-slate-200
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />

        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {question.length}/2000
          </span>

          <button
            type="submit"
            disabled={!canSubmit}
            className="
              rounded-xl
              bg-slate-900
              px-5
              py-2.5
              text-sm
              font-medium
              text-white
              transition
              hover:bg-slate-700
              disabled:cursor-not-allowed
              disabled:bg-slate-300
            "
          >
            {disabled ? "Researching..." : "Start Research"}
          </button>
        </div>
      </div>
    </form>
  );
}