import Link from "next/link";
import { login, signup } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; mode?: string };
}) {
  const isSignup = searchParams.mode === "registro";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold">
            B
          </div>
          <h1 className="text-2xl font-semibold">Backbone</h1>
          <p className="mt-1 text-sm text-white/50">
            {isSignup ? "Creá tu cuenta" : "Ingresá a tu cliente"}
          </p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {searchParams.error}
          </div>
        )}
        {searchParams.message && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {searchParams.message}
          </div>
        )}

        <form className="card space-y-4">
          {isSignup && (
            <div>
              <label className="label" htmlFor="full_name">
                Nombre completo
              </label>
              <input
                id="full_name"
                name="full_name"
                className="input"
                placeholder="Tu nombre"
                required
              />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="vos@empresa.com"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            className="btn w-full"
            formAction={isSignup ? signup : login}
          >
            {isSignup ? "Crear cuenta" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-white/50">
          {isSignup ? (
            <>
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-brand-400 hover:underline">
                Ingresá
              </Link>
            </>
          ) : (
            <>
              ¿No tenés cuenta?{" "}
              <Link
                href="/login?mode=registro"
                className="text-brand-400 hover:underline"
              >
                Registrate
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
