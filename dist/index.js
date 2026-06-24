"use strict";
const wordElement = document.getElementById("lastKey");
if (!wordElement) {
    throw new Error("Missing #lastKey element");
}
const lines = [
    "This is the first line of text.",
    "The next line continues typing.",
    "Finish with the final line."
];
const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
let typedCount = 0;
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function renderText() {
    let index = 0;
    const html = lines
        .map((line, lineIndex) => {
        const spans = [];
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
    wordElement.innerHTML = html;
}
function resetProgress() {
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
            typedCount = 0;
            renderText();
            return;
        }
    }
    else {
        typedCount = 0;
    }
    renderText();
});
renderText();
