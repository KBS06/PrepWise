"use server";

import {auth, db} from "@/firebase/admin"
import {cookies} from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7 * 1000;

export async function signUp(params: SignUpParams) {
    const {uid, name, email} = params;

    try{
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            // User already exists in Firestore
            return { success: true, message: "User already exists" };
        } else {
            // New user, create their document
            await userRef.set({
                uid,
                name,
                email,
            });
            return { success: true, message: "New user created" };
        }

    }catch(e: any){
        console.error("Error creating user signup",e)

        if(e.code === 'auth/email-already-exists') {
            return {
                success: false,
                message:"Email already exists",
            }
        }

        return {
            success: false,
            message:"Failed to create an account",
        }
    }
}

export async function setSessionCookie(idToken: string) {
    const cookieStore = await cookies();

    const sessionCookie = await auth.createSessionCookie(idToken,{
        expiresIn: ONE_WEEK,
    })

    cookieStore.set("session",sessionCookie, {
        maxAge: ONE_WEEK / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    })

}

export async function signIn(params: SignInParams) {
    const {email, idToken} = params;

    try{
        const userRecord = await auth.getUserByEmail(email);

        if(!userRecord){
            return {
                success: false,
                message:"User does not exist. Create an account."
            }
        }

        await setSessionCookie(idToken);
    }catch(e){
        console.log(e);

        return{
            success: false,
            message:"Failed to login",
        }
    }
}

export async function getCurrentUser() : Promise<User | undefined | null> {
    const cookieStore = await cookies();

    const sessionCookie = cookieStore.get('session')?.value;

    if(!sessionCookie) return null;

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const userRecord = await db
            .collection("users")
            .doc(decodedClaims.uid)
            .get()

        if(!userRecord.exists) return null;

        return {
            ...userRecord.data(),
            id: userRecord.id,
        }as User;
    }catch(e){
        console.error(e);
        return null;
    }
}

export async function isAuthenticated(){
    const user = await getCurrentUser();

    return !!user;
}