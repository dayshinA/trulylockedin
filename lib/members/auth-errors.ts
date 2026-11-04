import { FirebaseError } from "firebase/app";

// Firebase Auth client errors → member-facing text. Null means "say nothing"
// (the member closed the Google window themselves).
export function memberAuthErrorMessage(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }
  switch (error.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "You already have an account with this email. Sign in with your email and password.";
    case "auth/email-already-in-use":
      return "There's already an account with this email. Sign in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Choose a stronger password.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact the salon.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/unauthorized-domain":
    case "auth/unauthorized-continue-uri":
    case "auth/operation-not-allowed":
      return "Sign-in isn't set up for this website yet. Please try again later.";
  }
  return "Something went wrong. Please try again.";
}
