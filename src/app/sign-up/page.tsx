import type { Metadata } from "next";
import AuthPage from "../auth/auth-page";

export const metadata: Metadata = {
  title: "Create an account | OwnPath",
  description: "Create an OwnPath account. No account is required to use the Translator.",
};

export default function SignUpPage() {
  return <AuthPage mode="signUp" />;
}
