"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, isFirebaseConfigured } from "@/context/AuthContext";
import { BUSINESS } from "@/lib/business";
import { Field, inputClass, Button } from "@/components/ui";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-black">
            <Image
              src={BUSINESS.logoUrl}
              alt={BUSINESS.name}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {BUSINESS.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Panel de proyectos y pagos
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            Firebase no está configurado todavía. Revisa el archivo{" "}
            <code className="font-mono">.env.local</code> y el{" "}
            <code className="font-mono">README.md</code> para conectar tu
            proyecto de Firebase.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Correo">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@code-reset.com"
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
