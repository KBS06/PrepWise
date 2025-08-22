"use client"

import React, {useEffect, useState, useRef} from 'react'
import Image from "next/image";
import {cn} from "@/lib/utils";
import {useRouter} from "next/navigation";
import { vapi } from "@/lib/vapi.sdk"

enum CallStatus {
    INACTIVE = "INACTIVE",
    CONNECTING = "CONNECTING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
}

interface SavedMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

const Agent = ({userName, userId, type} : AgentProps) => {

    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
        const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

        const onMessage = (message: Message) => {
            if(message.type === 'transcript' && message.transcriptType === 'final'){
                const newMessage = { role: message.role, content: message.transcript || '' };
                setMessages((prev) => [...prev, newMessage] );
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onError = (error: Error) => console.error('Vapi Error:', error);

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('error', onError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('error', onError);
        }
    }, [])

    useEffect(() => {
        if(callStatus === CallStatus.FINISHED) router.push('/');
    }, [callStatus, router]);

    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [messages]);

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

        if (!workflowId) {
            console.error('VAPI workflow ID is missing. Check your .env.local file.');
            setCallStatus(CallStatus.INACTIVE);
            return;
        }

        try {
            // This now makes a call to the Vapi-specific server-side API route.
            const response = await fetch('/api/vapi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // The action property directs the server to start the Vapi call.
                    action: 'startVapiCall',
                    workflowId: workflowId,
                    variableValues: {
                        username: userName,
                        userid: userId,
                    },
                }),
            });

            const data = await response.json();

            if (data.error) {
                console.error('API Error:', data.error);
                setCallStatus(CallStatus.INACTIVE);
            }
        } catch (e) {
            console.error('Failed to start VAPI call via API:', e);
            setCallStatus(CallStatus.INACTIVE);
        }
    }

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);
        vapi.stop();
    }

    const latestMessage = messages[messages.length -1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    return (
        <>
            <div className="call-view">
                <div className="card-interviewer">
                    <div className="avatar">
                        <Image src="/ai-avatar.png" alt="vapi" width={65} height={54}
                               className="object-cover" />
                        {isSpeaking && <span className="animate-speak" />}
                    </div>

                    <h3>AI Interviewer</h3>
                </div>

                <div className="card-border">
                    <div className="card-content">
                        <Image src="/user-avatar.png" alt="user avatar"
                               width={540} height={540} className="rounded-full object-cover size-[120px]"/>

                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>

            {messages.length > 0 && (
                <div className="transcript-border">
                    <div ref={transcriptRef} className="transcript">
                        {messages.map((message, index) => (
                            <p key={index} className={cn(`transition-opacity 
                            duration-500 opacity-0`, `animate-fadeIn opacity-100`)}>
                                <strong>{message.role}:</strong> {message.content}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            <div className="w-full flex justify-center">
                {callStatus !== 'ACTIVE' ? (
                    <button className="relative btn-call" onClick={handleCall}>
                        <span className={cn(`absolute animate-ping rounded-full opacity-75`, callStatus !== 'CONNECTING' && `hidden`)} />
                        <span>{isCallInactiveOrFinished ? 'Call' : '. . . '}</span>
                    </button>
                ): (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                        End
                    </button>
                )}
            </div>
        </>
    )
}
export default Agent;
