function render(lines, meta) {
    // Simple concatenation for TXT
    // We add a header for context
    const head = `Printer: ${meta.name}\nJob: ${meta.jobId}\nTime: ${meta.time}\n--------------------------------\n`;
    const body = lines.map(ln => ln.segments.map(s => s.text).join("")).join("\n");
    return head + body + "\n--------------------------------\n";
}

module.exports = { render };
