import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell title="Sign In" subtitle="Welcome Back" description="Sign in to access your wallet and purchase instant data." footer={<>Don&apos;t have an account? <Link href="/register">Register Now</Link></>}>
      <LoginForm />
    </AuthShell>
  );
}
