type LoaderProps = {
  label?: string;
  inline?: boolean;
};

export function Loader({ label = "Loading...", inline = false }: LoaderProps) {
  const content = (
    <>
      <span />
      <span />
      <span />
    </>
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        <span className="loader-shell" aria-hidden="true">
          {content}
        </span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="loader-block">
      <div className="loader-shell" aria-hidden="true">
        {content}
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
