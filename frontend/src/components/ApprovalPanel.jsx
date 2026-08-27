export default function ApprovalPanel({
  question,
  queries = [],
  onApprove,
  onReject,
  disabled = false,
}) {
  return (
    <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            ?
          </span>

          <h2 className="text-lg font-semibold text-slate-900">
            Review Research Plan
          </h2>
        </div>

        <p className="text-sm leading-6 text-slate-500">
          Before searching the web, ResearchBot generated the
          following research plan. Review the queries and decide
          whether to continue.
        </p>
      </div>

      {/* Research question */}
      <div className="mb-6 rounded-xl bg-slate-50 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Research Question
        </p>

        <p className="text-sm leading-6 text-slate-800">
          {question || "No question provided."}
        </p>
      </div>

      {/* Queries */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Search Queries
          </h3>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            {queries.length}{" "}
            {queries.length === 1 ? "query" : "queries"}
          </span>
        </div>

        {queries.length > 0 ? (
          <ol className="space-y-3">
            {queries.map((query, index) => (
              <li
                key={`${index}-${query}`}
                className="flex gap-3 rounded-xl border border-slate-200 p-4"
              >
                {/* Number */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>

                {/* Query */}
                <p className="text-sm leading-6 text-slate-700">
                  {query}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
            <p className="text-sm text-slate-500">
              No search queries were generated.
            </p>
          </div>
        )}
      </div>

      {/* Decision */}
      <div className="border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs text-slate-400">
          Approving this plan will start the web research.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className="
              flex-1
              rounded-xl
              border
              border-slate-300
              px-4
              py-2.5
              text-sm
              font-medium
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Reject
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={disabled || queries.length === 0}
            className="
              flex-1
              rounded-xl
              bg-slate-900
              px-4
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
            Approve & Research
          </button>
        </div>
      </div>
    </section>
  );
}