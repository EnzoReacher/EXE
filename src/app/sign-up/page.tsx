import type { Metadata } from "next";
import AuthPage from "../auth/auth-page";

export const metadata: Metadata = {
  title: "Create an account | OwnPath",
  description: "Create a private OwnPath career workspace.",
};

export default function SignUpPage() {
  return <AuthPage mode="signUp" />;
}
