import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-vault-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-x-0 top-0 h-96 bg-glow-teal-sm pointer-events-none" />

      <div className="relative z-10 text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-vault-teal" />
        </div>

        <p className="font-mono text-xs text-vault-teal mb-3 tracking-widest">ERROR 404</p>
        <h1 className="text-2xl font-semibold mb-2">Asset not found</h1>
        <p className="text-sm text-vault-muted leading-relaxed mb-8">
          This page is out of scope. The resource you&apos;re looking for doesn&apos;t exist
          or you don&apos;t have access to it.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-teal flex items-center gap-2">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
