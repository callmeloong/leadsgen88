export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-4">
        {/* Neon Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted opacity-20"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent drop-shadow-[0_0_10px_var(--color-neon-cyan)]"></div>
        </div>

        {/* Glitch Text */}
        <h2 className="cyber-glitch text-xl font-bold tracking-widest text-neon-cyan uppercase">
          LOADING...
        </h2>
      </div>
    </div>
  );
}
