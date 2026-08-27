export default function ReportList({
  reports = [],
  onSelect,
}) {
  if (reports.length === 0) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
          ◌
        </div>

        <h2 className="text-lg font-semibold text-slate-800">
          No research reports yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Completed research reports will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full max-w-4xl">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Previous Research
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Open a previous research report to view the
          complete result.
        </p>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report.id)}
            className="
              group
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:border-slate-300
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between gap-5">
              {/* Report information */}
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900">
                  {report.question}
                </h3>

                <p className="mt-2 text-xs text-slate-400">
                  {formatDate(report.created_at)}
                </p>
              </div>

              {/* Arrow */}
              <span
                className="
                  mt-1
                  shrink-0
                  text-lg
                  text-slate-300
                  transition
                  group-hover:translate-x-1
                  group-hover:text-slate-600
                "
                aria-hidden="true"
              >
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}


/**
 * Format the PostgreSQL timestamp returned by the backend.
 */
function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}