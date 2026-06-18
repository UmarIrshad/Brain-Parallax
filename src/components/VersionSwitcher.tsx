import "./VersionSwitcher.css";

export type Version = 1 | 2;

type Props = {
  active: Version;
  onChange: (v: Version) => void;
};

const VERSIONS: Version[] = [1, 2];

export default function VersionSwitcher({ active, onChange }: Props) {
  return (
    <div className="version-switcher" role="tablist" aria-label="Page version">
      {VERSIONS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={active === v}
          className={`version-switcher__btn${active === v ? " is-active" : ""}`}
          onClick={() => onChange(v)}
        >
          Version {v}
        </button>
      ))}
    </div>
  );
}
