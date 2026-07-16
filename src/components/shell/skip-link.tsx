type SkipLinkProps = {
  targetId?: string;
  label?: string;
};

export function SkipLink({
  targetId = "main-content",
  label = "跳至主要內容",
}: SkipLinkProps) {
  return (
    <a href={`#${targetId}`} className="skip-link">
      {label}
    </a>
  );
}
