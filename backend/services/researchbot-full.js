// researchbot-full.js
// Complete ResearchBot: plan → [human approval] → search → fetch → synthesize → save
// Week 15: Full agent with URL fetching, human-in-the-loop, and PostgreSQL persistence.

import { StateGraph, END, Annotation, interrupt } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../db/db.js";
import config from "../config.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

// =============================================================================
// STATE SCHEMA — Extended for the full graph
// =============================================================================

const ResearchState = Annotation.Root({
  // The user's question — set once, never changed
  question: Annotation({ reducer: (_, v) => v, default: () => "" }),

  // The 3 search queries planNode generates
  plannedQueries: Annotation({ reducer: (_, v) => v, default: () => [] }),

  // Whether the user approved the plan — set by the approval mechanism
  // "approved", "rejected", or "" (pending)
  planApproved: Annotation({ reducer: (_, v) => v, default: () => "" }),

  // Which query index searchNode is currently processing
  currentQueryIndex: Annotation({ reducer: (_, v) => v, default: () => 0 }),

  // Accumulated search results (Tavily snippets) — appended per search
  searchResults: Annotation({
    reducer: (existing, newItems) => existing.concat(newItems),
    default: () => [],
  }),

  // Accumulated fetched page content — appended per URL fetch
  // Each item: { url, title, content (cleaned text) }
  fetchedContent: Annotation({
    reducer: (existing, newItems) => existing.concat(newItems),
    default: () => [],
  }),

  // The final structured report — set once by synthesizeNode
  report: Annotation({ reducer: (_, v) => v, default: () => "" }),

  // The database row ID of the saved report
  savedReportId: Annotation({ reducer: (_, v) => v, default: () => null }),
});

// =============================================================================
// PLAN NODE
// Reads: state.question
// Writes: state.plannedQueries
// =============================================================================

async function planNode(state) {
  console.log("\n[planNode] Planning queries for:", state.question);

  const prompt = `
Research question: "${state.question}"

Generate exactly 3 highly specific search queries that together comprehensively
answer this question. Each query should explore a distinct angle.

Return ONLY a JSON array of 3 strings. No markdown, no explanation.
Example: ["specific query one", "specific query two", "specific query three"]
`.trim();

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json\n?|```/g, "");
  const queries = JSON.parse(raw);

  console.log("[planNode] Generated:", queries);

  // The human-in-the-loop pause lives in approvalNode, not here. Keeping the
  // Gemini call isolated in this node means it runs exactly once: an interrupted
  // node re-runs from the top on resume, so if the interrupt lived here the
  // queries would be regenerated and the user's approved plan discarded.
  return { plannedQueries: queries };
}

// =============================================================================
// APPROVAL NODE
// The only node that interrupts. It re-runs from the top on resume, but does no
// expensive work — it just surfaces the already-generated queries for approval
// and records the human's decision.
// Reads: state.plannedQueries, state.question
// Writes: state.planApproved
// =============================================================================

async function approvalNode(state) {
  console.log("\n[approvalNode] Awaiting approval for:", state.plannedQueries);

  // interrupt() suspends the graph and returns its payload to the stream caller.
  // On resume it returns whatever was passed via Command({ resume }).
  const userDecision = interrupt({
    type: "plan_approval_required",
    queries: state.plannedQueries, // the queries planNode already generated
    question: state.question,      // original question for frontend context
  });

  // On resume this is the value from Command({ resume: { approved } }).
  console.log("[approvalNode] Resumed with decision:", userDecision);

  return {
    planApproved: userDecision?.approved ? "approved" : "rejected",
  };
}

// =============================================================================
// CONDITIONAL EDGE: After planNode
// Routes to search if approved, to END if rejected.
// =============================================================================

function routeAfterPlan(state) {
  if (state.planApproved === "approved") {
    console.log("[routeAfterPlan] Approved — proceeding to search");
    return "search_node";
  }
  console.log("[routeAfterPlan] Rejected — ending research");
  return END;
}

// =============================================================================
// SEARCH NODE
// Same as Week 14 — calls Tavily for one query, appends results.
// Reads: state.plannedQueries, state.currentQueryIndex
// Writes: state.searchResults (append), state.currentQueryIndex (replace)
// =============================================================================

async function searchNode(state) {
  const query = state.plannedQueries[state.currentQueryIndex];
  console.log(`\n[searchNode] Searching [${state.currentQueryIndex}]: "${query}"`);

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.tavilyApiKey}`,
    },
    body: JSON.stringify({ query, max_results: 3, search_depth: "basic" }),
  });

  const data = await response.json();

  const results = (data.results || [])
    .filter((r) => r.score >= 0.3 && r.content?.length > 50)
    .slice(0, 3)
    .map((r, i) => ({
      query,
      rank: i + 1,
      title: r.title,
      url: r.url,
      snippet: r.content.slice(0, 400), // Short snippet only — fetch node gets full content
    }));

  console.log(`[searchNode] Found ${results.length} results`);

  return {
    searchResults: results,
    currentQueryIndex: state.currentQueryIndex + 1,
  };
}

