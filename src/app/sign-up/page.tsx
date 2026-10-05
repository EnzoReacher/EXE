import type { Metadata } from "next";
import AuthPage from "../auth/auth-page";

export const metadata: Metadata = {
  title: "Create an account | EXE",
  description: "Create a private EXE career workspace.",
};

export default function SignUpPage() {
  return <AuthPage mode="signUp" />;
}
