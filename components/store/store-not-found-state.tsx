export function StoreNotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-50">
      <div className="w-full max-w-md rounded-3xl border border-yellow-300/20 bg-zinc-950/80 p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300 text-2xl font-black text-black">
          !
        </div>
        <h1 className="text-3xl font-black tracking-tight">Store not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          The store you are looking for does not exist or is not active.
        </p>
      </div>
    </main>
  )
}