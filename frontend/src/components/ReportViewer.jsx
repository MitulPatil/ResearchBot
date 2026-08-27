import ReactMarkdown from "react-markdown";

export default function ReportViewer({
  report,
  question,
  createdAt,
  savedReportId,
}) {
  if (!report) {
    return null;
  }

  return (
    <article className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <header className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
            ✓
          </span>

          <span className="text-sm font-medium text-slate-600">
            Research Complete
          </span>
        </div>

        {question && (
          <h1 className="text-xl font-semibold leading-8 text-slate-900">
            {question}
          </h1>
        )}

        {(createdAt || savedReportId) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {createdAt && (
              <span>
                {formatDate(createdAt)}
              </span>
            )}

            {savedReportId && (
              <span>
                Report #{savedReportId}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Markdown report */}
      <div className="px-6 py-8 sm:px-8">
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="mb-5 mt-0 text-3xl font-bold tracking-tight text-slate-900">
                  {children}
                </h1>
              ),

              h2: ({ children }) => (
                <h2 className="mb-4 mt-10 border-b border-slate-200 pb-2 text-2xl font-semibold text-slate-900">
                  {children}
                </h2>
              ),

              h3: ({ children }) => (
                <h3 className="mb-3 mt-7 text-xl font-semibold text-slate-800">
                  {children}
                </h3>
              ),

              p: ({ children }) => (
                <p className="mb-4 text-[15px] leading-7 text-slate-700">
                  {children}
                </p>
              ),

              ul: ({ children }) => (
                <ul className="mb-5 ml-5 list-disc space-y-2 text-[15px] leading-7 text-slate-700">
                  {children}
                </ul>
              ),

              ol: ({ children }) => (
                <ol className="mb-5 ml-5 list-decimal space-y-2 text-[15px] leading-7 text-slate-700">
                  {children}
                </ol>
              ),

              li: ({ children }) => (
                <li className="pl-1">
                  {children}
                </li>
              ),

              blockquote: ({ children }) => (
                <blockquote className="my-5 border-l-4 border-slate-300 pl-4 italic text-slate-600">
                  {children}
                </blockquote>
              ),

              code: ({ children, className }) => {
                const isCodeBlock =
                  className?.includes("language-");

                if (isCodeBlock) {
                  return (
                    <code
                      className={`${className || ""} block overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm leading-6 text-slate-100`}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-800">
                    {children}
                  </code>
                );
              },

              pre: ({ children }) => (
                <pre className="my-5 overflow-x-auto rounded-xl bg-slate-900">
                  {children}
                </pre>
              ),

              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
                >
                  {children}
                </a>
              ),

              hr: () => (
                <hr className="my-8 border-slate-200" />
              ),

              table: ({ children }) => (
                <div className="my-6 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),

              th: ({ children }) => (
                <th className="border border-slate-200 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-800">
                  {children}
                </th>
              ),

              td: ({ children }) => (
                <td className="border border-slate-200 px-4 py-3 text-slate-700">
                  {children}
                </td>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}


/**
 * Convert the backend timestamp into a readable date.
 */
function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}