import { formatBytes, formatDate } from '../utils/formatters.js';
import './FileList.css';

function FileList({ files, selectedKey, onSelect, onDelete, onDownload, busy, loading }) {
  return (
    <section className="filePanel">
      <div className="panelHeading">
        <div>
          <p className="panelKicker">Storage</p>
          <h2>Files</h2>
        </div>
        <span className="fileCount">{files.length}</span>
      </div>

      {loading && <p className="emptyState">Loading files...</p>}

      {!loading && files.length === 0 && (
        <p className="emptyState">No files yet. Upload one to start synchronization.</p>
      )}

      <ul className="fileRows">
        {files.map((file) => (
          <li key={file.key} className={file.key === selectedKey ? 'selectedFile' : ''}>
            <button className="fileIdentity" type="button" onClick={() => onSelect(file.key)}>
              <span>
                <strong>{file.name}</strong>
                <small>{formatBytes(file.size)} • {formatDate(file.lastModified)}</small>
              </span>
            </button>
            <div className="fileActions">
              <button type="button" onClick={() => onDownload(file.key)} aria-label={`Download ${file.name}`} title="Download">
                Download
              </button>
              <button type="button" onClick={() => onDelete(file.key)} disabled={busy} aria-label={`Delete ${file.name}`} title="Delete">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FileList;
