function getNodeLabel(node) {
  const labels = {
    plan_node: "Research plan generated",
    search_node: "Web search completed",
    fetch_node: "Sources fetched",
    synthesize_node: "Report synthesized",
    save_node: "Report saved",
  };

  return labels[node] || "Research step completed";
}


function getNodeIcon(node) {
  const icons = {
    plan_node: "◎",
    search_node: "⌕",
    fetch_node: "↓",
    synthesize_node: "✦",
    save_node: "✓",
  };

  return icons[node] || "•";
}


export default function ResearchProgress({
  steps = [],
  status = "researching",
}) {
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Research Progress
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isCompleted
              ? "Research completed."
              : isError
                ? "Something went wrong during research."
                : "ResearchBot is working on your question..."}
          </p>
        </div>

        {!isCompleted && !isError && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />

            <span className="text-xs font-medium text-slate-500">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <div className="mb-3 text-2xl">◌</div>

          <p className="text-sm font-medium text-slate-700">
            Starting research...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Waiting for the first research step.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <div
                key={`${step.node}-${index}`}
                className="flex gap-4"
              >
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      text-sm
                      font-medium
                      ${
                        isLast && !isCompleted
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }
                    `}
                  >
                    {getNodeIcon(step.node)}
                  </div>

                  {!isLast && (
                    <div className="h-full min-h-8 w-px bg-slate-200" />
                  )}
                </div>

                {/* Step information */}
                <div
                  className={`
                    min-w-0
                    flex-1
                    pb-6
                    ${isLast ? "" : ""}
                  `}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3
                      className={`
                        text-sm font-medium
                        ${
                          isLast && !isCompleted
                            ? "text-slate-900"
                            : "text-slate-700"
                        }
                      `}
                    >
                      {getNodeLabel(step.node)}
                    </h3>

                    {isLast && !isCompleted && (
                      <span className="shrink-0 text-xs text-slate-400">
                        Running
                      </span>
                    )}
                  </div>

                  {step.message && (
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {step.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion message */}
      {isCompleted && (
        <div className="mt-2 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
              ✓
            </span>

            <p className="text-sm font-medium text-slate-800">
              Research completed successfully.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}