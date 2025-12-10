# Claude Usage Rules

- Keep these rules in mind for every task in this repo and prefer the shortest path to delivery.
- When managing the UI, use the skill `frontend-design`; actively ask yourself “does this look nice?” and polish the result.
- Always use Context7 when you need code generation, setup or configuration steps, or library/API documentation. Automatically use the Context7 MCP tools to resolve the library id and fetch the docs without waiting for me to ask.
- Default to Context7 for library/API lookups before asking questions; integrate the findings into your answer and cite the source.
- If multiple tools could answer something, pick Context7 first for code or docs, then only fall back to other sources if it is missing coverage.
