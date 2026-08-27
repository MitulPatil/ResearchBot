import express from "express";
import { compiledGraph } from "../services/researchbot-full.js";
import { Command } from "@langchain/langgraph";
import {v4 as uuidv4 } from "uuid";
import { pool } from "../db/db.js";

const router = express.Router(); 

function sendSSE(res, data){
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// --- START RESEARCH (runs until interrupt) ---
export const StartResearch = async (req,res) => {
    const question = req.query.q?.trim();

    if(!question){
        const err = new Error("Missing ?q=");
        err.status(400);
        return next(err);
    }

    // Generate a unique thread ID for this research session
    const threadId = uuidv4();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-catch");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin","*");
    res.flushHeaders();

    // Send the thread ID so the frontend knows how to resume
    sendSSE(res, {type : "session_started", threadId});

    try {
        // Run until interrupt — graph will pause inside planNode
        const stream = await compiledGraph.stream(
            { question },
            { configurable : { thread_id : threadId}}
        );

        for await (const chunk of stream){
            const [nodeName, nodeOutput] = Object.entries(chunk)[0];

            // Check if this is the interrupt signal
            if(nodeName === "__interrupt__"){
                // nodeOutput is the value passed to interrupt() in planNode
                sendSSE(res,{
                    type : "approval_required",
                    threadId,
                    queries : nodeOutput[0]?.value?.queries || [],
                    question : nodeOutput[0]?.value?.question || question,
                })
            }else {
                sendSSE(res, {type : "step", node: nodeName, message : `${nodeName} completed`});
            }
        }

        sendSSE(res, { type: "awaiting_approval" });
    } catch (error) {
        sendSSE(res, {type: "error", message : error.message});
    }

    res.end();
}

// --- APPROVE PLAN (resume from interrupt) ---
export const ApproveResearch = async (req, res) => {
  const { threadId, approved } = req.body;

  if (typeof approved !== "boolean") {
    return res.status(400).json({
      error: "approved must be a boolean",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    
    // Resume the graph by providing input to the interrupted node
    // Passing null as state means "resume from checkpoint"
    // The second argument contains the resume value for the interrupt

    /*
     * Resume the interrupted LangGraph execution.
     *
     * IMPORTANT:
     * Command({ resume: approved })
     * is what sends the value back to interrupt().
     */
    const stream = await compiledGraph.stream(
      new Command({
        // Must be an object: approvalNode reads userDecision?.approved.
        resume: { approved },
      }),
      {
        configurable: { thread_id: threadId },
      }
    );

    for await (const chunk of stream) {
      const [nodeName, nodeOutput] = Object.entries(chunk)[0];

      let message;
      switch (nodeName) {
        case "plan_node": message = "Plan confirmed"; break;
        case "approval_node": message = "Plan approved"; break;
        case "search_node": message = `Searched query ${(nodeOutput.currentQueryIndex || 1)}`; break;
        case "fetch_node": message = `Fetched ${nodeOutput.fetchedContent?.length || 0} pages`; break;
        case "synthesize_node": message = "Report synthesized"; break;
        case "save_node":
          message = nodeOutput.savedReportId
            ? `Report saved (ID: ${nodeOutput.savedReportId})`
            : "Report synthesis complete";
          break;
        default: message = `${nodeName} completed`;
      }

      sendSSE(res, {
        type: "step",
        node: nodeName,
        message,
        data: nodeName === "synthesize_node" ? { report: nodeOutput.report } : undefined,
        savedId: nodeName === "save_node" ? nodeOutput.savedReportId : undefined,
      });
    }

    /*
     * IMPORTANT:
     *
     * Only send "done" if the graph did NOT
     * interrupt again.
     */

      sendSSE(res, { type: "done",});
  } catch (error) {
    console.error(
      "Failed to resume research:",
      error
    );
    sendSSE(res, { type: "error", message: error.message });
  }

  res.end();
};

// --- LIST PAST REPORTS ---
export const getAllReports = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, question, created_at FROM research_reports ORDER BY created_at DESC LIMIT 20"
    );
    res.json(result.rows);
  } catch (error) {
    const err = new Error(error.message);
    err.status(500);
    return next(err);
  }
}

// --- GET ONE REPORT ---
export const getReportById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM research_reports WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (error) {
    const err = new Error(error.message);
    err.status(500);
    return next(err);
  }
}
