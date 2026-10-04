import { Fragment, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "@beyou/types/notebook/notebook";

type Props = {
    markdown: string;
    citations?: Citation[];
    /** Called with the citation a [n] chip points at. Without it, chips are plain text. */
    onCitation?: (citation: Citation) => void;
    className?: string;
};

/** `[2]` and `[1, 3]` as the model writes them. */
const MARKER = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/**
 * Markdown from the study AI, with each `[n]` turned into a chip that opens what it cites.
 *
 * The markers are rewritten to links with a `#cite-n` target before parsing, and the link
 * renderer turns those into buttons. A marker with no matching citation (the server already
 * removes them, this is the belt to that brace) renders as nothing.
 */
export default function NotebookMarkdown({ markdown, citations = [], onCitation, className = "" }: Props) {
    const byNumber = new Map(citations.map((c) => [c.n, c]));
    const prepared = markdown.replace(MARKER, (_, group: string) =>
        group
            .split(/\s*,\s*/)
            .map((n) => (byNumber.has(Number(n)) ? `[${n}](#cite-${n})` : ""))
            .join(" ")
    );

    return (
        <div className={`notebook-markdown text-[15px] leading-6 text-text ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children }) => {
                        const match = href?.match(/^#cite-(\d+)$/);
                        if (match) {
                            const citation = byNumber.get(Number(match[1]));
                            if (!citation) return null;
                            return <CitationChip citation={citation} onOpen={onCitation} />;
                        }
                        return (
                            <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent underline">
                                {children}
                            </a>
                        );
                    },
                    p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                    h2: ({ children }) => <h3 className="mb-1 mt-3 text-base font-semibold">{children}</h3>,
                    h3: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-semibold">{children}</h4>,
                    code: ({ children, className: language }) =>
                        language ? (
                            <code className="block overflow-x-auto rounded-control bg-surface-2 p-3 font-mono text-[13px]">{children}</code>
                        ) : (
                            <code className="rounded bg-surface-2 px-1 font-mono text-[13px]">{children}</code>
                        ),
                }}
            >
                {prepared}
            </ReactMarkdown>
        </div>
    );
}

/** A numbered chip. A button, so it is reachable by keyboard and announced as one. */
export function CitationChip({ citation, onOpen }: { citation: Citation; onOpen?: (c: Citation) => void }): ReactNode {
    if (!onOpen) {
        return <Fragment>[{citation.n}]</Fragment>;
    }
    return (
        <button
            type="button"
            onClick={() => onOpen(citation)}
            aria-label={`${citation.n}: ${citation.title}`}
            title={citation.title}
            data-testid={`citation-${citation.n}`}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-accent-soft px-1.5 align-[1px] font-mono text-[11px] font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent"
        >
            {citation.n}
        </button>
    );
}