// =============================================================================
// CONDITIONAL EDGE: After searchNode
// Routes back to search if more queries remain, otherwise to fetch.
// =============================================================================

function routeAfterSearch(state) {
  if (state.currentQueryIndex < state.plannedQueries.length) {
    return "search_node";
  }
  return "fetch_node"; // All queries done — now fetch the top URL from each
}

// =============================================================================
// URL FETCH UTILITY
// Fetches a URL, strips HTML, cleans whitespace, truncates.
// Returns cleaned text or null on failure.
// =============================================================================

async function fetchAndCleanUrl(url) {
  try {
    // Set a timeout — we cannot wait forever for a slow page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Identify as a browser to avoid bot blocking
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId); // Cancel timeout if request completes

    if (!response.ok) {
      // 404, 403, 500 — page is unavailable
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // PDFs, images, zip files — cannot extract text from these
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await response.text(); // Get raw HTML

    // Remove script and style blocks first — their content is never useful
    // These can be thousands of characters of JavaScript that confuse the cleaner
    const withoutScripts = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ") // Remove script tags and content
      .replace(/<style[\s\S]*?<\/style>/gi, " ");  // Remove style tags and content

    // Remove all remaining HTML tags — everything inside < >
    // This leaves only the visible text content
    const textOnly = withoutScripts.replace(/<[^>]+>/g, " ");

    // Collapse multiple spaces and newlines into single spaces
    // Also decode common HTML entities
    const cleaned = textOnly
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ") // Collapse all whitespace
      .trim();

    // Truncate to 4000 characters — this is the per-URL limit
    // 4000 chars ≈ 1000 tokens. With 3 URLs, that is 3000 tokens for all fetched content.
    // Staying within this limit prevents context window overflow in synthesizeNode.
    const truncated = cleaned.slice(0, 4000);

    return { success: true, content: truncated, charCount: truncated.length };
  } catch (error) {
    // Return failure gracefully — the agent continues without this URL's content
    return { success: false, error: error.message, content: null };
  }
}

// =============================================================================
// FETCH NODE
// Fetches the top URL from each search result group.
// Reads: state.searchResults
// Writes: state.fetchedContent (append per URL)
// =============================================================================

async function fetchNode(state) {
  console.log("\n[fetchNode] Fetching top URLs from search results...");

  const fetched = [];

  // Group search results by query — take only the top result per query
  // We have up to 9 results (3 per query × 3 queries) — we only fetch 3 top ones
  // Fetching all 9 would be too much content for the synthesis prompt
  const topResultPerQuery = {};
  for (const result of state.searchResults) {
    if (!topResultPerQuery[result.query]) {
      // First result for this query — this is the highest-ranked one
      topResultPerQuery[result.query] = result;
    }
  }

  const urlsToFetch = Object.values(topResultPerQuery); // One URL per query = 3 total

  for (const result of urlsToFetch) {
    console.log(`[fetchNode] Fetching: ${result.url.slice(0, 60)}...`);

    const fetchResult = await fetchAndCleanUrl(result.url);

    if (fetchResult.success) {
      fetched.push({
        query: result.query,  // Which query this page answers
        title: result.title,  // Page title for the report
        url: result.url,      // URL for citation
        content: fetchResult.content, // Cleaned, truncated text
      });
      console.log(
        `[fetchNode] ✓ ${result.title.slice(0, 40)}... (${fetchResult.charCount} chars)`
      );
    } else {
      // URL fetch failed — log it but continue
      // The synthesis node will work with whatever we successfully fetched
      console.warn(`[fetchNode] ✗ Failed: ${fetchResult.error} — ${result.url}`);
    }
  }

  console.log(
    `[fetchNode] Fetched ${fetched.length}/${urlsToFetch.length} URLs successfully`
  );

  return {
    fetchedContent: fetched, // Appended to existing array (though this node runs once)
  };
}

// =============================================================================
// SYNTHESIZE NODE
// Combines all fetched content into a structured report.
// Reads: state.question, state.searchResults, state.fetchedContent
// Writes: state.report
// =============================================================================

