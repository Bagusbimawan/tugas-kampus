interface FeaturePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export const FeaturePlaceholder = ({
  eyebrow,
  title,
  description
}: FeaturePlaceholderProps) => {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.35em] text-amber-600">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600">{description}</p>
    </div>
  );
};

