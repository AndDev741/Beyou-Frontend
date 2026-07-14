export interface agentChat {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

/** One piece of an assistant turn: a run of text, or a tool the agent used. */
export interface agentSegment {
    type: 'text' | 'tool';
    /** type === 'text' */
    text?: string;
    /** type === 'tool' */
    tool?: string;
    /** type === 'tool': present only on failure (absence = success). */
    error?: string;
    /** type === 'tool': frontend domains the tool touched. */
    domains?: string[];
    /** UI-only, live streaming: 'started' before a tool resolves. */
    status?: 'started' | 'finished';
}

export interface agentMessage {
    /** USER | ASSISTANT */
    role: string;
    segments: agentSegment[];
}
