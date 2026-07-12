import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";

/**
 * Links: internal app paths (/habits, /routines…) navigate via react-router —
 * the agent is prompted to guide users with these; a plain <a href> would
 * full-reload the SPA and close the chat. Everything else opens a new tab.
 */
function MarkdownLink({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    const navigate = useNavigate();
    if (href?.startsWith("/")) {
        return (
            <a
                {...rest}
                href={href}
                className="font-medium text-primary underline"
                onClick={(e) => {
                    e.preventDefault();
                    navigate(href);
                }}
            >
                {children}
            </a>
        );
    }
    return (
        <a {...rest} href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

/* Theme-token styling for agent markdown (no typography plugin; react-markdown
   ignores raw HTML by default, so this stays XSS-safe). */
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
    p: (props) => <p className="mb-2 last:mb-0" {...props} />,
    ul: (props) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
    ol: (props) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
    a: (props) => <MarkdownLink {...props} />,
    code: (props) => (
        <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[13px]" {...props} />
    ),
    pre: (props) => (
        <pre className="mb-2 overflow-x-auto rounded-lg bg-primary/10 p-3 text-[13px] last:mb-0" {...props} />
    ),
    h1: (props) => <p className="mb-1 font-semibold" {...props} />,
    h2: (props) => <p className="mb-1 font-semibold" {...props} />,
    h3: (props) => <p className="mb-1 font-semibold" {...props} />,
    blockquote: (props) => (
        <blockquote className="mb-2 border-l-2 border-primary/40 pl-3 text-description last:mb-0" {...props} />
    ),
    // GFM tables (remark-gfm). The wrapper scrolls so wide tables never
    // stretch the chat bubble.
    table: (props) => (
        <div className="mb-2 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-sm" {...props} />
        </div>
    ),
    th: (props) => (
        <th className="border border-primary/20 bg-primary/10 px-2 py-1 text-left font-semibold" {...props} />
    ),
    td: (props) => <td className="border border-primary/15 px-2 py-1 align-top" {...props} />,
};

export default function AgentMarkdown({ text }: { text: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
        </ReactMarkdown>
    );
}
