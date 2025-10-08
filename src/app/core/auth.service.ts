import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  loading = signal(true);

  constructor(private router: Router) {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser.set(user);
      this.loading.set(false);
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      this.router.navigate(['/start']);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.router.navigate(['/start']);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

