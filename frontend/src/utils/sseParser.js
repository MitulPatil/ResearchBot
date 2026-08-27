/**
 * Parse an SSE response from fetch().
 *
 * The backend sends events in this format:
 *
 * data: {"type":"step","node":"search_node"}
 *
 * data: {"type":"done"}
 *
 * SSE events are separated by a blank line:
 *
 * \n\n
 *
 * Important:
 * A single fetch() chunk is NOT guaranteed to contain
 * exactly one SSE event.
 *
 * An event can be split across multiple chunks.
 *
 * Therefore we maintain a buffer until we receive
 * a complete SSE event.
 */

export async function* parseSSE(response) {
  if (!response.ok) {
    throw new Error(
      `Request failed with HTTP ${response.status}`
    );
  }

  if (!response.body) {
    throw new Error("Response body is not available");
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      // The server has finished sending data.
      if (done) {
        break;
      }

      // Convert Uint8Array → string.
      buffer += decoder.decode(value, {
        stream: true,
      });

      /*
       * One SSE event looks like:
       *
       * data: {"type":"step",...}\n\n
       *
       * Therefore \n\n marks the end of an event.
       */
      const events = buffer.split("\n\n");

      /*
       * The last item may be incomplete.
       *
       * Example:
       *
       * buffer =
       * "data: {...}\n\n
       *  data: {\"type\":\"ste"
       *
       * split() gives:
       *
       * [
       *   "data: {...}",
       *   "data: {\"type\":\"ste"
       * ]
       *
       * The second item is incomplete, so we keep it
       * in buffer for the next network chunk.
       */
      buffer = events.pop();

      for (const event of events) {
        const parsedEvent = parseSSEEvent(event);

        if (parsedEvent !== null) {
          yield parsedEvent;
        }
      }
    }

    /*
     * Flush any remaining bytes from TextDecoder.
     */
    buffer += decoder.decode();

    /*
     * Usually buffer should be empty here because the backend
     * terminates events with \n\n.
     *
     * But parsing it makes the function more robust.
     */
    if (buffer.trim()) {
      const parsedEvent = parseSSEEvent(buffer);

      if (parsedEvent !== null) {
        yield parsedEvent;
      }
    }
  } finally {
    /*
     * If the consumer stops reading early, release the reader.
     */
    reader.releaseLock();
  }
}


/**
 * Convert one complete SSE event into a JavaScript object.
 *
 * Input:
 *
 * data: {"type":"done"}
 *
 * Output:
 *
 * {
 *   type: "done"
 * }
 */
function parseSSEEvent(event) {
  const lines = event.split("\n");

  const dataLines = [];

  for (const line of lines) {
    /*
     * SSE data lines start with:
     *
     * data:
     */
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  /*
   * Ignore events that don't contain data.
   */
  if (dataLines.length === 0) {
    return null;
  }

  /*
   * Multiple data: lines can technically belong
   * to one SSE event.
   *
   * Join them with newline.
   */
  const data = dataLines.join("\n");

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse SSE JSON:", data);

    throw new Error(
      `Invalid SSE JSON: ${error.message}`
    );
  }
}