export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        {/* Logo pulse animation */}
        <div className="relative">
          <img
            src="/android-chrome-192x192.png"
            alt="Sovereign Health"
            width={80}
            height={80}
            className="animate-pulse rounded-2xl"
          />
        </div>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}
