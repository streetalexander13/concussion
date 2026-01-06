import { Injectable } from '@angular/core';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.config';
import { AuthService } from './auth.service';

export type FeedbackPayload = {
  message: string;
  name?: string;
  email?: string;
  pagePath?: string;
};

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private auth: AuthService) {}

  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    const user = this.auth.currentUser();

    const docData = {
      message: payload.message,
      name: payload.name,
      email: payload.email,
      pagePath: payload.pagePath,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      uid: user?.uid,
      createdAt: serverTimestamp(),
    };

    // Prefer user-scoped feedback when authenticated (works with existing rules).
    if (user?.uid) {
      await addDoc(collection(db, 'users', user.uid, 'feedback'), docData);
      return;
    }

    // Otherwise attempt a public collection. If rules disallow it, the UI will fall back to email.
    try {
      await addDoc(collection(db, 'public_feedback'), docData);
    } catch (err: any) {
      // Common FirebaseError is 'permission-denied' when rules require auth.
      const msg =
        err?.code === 'permission-denied'
          ? 'Feedback could not be saved (sign-in required). Please email us instead.'
          : 'Feedback could not be saved right now. Please email us instead.';
      throw new Error(msg);
    }
  }
}


