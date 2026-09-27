import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell title="Create Account" subtitle="Welcome to AbbaKano" description="Open a secure account for discounted data bundles, instant airtime, and zero transaction delays." footer={<>Already have an account? <Link href="/login">Sign In</Link></>}>
      <RegisterForm />
    </AuthShell>
  );
}
