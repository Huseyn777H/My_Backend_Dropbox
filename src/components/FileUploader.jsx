import { useRef, useState } from 'react';
import './FileUploader.css';

function FileUploader({ onUpload, busy }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList) {
    const file = fileList?.[0];
    if (file) {
      onUpload(file);
    }
  }

  return (
    <section
      className={`uploadPanel ${dragging ? 'isDragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <h2>Upload file</h2>
      <p>Select one file. If the same name is uploaded again, it is saved as another version.</p>
      <input
        ref={inputRef}
        className="hiddenInput"
        type="file"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <button className="uploadButton" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? 'Working...' : 'Choose file'}
      </button>
    </section>
  );
}

export default FileUploader;
