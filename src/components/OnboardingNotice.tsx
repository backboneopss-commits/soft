import { createOrganization } from "@/app/dashboard/actions";
import { logout } from "@/app/login/actions";

// Se muestra cuando el usuario tiene sesión pero todavía no pertenece a
// ningún cliente. Puede crear uno nuevo (y volverse su admin) o esperar a
// que un admin lo invite.
export default function OnboardingNotice({
  email,
}: {
  email: string;
  userId: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">¡Bienvenido a Backbone!</h1>
        <p className="mb-6 text-sm text-white/50">
          Tu cuenta <span className="text-white/80">{email}</span> todavía no
          está asignada a ningún cliente.
        </p>

        <div className="card mb-4">
          <h2 className="mb-1 font-medium">Crear un cliente nuevo</h2>
          <p className="mb-4 text-sm text-white/50">
            Vas a ser el administrador de este cliente y vas a poder invitar a
            tu equipo (setters y closers).
          </p>
          <form action={createOrganization} className="space-y-3">
            <input
              name="name"
              className="input"
              placeholder="Nombre del cliente / negocio"
              required
            />
            <button className="btn w-full">Crear cliente</button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40">
          ¿Te tienen que invitar a un cliente existente? Pedile a tu admin que
          te agregue con este email.
        </p>

        <form action={logout} className="mt-6 text-center">
          <button className="text-sm text-white/40 hover:text-white/70">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
