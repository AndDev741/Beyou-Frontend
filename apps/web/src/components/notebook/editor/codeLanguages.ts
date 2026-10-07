/**
 * The languages a code block can be set to, with the names people and models write for them. The
 * picker on every code block lists these; "text" is the default and the fallback.
 */
const LANGUAGES: Record<string, { name: string; aliases?: string[] }> = {
    text: { name: "Text", aliases: ["plain", "plaintext", "txt", "none"] },
    bash: { name: "Bash", aliases: ["sh", "shell", "zsh", "console", "terminal"] },
    c: { name: "C", aliases: ["h"] },
    cpp: { name: "C++", aliases: ["c++", "hpp", "cc"] },
    csharp: { name: "C#", aliases: ["c#", "cs", "dotnet"] },
    css: { name: "CSS", aliases: ["scss", "sass", "less"] },
    dart: { name: "Dart" },
    dockerfile: { name: "Dockerfile", aliases: ["docker"] },
    go: { name: "Go", aliases: ["golang"] },
    graphql: { name: "GraphQL", aliases: ["gql"] },
    html: { name: "HTML", aliases: ["htm", "xhtml"] },
    java: { name: "Java" },
    javascript: { name: "JavaScript", aliases: ["js", "jsx", "mjs", "node"] },
    json: { name: "JSON", aliases: ["jsonc", "json5"] },
    kotlin: { name: "Kotlin", aliases: ["kt", "kts"] },
    lua: { name: "Lua" },
    markdown: { name: "Markdown", aliases: ["md"] },
    php: { name: "PHP" },
    python: { name: "Python", aliases: ["py", "python3"] },
    r: { name: "R" },
    ruby: { name: "Ruby", aliases: ["rb"] },
    rust: { name: "Rust", aliases: ["rs"] },
    scala: { name: "Scala" },
    sql: { name: "SQL", aliases: ["postgres", "postgresql", "mysql", "plsql", "psql"] },
    swift: { name: "Swift" },
    typescript: { name: "TypeScript", aliases: ["ts", "tsx"] },
    xml: { name: "XML", aliases: ["svg"] },
    yaml: { name: "YAML", aliases: ["yml"] },
};

/**
 * What the code block spec is given. BlockNote throws while drawing a code block whose language is
 * not in the list (`language in supportedLanguages`), and a block can arrive with any name: typed
 * after ``` or written by the study AI. Saying yes to every name keeps such a block on screen
 * instead of taking the editor down; the picker still lists only the real entries, and
 * {@link normalizeCodeLanguage} moves the block to one of them.
 */
export const CODE_LANGUAGES = new Proxy(LANGUAGES, {
    has: (target, key) => typeof key === "string" || key in target,
});

/** A language name as written, as one of the ids above: the id itself, an alias, or "text". */
export function normalizeCodeLanguage(name: unknown): string {
    if (typeof name !== "string") return "text";
    const wanted = name.trim().toLowerCase();
    if (wanted in LANGUAGES) return wanted;
    const match = Object.entries(LANGUAGES).find(([, { aliases }]) => aliases?.includes(wanted));
    return match ? match[0] : "text";
}

type LooseBlock = { type?: string; props?: Record<string, unknown>; children?: LooseBlock[] };

/** Whether a block (or one nested in it) is a code block whose language is not one of the ids. */
export function hasUnknownLanguage(blocks: readonly LooseBlock[]): boolean {
    return blocks.some((block) =>
        (block.type === "codeBlock" && !(String(block.props?.language) in LANGUAGES))
        || hasUnknownLanguage(block.children ?? []));
}

/** The same blocks with every code block's language moved to one of the ids. */
export function withKnownLanguages<T extends LooseBlock>(blocks: T[]): T[] {
    return blocks.map((block) => ({
        ...block,
        ...(block.type === "codeBlock"
            ? { props: { ...block.props, language: normalizeCodeLanguage(block.props?.language) } }
            : {}),
        ...(block.children ? { children: withKnownLanguages(block.children) } : {}),
    }));
}
