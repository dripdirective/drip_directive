import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function Dropzone({
  title,
  hint,
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  function emitFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }

  return (
    <div
      className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        emitFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => emitFiles(event.target.files)}
      />
      <div className="dropzone__icon">
        <UploadCloud size={22} />
      </div>
      <div className="dropzone__body">
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>
      <button
        type="button"
        className="button button--ghost"
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </button>
    </div>
  );
}
