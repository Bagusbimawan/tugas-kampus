export const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-300" />
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Memuat</p>
          <p className="mt-1 text-sm text-slate-300">Menyiapkan aplikasi kasir...</p>
        </div>
      </div>
    </div>
  );
};

