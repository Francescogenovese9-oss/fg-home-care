import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
export default function ForgotPasswordPage(){return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 py-12"><Link href="/" className="mb-8 text-xl font-bold text-blue-900">FG Home Care</Link><ForgotPasswordForm /></main>}