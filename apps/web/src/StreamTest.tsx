import { useState } from "react";

// API_BASE: Use VITE_API_TARGET for dev proxy, or VITE_BASE_PATH for production sub-path deployment
const API_BASE =
  import.meta.env.VITE_API_TARGET ||
  (import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : "");

export default function StreamTest() {
  const [output, setOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testStreaming = async () => {
    setIsLoading(true);
    setOutput("");

    try {
      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "p1",
          model: "gpt-4o",
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream done");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              console.log("Received [DONE]");
              continue;
            }
            try {
              const json = JSON.parse(data);
              // OpenAI 原始格式: choices[0].delta.content
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                setOutput((prev) => prev + content);
              }
            } catch (e) {
              console.log("Parse error:", data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setOutput(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>SSE Streaming Test</h1>

      <button
        onClick={testStreaming}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: isLoading ? "not-allowed" : "pointer",
          backgroundColor: isLoading ? "#ccc" : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "8px",
        }}
      >
        {isLoading ? "Generating..." : "Test Streaming"}
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>Output:</h3>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            minHeight: "200px",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          {output || "Click button to start..."}
        </div>
      </div>
    </div>
  );
}
