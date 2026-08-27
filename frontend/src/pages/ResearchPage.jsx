import { useState } from "react";

import ResearchForm from "../components/ResearchForm";
import ApprovalPanel from "../components/ApprovalPanel";
import ResearchProgress from "../components/ResearchProgress";
import ReportViewer from "../components/ReportViewer";

import {
  startResearch,
  approveResearch,
} from "../api/researchApi";

export default function ResearchPage() {
  // --------------------------------------------------
  // Research workflow state
  // --------------------------------------------------

  const [status, setStatus] = useState("idle");

  const [question, setQuestion] = useState("");

  const [threadId, setThreadId] = useState(null);

  const [queries, setQueries] = useState([]);

  const [steps, setSteps] = useState([]);

  const [report, setReport] = useState(null);

  const [savedReportId, setSavedReportId] =
    useState(null);

  const [error, setError] = useState(null);


  // --------------------------------------------------
  // START RESEARCH
  // --------------------------------------------------

  const handleStartResearch = async (newQuestion) => {
    /*
     * Reset state from any previous research.
     */
    setQuestion(newQuestion);
    setThreadId(null);
    setQueries([]);
    setSteps([]);
    setReport(null);
    setSavedReportId(null);
    setError(null);

    setStatus("planning");

    try {
      /*
       * startResearch() is an async generator.
       *
       * The loop runs once for every SSE event received
       * from the backend.
       */
      for await (const event of startResearch(
        newQuestion
      )) {
        handleStartEvent(event);
      }
    } catch (error) {
      console.error(
        "Failed to start research:",
        error
      );

      setError(error.message);
      setStatus("error");
    }
  };


  // --------------------------------------------------
  // HANDLE START-RESEARCH EVENTS
  // --------------------------------------------------

  const handleStartEvent = (event) => {
    if (!event || !event.type) {
      return;
    }

    switch (event.type) {
      /*
       * Backend:
       *
       * {
       *   type: "session_started",
       *   threadId
       * }
       */
      case "session_started": {
        setThreadId(event.threadId);
        break;
      }


      /*
       * Backend sends:
       *
       * {
       *   type: "step",
       *   node,
       *   message
       * }
       */
      case "step": {
        addStep(event);
        break;
      }


      /*
       * Backend sends the generated research plan.
       */
      case "approval_required": {
        setThreadId(event.threadId);

        setQueries(
          Array.isArray(event.queries)
            ? event.queries
            : []
        );

        if (event.question) {
          setQuestion(event.question);
        }

        setStatus("awaiting_approval");

        break;
      }


      /*
       * This means the graph has reached the
       * approval interrupt and is waiting for
       * the user's decision.
       */
      case "awaiting_approval": {
        setStatus("awaiting_approval");
        break;
      }


      /*
       * Backend-level error event.
       */
      case "error": {
        setError(
          event.message || "Research failed."
        );

        setStatus("error");

        break;
      }


      default:
        console.warn(
          "Unknown start event:",
          event
        );
    }
  };


  // --------------------------------------------------
  // APPROVE / REJECT PLAN
  // --------------------------------------------------

  const handleApproval = async (approved) => {
    if (!threadId) {
      setError(
        "Research session is missing. Please start again."
      );

      setStatus("error");

      return;
    }

    setError(null);
    setStatus("researching");

    try {
      /*
       * Resume the same LangGraph thread.
       *
       * approved = true  → continue research
       * approved = false → reject and end
       */
      for await (const event of approveResearch(
        threadId,
        approved
      )) {
        handleApprovalEvent(event);
      }
    } catch (error) {
      console.error(
        "Failed to resume research:",
        error
      );

      setError(error.message);
      setStatus("error");
    }
  };


  // --------------------------------------------------
  // HANDLE APPROVAL-STREAM EVENTS
  // --------------------------------------------------

  const handleApprovalEvent = (event) => {
    if (!event || !event.type) {
      return;
    }

    switch (event.type) {
      /*
       * Research step completed.
       */
      case "step": {
        addStep(event);

        /*
         * The backend sends the synthesized report
         * as data attached to synthesize_node.
         */
        if (
          event.node === "synthesize_node" &&
          event.data?.report
        ) {
          setReport(event.data.report);
        }

        /*
         * The backend sends the database ID after
         * save_node.
         */
        if (
          event.node === "save_node" &&
          event.savedId
        ) {
          setSavedReportId(event.savedId);
        }

        break;
      }


      /*
       * Research completed.
       */
      case "done": {
        setStatus("completed");
        break;
      }


      /*
       * Backend-level error.
       */
      case "error": {
        setError(
          event.message || "Research failed."
        );

        setStatus("error");

        break;
      }

      case "approval_required": {
        setThreadId(event.threadId);

        setQueries(
          Array.isArray(event.queries)
            ? event.queries
            : []
        );

        if (event.question) {
          setQuestion(event.question);
        }

        setStatus("awaiting_approval");

        break;
      }


      default:
        console.warn(
          "Unknown approval event:",
          event
        );
    }
  };


  // --------------------------------------------------
  // ADD A STEP TO THE TIMELINE
  // --------------------------------------------------

  const addStep = (event) => {
    setSteps((previousSteps) => [
      ...previousSteps,
      {
        type: event.type,
        node: event.node,
        message: event.message,
      },
    ]);
  };


  // --------------------------------------------------
  // RESET RESEARCH
  // --------------------------------------------------

  const handleNewResearch = () => {
    setStatus("idle");
    setQuestion("");
    setThreadId(null);
    setQueries([]);
    setSteps([]);
    setReport(null);
    setSavedReportId(null);
    setError(null);
  };


  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">

        {/* ------------------------------------------ */}
        {/* Page heading                                */}
        {/* ------------------------------------------ */}

        <div className="mb-8 w-full max-w-3xl">
          <p className="mb-2 text-sm font-medium text-slate-500">
            ResearchBot
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Deep Research
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ask a question, review the research plan,
            and let the agent investigate the web.
          </p>
        </div>


        {/* ------------------------------------------ */}
        {/* Error                                      */}
        {/* ------------------------------------------ */}

        {error && (
          <div className="mb-6 w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                !
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Research failed
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* ------------------------------------------ */}
        {/* Initial form                               */}
        {/* ------------------------------------------ */}

        {status === "idle" && (
          <ResearchForm
            onSubmit={handleStartResearch}
          />
        )}


        {/* ------------------------------------------ */}
        {/* Planning                                  */}
        {/* ------------------------------------------ */}

        {status === "planning" && (
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <span className="h-4 w-4 animate-pulse rounded-full bg-slate-900" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              Creating research plan
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              ResearchBot is analyzing your question and
              generating search queries.
            </p>
          </div>
        )}


        {/* ------------------------------------------ */}
        {/* Approval                                 */}
        {/* ------------------------------------------ */}

        {status === "awaiting_approval" && (
          <ApprovalPanel
            question={question}
            queries={queries}
            onApprove={() =>
              handleApproval(true)
            }
            onReject={() =>
              handleApproval(false)
            }
          />
        )}


        {/* ------------------------------------------ */}
        {/* Research progress                         */}
        {/* ------------------------------------------ */}

        {(status === "researching" ||
          status === "completed") && (
          <div className="w-full">
            <div className="mb-6 flex justify-center">
              <ResearchProgress
                steps={steps}
                status={status}
              />
            </div>

            {/* -------------------------------------- */}
            {/* Final report                           */}
            {/* -------------------------------------- */}

            {report && (
              <div className="flex justify-center">
                <ReportViewer
                  report={report}
                  question={question}
                  savedReportId={savedReportId}
                />
              </div>
            )}

            {/* -------------------------------------- */}
            {/* New research                           */}
            {/* -------------------------------------- */}

            {status === "completed" && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleNewResearch}
                  className="
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-5
                    py-2.5
                    text-sm
                    font-medium
                    text-slate-700
                    shadow-sm
                    transition
                    hover:bg-slate-50
                  "
                >
                  Start New Research
                </button>
              </div>
            )}
          </div>
        )}


        {/* ------------------------------------------ */}
        {/* Error recovery                            */}
        {/* ------------------------------------------ */}

        {status === "error" && (
          <div className="w-full max-w-3xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Research could not be completed
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You can start a new research session and try
                again.
              </p>

              <button
                type="button"
                onClick={handleNewResearch}
                className="
                  mt-5
                  rounded-xl
                  bg-slate-900
                  px-5
                  py-2.5
                  text-sm
                  font-medium
                  text-white
                  transition
                  hover:bg-slate-700
                "
              >
                Start New Research
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}