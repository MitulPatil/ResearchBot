import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ReportViewer from "../components/ReportViewer";
import { getReportById } from "../api/researchApi";

export default function ReportDetailPage() {
  const { id } = useParams();

  const [report, setReport] = useState(null);

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState(null);


  // --------------------------------------------------
  // FETCH REPORT
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      setStatus("loading");
      setError(null);

      try {
        const data = await getReportById(id);

        if (!isMounted) {
          return;
        }

        setReport(data);
        setStatus("success");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(
          "Failed to load report:",
          error
        );

        setError(
          error.message ||
            "Unable to load this research report."
        );

        setStatus("error");
      }
    };

    if (id) {
      loadReport();
    } else {
      setError("Report ID is missing.");
      setStatus("error");
    }

    return () => {
      isMounted = false;
    };
  }, [id]);


  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Back navigation */}
        <div className="mb-6">
          <Link
            to="/reports"
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              font-medium
              text-slate-500
              transition
              hover:text-slate-900
            "
          >
            <span aria-hidden="true">←</span>
            Back to Research History
          </Link>
        </div>


        {/* ------------------------------------------ */}
        {/* Loading                                   */}
        {/* ------------------------------------------ */}

        {status === "loading" && (
          <div className="mx-auto w-full max-w-4xl">
            <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">

              {/* Header skeleton */}
              <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
                <div className="h-4 w-32 rounded bg-slate-200" />

                <div className="mt-4 h-7 w-3/4 rounded bg-slate-200" />

                <div className="mt-3 h-3 w-40 rounded bg-slate-100" />
              </div>

              {/* Content skeleton */}
              <div className="space-y-5 px-6 py-8 sm:px-8">
                <div className="h-6 w-48 rounded bg-slate-200" />

                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-4 w-5/6 rounded bg-slate-100" />
                </div>

                <div className="h-6 w-56 rounded bg-slate-200" />

                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-4 w-11/12 rounded bg-slate-100" />
                  <div className="h-4 w-4/5 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ------------------------------------------ */}
        {/* Error                                     */}
        {/* ------------------------------------------ */}

        {status === "error" && (
          <div className="mx-auto w-full max-w-4xl rounded-2xl border border-red-200 bg-white p-6">

            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                !
              </span>

              <div>
                <h2 className="text-sm font-semibold text-red-800">
                  Unable to load report
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <Link
              to="/reports"
              className="
                mt-5
                inline-flex
                rounded-xl
                bg-slate-900
                px-4
                py-2.5
                text-sm
                font-medium
                text-white
                transition
                hover:bg-slate-700
              "
            >
              View Research History
            </Link>
          </div>
        )}


        {/* ------------------------------------------ */}
        {/* Report                                   */}
        {/* ------------------------------------------ */}

        {status === "success" && report && (
          <div className="flex justify-center">
            <ReportViewer
              report={report.report_content}
              question={report.question}
              createdAt={report.created_at}
              savedReportId={report.id}
            />
          </div>
        )}
      </div>
    </main>
  );
}