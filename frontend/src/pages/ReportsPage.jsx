import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ReportList from "../components/ReportList";
import { getReports } from "../api/researchApi";

export default function ReportsPage() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState(null);

  const [retryCount, setRetryCount] = useState(0);


  // --------------------------------------------------
  // FETCH REPORTS
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setStatus("loading");
      setError(null);

      try {
        const data = await getReports();

        if (!isMounted) {
          return;
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid response received from the server."
          );
        }

        setReports(data);
        setStatus("success");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(
          "Failed to load reports:",
          error
        );

        setError(
          error.message ||
            "Unable to load research history."
        );

        setStatus("error");
      }
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);


  // --------------------------------------------------
  // OPEN REPORT
  // --------------------------------------------------

  const handleSelectReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };


  // --------------------------------------------------
  // RETRY
  // --------------------------------------------------

  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };


  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-slate-500">
            ResearchBot
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Research History
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Browse your previous research reports and open
            any report to view the complete result.
          </p>
        </div>


        {/* Loading */}
        {status === "loading" && (
          <div className="w-full max-w-4xl">
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="h-5 w-3/4 rounded bg-slate-200" />

                  <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Error */}
        {status === "error" && (
          <div className="w-full max-w-4xl rounded-2xl border border-red-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                !
              </span>

              <div>
                <h2 className="text-sm font-semibold text-red-800">
                  Failed to load research history
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              className="
                mt-5
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
              Try Again
            </button>
          </div>
        )}


        {/* Successful response */}
        {status === "success" && (
          <ReportList
            reports={reports}
            onSelect={handleSelectReport}
          />
        )}
      </div>
    </main>
  );
}