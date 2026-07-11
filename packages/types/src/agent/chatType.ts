export interface agentChat {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface agentMessage {
    /** Spring AI MessageType name: USER | ASSISTANT | SYSTEM | TOOL */
    role: string;
    text: string;
}
