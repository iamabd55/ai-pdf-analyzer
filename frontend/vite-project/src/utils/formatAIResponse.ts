interface Source {
    page: number | string;
    preview: string;
}

export const formatAIResponse = (
    answer: string,
    sources?: Source[]
): string => {
    const trimmedAnswer = answer.trim();
    const lines = trimmedAnswer.split('\n').filter(l => l.trim());

    let html = '<div class="chatgpt-response">';

    // Always wrap each line in <p> and convert **bold** to <strong>
    lines.forEach(line => {
        const formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
        html += `<p class="response-paragraph">${formattedLine}</p>`;
    });

    // Sources section (always fixed format)
    if (sources && sources.length > 0) {
        const uniquePages = [...new Set(sources.map(s => s.page))];
        const sourcesJson = JSON.stringify(sources).replace(/"/g, '&quot;');

        html += `
            <div class="references-capsule" data-sources='${sourcesJson}'>
                <div class="capsule-trigger">
                    <span>${uniquePages.length} source${uniquePages.length > 1 ? 's' : ''}</span>
                    <span class="page-preview">Pages ${uniquePages.slice(0, 3).join(', ')}${uniquePages.length > 3 ? '...' : ''}</span>
                </div>
                <div class="references-popup">
                    <div class="popup-header">Sources</div>
                    <div class="popup-sources">
                        ${sources.map(s => `
                            <div class="source-item">
                                <div class="source-page">Page ${s.page}</div>
                                <div class="source-excerpt">${s.preview.length > 120 ? s.preview.substring(0, 120) + '...' : s.preview}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
};
