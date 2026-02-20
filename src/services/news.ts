export const fetchNewsSnippets = async (query: string) => {
    // Mocking GNews for MVP reliability/free-tier constraints
    // Simulates high-quality, relevant snippets
    await new Promise(r => setTimeout(r, 800)); // Simulate net lag

    const templates = [
        {
            title: `Global Trends in ${query}`,
            source: 'TechCrunch',
            snippet: `New innovations in ${query} are reshaping the global market. Experts suggest a 40% growth by 2025.`
        },
        {
            title: `The Future of ${query} in Africa`,
            source: 'BBC Africa',
            snippet: `Local startups are leveraging new technologies to revolutionize ${query} across the continent.`
        },
        {
            title: `Top 10 Insights for ${query} Students`,
            source: 'Harvard Business Review',
            snippet: `Leading academics discuss the critical skills needed for the next generation of ${query} professionals.`
        }
    ];

    return templates;
};
