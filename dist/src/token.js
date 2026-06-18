export function estimateTokens(text) {
    if (!text)
        return 0;
    const asciiWords = text.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
    const cjkChars = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
    const other = Math.max(0, text.length - asciiWords * 5 - cjkChars);
    return Math.ceil(asciiWords * 1.25 + cjkChars * 0.75 + other / 4);
}
export function truncateByTokens(text, maxTokens) {
    if (estimateTokens(text) <= maxTokens)
        return text;
    const approxChars = Math.max(120, Math.floor(maxTokens * 3.2));
    return `${text.slice(0, approxChars).trim()}\n[truncated to ${maxTokens} token budget]`;
}
export function compactLines(lines, maxTokens) {
    const kept = [];
    let used = 0;
    for (const line of lines.filter(Boolean)) {
        const cost = estimateTokens(line);
        if (used + cost > maxTokens)
            break;
        kept.push(line);
        used += cost;
    }
    return kept;
}
