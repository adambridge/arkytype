const wordElement = document.getElementById("lastKey");
const statusElement = document.getElementById("status");

if (!wordElement) {
  throw new Error("Missing #lastKey element");
}

function setStatus(msg: string | null) {
  if (statusElement) {
    statusElement.textContent = msg ?? "";
  }
}

let lines: string[] = [];

let totalChars = 0;
let typedCount = 0;
let nextLines: string[] | null = null;
const FETCH_RETRY_LIMIT = 3;
const FALLBACK_HAIKU = [
  "an old silent pond",
  "a frog jumps into the pond—",
  "splash! silence again."
];
const HAIKU_URL = "https://haikuguy.com/issa/random.php";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

async function fetchHaikuText(): Promise<string | null> {
  try {
    const res = await fetch(HAIKU_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } catch (firstError) {
    console.warn("Direct haiku fetch failed; retrying with CORS proxy:", firstError);
    try {
      const proxyRes = await fetch(`${CORS_PROXY}${encodeURIComponent(HAIKU_URL)}`);
      if (!proxyRes.ok) {
        throw new Error(`Proxy HTTP ${proxyRes.status}`);
      }
      return await proxyRes.text();
    } catch (proxyError) {
      console.warn("Proxy haiku fetch also failed:", proxyError);
      return null;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchNextHaiku(attempt = 1): Promise<void> {
  try {
    const text = await fetchHaikuText();
    if (text === null) {
      if (attempt < FETCH_RETRY_LIMIT) {
        setStatus(`Failed to load haiku; retrying (${attempt})...`);
        setTimeout(() => fetchNextHaiku(attempt + 1), 3000);
        return;
      }
      // give up and use fallback
      nextLines = FALLBACK_HAIKU;
      setStatus(null);
      return;
    }
    // Parse the returned HTML and select the paragraph with class="english"
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const p = doc.querySelector("p.english");

    if (p) {
      // Extract clean paragraph text and preserve line breaks from <br>
      const temp = document.createElement("div");
      temp.innerHTML = p.innerHTML || "";
      temp.querySelectorAll("br").forEach((br) => {
        br.replaceWith("\n");
      });

      const cleaned = temp.textContent
        ?.replace(/\r/g, "")
        .replace(/--/g, "") ?? "";
      const extracted = cleaned
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (extracted.length > 0) {
        if (lines.length === 0) {
          // first load: apply immediately and then prefetch next
          lines = extracted;
          totalChars = lines.reduce((sum, line) => sum + line.length, 0);
          typedCount = 0;
          setStatus(null);
          renderText();
          // prefetch another haiku for smooth transitions
          fetchNextHaiku();
        } else {
          nextLines = extracted;
          setStatus(null);
        }
      }
    } else {
      console.warn('No paragraph.p.english found in fetched document');
    }
  } catch (e) {
    console.warn("Failed to fetch next haiku:", e);
      if (lines.length === 0) {
        lines = FALLBACK_HAIKU;
        totalChars = lines.reduce((sum, line) => sum + line.length, 0);
        typedCount = 0;
        setStatus(null);
        renderText();
        // also try to fetch next in background
        fetchNextHaiku();
      } else {
        nextLines = FALLBACK_HAIKU;
        setStatus(null);
      }
  }
}

function applyNextHaiku(): void {
  if (!nextLines || nextLines.length === 0) {
    return;
  }

  lines = nextLines;
  nextLines = null;
  typedCount = 0;
  totalChars = lines.reduce((sum, line) => sum + line.length, 0);
  renderText();
}

function renderText(): void {
  let index = 0;
  const html = lines
    .map((line, lineIndex) => {
      const spans: string[] = [];

      Array.from(line).forEach((char) => {
        const classNames = ["letter"];
        if (index < typedCount) {
          classNames.push("typed");
        }
        if (index === typedCount) {
          classNames.push("cursor-target");
        }

        spans.push(`<span class="${classNames.join(" ")}">${escapeHtml(char)}</span>`);
        index += 1;
      });

      const isLastLine = lineIndex === lines.length - 1;
      if (index === typedCount && isLastLine) {
        spans.push('<span class="cursor-target cursor-placeholder"></span>');
      }

      return `<div>${spans.join("")}</div>`;
    })
    .join("");

  wordElement!.innerHTML = html;
}

function resetProgress(): void {
  typedCount = 0;
  renderText();
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Backspace") {
    resetProgress();
    return;
  }

  const char = event.key;
  if (char.length !== 1) {
    return;
  }

  const expected = lines
    .join("")
    .charAt(typedCount);

  if (char === expected) {
    typedCount += 1;
    if (typedCount >= totalChars) {
      renderText();
      if (nextLines && nextLines.length > 0) {
        requestAnimationFrame(() => {
          applyNextHaiku();
          fetchNextHaiku();
        });
      } else {
        fetchNextHaiku();
      }
      return;
    }
  } else {
    typedCount = 0;
  }

  renderText();
});

renderText();

// Prefetch the next haiku in the background
fetchNextHaiku();
