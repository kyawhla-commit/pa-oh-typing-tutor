const versions = [
  { name: "Typing Tutor", folder: "typingtutor", summary: "Practice, tests, lessons, progress, profile, and admin tools." },
  { name: "TypeMaster", folder: "typingtutor2", summary: "A focused learning dashboard with practice, lessons, and progress." },
  { name: "Typing Tutor 3", folder: "typingtutor3", summary: "A complete learning app with sign in, achievements, and settings." },
  { name: "Typing Tutor 4", folder: "typingtutor4", summary: "A streamlined tutor with lessons, tests, and dark mode." },
  { name: "Typing Tutor 5", folder: "typingtutor5", summary: "A routed tutor with charts, achievements, and responsive navigation." },
];

export default function App() {
  return (
    <main className="portal">
      <div className="portal-inner">
        <span className="eyebrow">ONE WORKSPACE · FIVE VERSIONS</span>
        <h1>Typing Tutor</h1>
        <p className="intro">Choose a version to open. Each keeps its own screens and interactions inside this frontend project.</p>
        <section className="version-grid" aria-label="Typing Tutor versions">
          {versions.map((version, index) => (
            <a className="version-card" href={`/versions/${version.folder}/`} key={version.folder}>
              <span className="version-number">0{index + 1}</span>
              <span className="version-copy">
                <strong>{version.name}</strong>
                <span>{version.summary}</span>
              </span>
              <span className="version-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </section>
        <footer>Combined frontend workspace</footer>
      </div>
    </main>
  );
}