async function synthesizeNode(state) {
  console.log("\n[synthesizeNode] Synthesizing report...");

  // Build the sources section of the prompt — fetched content is primary
  const fetchedSection = state.fetchedContent.length > 0
    ? state.fetchedContent
        .map(
          (item, i) =>
            `### Source ${i + 1}: ${item.title}\nURL: ${item.url}\nRelevant to: "${item.query}"\n\n${item.content}`
        )
        .join("\n\n---\n\n")
    : "No full page content was successfully fetched.";

  // Also include snippets from search results that were not fetched
  // This gives Gemini broader context even if full pages are unavailable
  const snippetSection = state.searchResults
    .filter(
      (r) => !state.fetchedContent.some((f) => f.url === r.url) // Not already fetched
    )
    .slice(0, 6) // Limit additional snippets to control prompt size
    .map((r, i) => `Snippet ${i + 1}: ${r.title}\n${r.snippet}`)
    .join("\n\n");

  // The structured prompt — every field is specified, every section is named.
  // This prompt produces the same structure on every run.
  const prompt = `
You are a professional research analyst. Using the sources below, write a comprehensive
research report on the following question.

RESEARCH QUESTION: "${state.question}"

FULL PAGE CONTENT (primary sources — prioritize these):
${fetchedSection}

ADDITIONAL SEARCH SNIPPETS (secondary sources):
${snippetSection || "None"}

REPORT REQUIREMENTS:
Write the report using this EXACT structure with these EXACT section headers:

## Introduction
(2-3 sentences: state the research question and briefly preview the key findings)

## Key Findings
(4-6 bullet points. Each bullet must include an inline citation like [Source 1].
Each finding must be a specific, concrete fact or insight — not vague summaries.)

## Analysis
(2-3 paragraphs: synthesize the findings, explain connections between them,
note any contradictions or gaps in the research)

## Limitations
(1 paragraph: what this research did not cover, what would require deeper investigation)

## Sources
(Numbered list of all URLs cited, one per line, in the format:
1. https://url.com — Page Title)

## Conclusion
(2-3 sentences: answer the original question directly based on the research)

CRITICAL RULES:
- Use ONLY information from the provided sources
- Every claim in Key Findings must have a [Source N] citation
- Do not invent URLs or sources
- Use markdown formatting exactly as shown above
`.trim();

  const result = await model.generateContent(prompt);
  const report = result.response.text();

  console.log(`[synthesizeNode] Report generated — ${report.length} characters`);

  return { report };
}

// =============================================================================
// SAVE NODE
// Saves the completed report to PostgreSQL.
// Reads: state.question, state.report, state.fetchedContent, state.searchResults
// Writes: state.savedReportId
// =============================================================================

async function saveNode(state) {
  console.log("\n[saveNode] Saving report to database...");

  // Extract sources from fetchedContent and searchResults
  const sources = [
    ...state.fetchedContent.map((f) => ({ url: f.url, title: f.title })),
    ...state.searchResults
      .filter((r) => !state.fetchedContent.some((f) => f.url === r.url))
      .map((r) => ({ url: r.url, title: r.title })),
  ];

  // Remove duplicate URLs
  const uniqueSources = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i
  );

  const query = `
    INSERT INTO research_reports
      (question, report_content, sources, search_queries, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id
  `;

  const values = [
    state.question,                        // The research question
    state.report,                          // The full markdown report
    JSON.stringify(uniqueSources),         // Sources as JSON array
    JSON.stringify(state.plannedQueries),  // The queries that were used
  ];

  try {
    const result = await pool.query(query, values);
    const savedId = result.rows[0].id;
    console.log(`[saveNode] Saved — report ID: ${savedId}`);
    return { savedReportId: savedId };
  } catch (error) {
    // Log but do not crash the graph — the report still exists in state
    console.error("[saveNode] Database save failed:", error.message);
    return { savedReportId: null };
  }
}

// =============================================================================
// GRAPH ASSEMBLY
// =============================================================================

const checkpointer = PostgresSaver.fromConnString(
  config.databaseUrl
);

await checkpointer.setup();
// For production, use a database-backed checkpointer (PostgresSaver from LangGraph).

const graph = new StateGraph(ResearchState);

graph.addNode("plan_node", planNode);
graph.addNode("approval_node", approvalNode);
graph.addNode("search_node", searchNode);
graph.addNode("fetch_node", fetchNode);
graph.addNode("synthesize_node", synthesizeNode);
graph.addNode("save_node", saveNode);

graph.setEntryPoint("plan_node");

// plan_node generates the queries, then hands off to approval_node, which
// pauses for the human decision. Routing to search/END happens after approval.
graph.addEdge("plan_node", "approval_node");

graph.addConditionalEdges("approval_node", routeAfterPlan, {
  search_node: "search_node",
  [END]: END,
});

graph.addConditionalEdges("search_node", routeAfterSearch, {
  search_node: "search_node",
  fetch_node: "fetch_node",
});

graph.addEdge("fetch_node", "synthesize_node");
graph.addEdge("synthesize_node", "save_node");
graph.addEdge("save_node", END);

const compiledGraph = graph.compile({
  checkpointer,
});

export { compiledGraph, ResearchState };