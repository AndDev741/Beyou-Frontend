import React from "react";

interface NotifyProps {
    text: string;
    open: boolean;
    onClose?: () => void;
}

const Notify: React.FC<NotifyProps> = ({ text, open, onClose }) => {
    if (!open) return null;

    if(onClose){
        setTimeout(() => {
            onClose();
        }, 4000);
    }


    return (
        <div className="fixed inset-0 flex items-start justify-end px-4 py-6 mr-12 pointer-events-none sm:p-6 z-50">
            <div className="w-full max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5">
                <div className="p-4 flex items-center justify-between">
                    <span className="text-gray-800 text-sm">{text}</span>
                </div>
            </div>
        </div>
    );
};

export default Notify;