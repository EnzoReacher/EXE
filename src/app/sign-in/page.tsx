import type { Metadata } from "next";
import AuthPage from "../auth/auth-page";

export const metadata: Metadata = {
  title: "Sign in | EXE",
  description: "Sign in to your private EXE career workspace.",
};

type SignInPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const notice = status === "confirmation-failed"
    ? "We could not confirm that email link. Request a fresh confirmation email and try again."
    : undefined;

  return <AuthPage mode="signIn" notice={notice} />;
}
