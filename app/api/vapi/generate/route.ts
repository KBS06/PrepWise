import { NextResponse } from 'next/server';
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getRandomInterviewCover } from "@/lib/utils";
import { db } from "@/firebase/admin";
import { NextApiRequest } from 'next';

// This function will handle all POST requests to this endpoint.
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            // Case 1: Handle the request to generate interview questions.
            case 'generateQuestions': {
                const { type, role, level, techstack, amount, userid } = body;

                const { text: questionsText } = await generateText({
                    model: google('gemini-2.0-flash-001'),
                    prompt: `Prepare questions for a job interview.
                    The job role is ${role}.
                    The job experience level is ${level}.
                    The tech stack used in the job is: ${techstack}.
                    The focus between behavioural and technical questions should lean towards: ${type}.
                    The amount of questions required is: ${amount}.
                    Please return only the questions, without any additional text.
                    The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
                    Return the questions formatted like this:
                    ["Question 1", "Question 2", "Question 3"]
                    
                    Thank you! <3
                    `,
                });

                // Parse the JSON string into a JavaScript array.
                const questions = JSON.parse(questionsText);

                const interview = {
                    role,
                    type,
                    level,
                    techstack: techstack.split(','),
                    questions: questions,
                    userId: userid,
                    finalized: true,
                    coverImage: getRandomInterviewCover(),
                    created_at: new Date().toISOString(),
                };

                await db.collection("interviews").add(interview);

                return NextResponse.json({ success: true }, { status: 200 });
            }

            // Case 2: Handle the request to start a Vapi call.
            case 'startVapiCall': {
                const { workflowId, variableValues } = body;

                // Make sure your VAPI private key is stored in a secure server-side env variable.
                const privateKey = process.env.VAPI_PRIVATE_KEY;

                if (!privateKey) {
                    console.error('VAPI private key is missing. Check your environment variables.');
                    return NextResponse.json({ error: 'Private key is missing' }, { status: 500 });
                }

                // This is the Vapi API endpoint to start a web call.
                const response = await fetch('https://api.vapi.ai/call/web', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${privateKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        workflowId: workflowId,
                        variableValues: variableValues,
                        // Note: You may want to add a webhook URL here to receive real-time data from Vapi.
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error('Vapi API Error:', data);
                    return NextResponse.json({ error: 'Failed to start call with Vapi', details: data }, { status: response.status });
                }

                return NextResponse.json(data, { status: 200 });
            }

            // Default case for an invalid action.
            default:
                return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
        return NextResponse.json({
            success: false,
            error: (error as Error).message,
        }, {
            status: 500,
        });
    }
}
