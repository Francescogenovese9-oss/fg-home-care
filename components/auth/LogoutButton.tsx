export default function LogoutButton() {
    return (
      <form
        action="/api/auth/logout"
        method="post"
      >
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Esci
        </button>
      </form>
    );
  }