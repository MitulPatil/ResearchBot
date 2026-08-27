import { parseSSE } from "../utils/sseParser";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not defined. Check your frontend .env file."
  );
}

/**
 * Start a new research session.
 *
 * Backend:
 * GET /api/v1/research/start?q=<question>
 *
 * The backend streams SSE events until the graph reaches
 * the human approval interrupt.
 *
 * Usage:
 *
 * for await (const event of startResearch(question)) {
 *   console.log(event);
 * }
 */
export async function* startResearch(question) {
  const trimmedQuestion = question?.trim();

  if (!trimmedQuestion) {
    throw new Error("Research question cannot be empty.");
  }

  const url = new URL(`${API_URL}/start`);

  url.searchParams.set("q", trimmedQuestion);

  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to the research server: ${error.message}`
    );
  }

  yield* parseSSE(response);
}


/**
 * Approve or reject the generated research plan.
 *
 * Backend:
 * POST /api/v1/research/approved
 *
 * Body:
 * {
 *   threadId: string,
 *   approved: boolean
 * }
 *
 * The backend resumes the same LangGraph thread and
 * streams the remaining research steps.
 *
 * Usage:
 *
 * for await (
 *   const event of approveResearch(threadId, true)
 * ) {
 *   console.log(event);
 * }
 */
export async function* approveResearch(
  threadId,
  approved
) {
  if (!threadId) {
    throw new Error("threadId is required.");
  }

  if (typeof approved !== "boolean") {
    throw new Error(
      "approved must be a boolean."
    );
  }

  let response;

  try {
    response = await fetch(`${API_URL}/approved`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },

      body: JSON.stringify({
        threadId,
        approved,
      }),
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to the research server: ${error.message}`
    );
  }

  yield* parseSSE(response);
}


/**
 * Get the latest research reports.
 *
 * Backend:
 * GET /api/v1/research/reports
 *
 * Returns:
 *
 * [
 *   {
 *     id,
 *     question,
 *     created_at
 *   }
 * ]
 */
export async function getReports() {
  let response;

  try {
    response = await fetch(`${API_URL}/reports`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to the research server: ${error.message}`
    );
  }

  if (!response.ok) {
    let message = `Failed to fetch reports (HTTP ${response.status})`;

    try {
      const data = await response.json();

      if (data?.error) {
        message = data.error;
      }
    } catch {
      // Response wasn't valid JSON.
    }

    throw new Error(message);
  }

  return response.json();
}


/**
 * Get one complete research report.
 *
 * Backend:
 * GET /api/v1/research/report/:id
 *
 * Returns the complete persisted report.
 */
export async function getReportById(id) {
  if (!id) {
    throw new Error("Report ID is required.");
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}/report/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    throw new Error(
      `Unable to connect to the research server: ${error.message}`
    );
  }

  if (!response.ok) {
    let message = `Failed to fetch report (HTTP ${response.status})`;

    try {
      const data = await response.json();

      if (data?.error) {
        message = data.error;
      }
    } catch {
      // Response wasn't valid JSON.
    }

    throw new Error(message);
  }

  return response.json();
}