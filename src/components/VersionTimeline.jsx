import { formatBytes, formatDate } from '../utils/formatters.js';
import './VersionTimeline.css';

function VersionTimeline({ versions, selectedFile, onRestore, loading }) {
  return (
    <section className="versionPanel">
      <div className="versionHeader">
        <div>
          <p className="panelKicker">Versioning</p>
          <h2>History</h2>
        </div>
      </div>

      {!selectedFile && <p className="emptyState">Select a file to inspect previous versions.</p>}
      {selectedFile && loading && <p className="emptyState">Loading versions...</p>}
      {selectedFile && !loading && versions.length === 0 && (
        <p className="emptyState">No archived versions for this file yet.</p>
      )}

      <ul className="versionRows">
        {versions.map((version) => (
          <li key={version.key}>
            <span>
              <strong>{formatDate(version.lastModified)}</strong>
              <small>{version.name} • {formatBytes(version.size)}</small>
            </span>
            <button type="button" onClick={() => onRestore(version.key)} aria-label="Restore this version" title="Restore">
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default VersionTimeline;
