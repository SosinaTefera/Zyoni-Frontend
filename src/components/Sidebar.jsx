import { useState, useEffect } from "react";
import { DocumentIcon, XMarkIcon, ArrowUpTrayIcon, PencilIcon, PhotoIcon, CodeBracketIcon, TableCellsIcon } from "@heroicons/react/24/outline";

function getFileTypeIcon(doc) {
  if (doc.type.startsWith('image/')) return <PhotoIcon className="h-5 w-5 text-blue-400 mr-2" />;
  if (doc.type === 'application/pdf' || doc.name.endsWith('.pdf')) return <DocumentIcon className="h-5 w-5 text-red-400 mr-2" />;
  if (doc.type.includes('csv') || doc.name.endsWith('.csv') || doc.name.endsWith('.xlsx')) return <TableCellsIcon className="h-5 w-5 text-green-500 mr-2" />;
  if (doc.type.startsWith('text/') || doc.type.includes('javascript') || doc.type.includes('python') || doc.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|html|css|md)$/)) return <CodeBracketIcon className="h-5 w-5 text-purple-400 mr-2" />;
  return <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />;
}

function Sidebar({ onDocumentSelect, selectedDocument, setToast }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("User");
  const [editingGuest, setEditingGuest] = useState(false);

  const allowedTypes = [
    'application/pdf', 'image/', 'text/', 'application/json', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/csv', 'text/csv',
    'application/javascript', 'application/x-javascript', 'text/javascript', 'text/x-python', 'text/x-c', 'text/x-c++', 'text/x-java-source', 'text/html', 'text/css', 'application/xml', 'text/markdown'
  ];

  const handleGuestNameClick = () => setEditingGuest(true);
  const handleGuestNameChange = (e) => setGuestName(e.target.value);
  const handleGuestNameBlur = () => setEditingGuest(false);
  const handleGuestNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingGuest(false);
    } else if (e.key === 'Escape') {
      setGuestName("User");
      setEditingGuest(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    // Check for unsupported files
    const unsupported = files.find(file => !allowedTypes.some(type => file.type.startsWith(type) || file.name.match(/\.(pdf|jpg|jpeg|png|js|py|java|cpp|c|h|json|html|css|md|csv|xlsx|xls)$/i)));
    if (unsupported) {
      setToast && setToast({ message: `Unsupported file: ${unsupported.name}`, type: 'error' });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      setUploadProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);
    try {
      // Simulate upload delay
      await new Promise(res => setTimeout(res, 1200));
      const newDocuments = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        file: file
      }));
      setDocuments(prev => [...prev, ...newDocuments]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const removeDocument = (id) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDocument?.id === id) {
      onDocumentSelect(null);
    }
  };

  const startEditing = (doc) => {
    setEditingId(doc.id);
    setEditValue(doc.name);
  };

  const saveEdit = (doc) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, name: editValue.trim() || d.name } : d));
    setEditingId(null);
    setEditValue("");
  };

  const handleEditKeyDown = (e, doc) => {
    if (e.key === 'Enter') {
      saveEdit(doc);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue("");
    }
  };

  return (
    <aside className="h-full flex flex-col gap-4 px-2 py-4 bg-gray-50 border-r border-gray-200 overflow-y-auto" style={{ minWidth: 120, maxWidth: 400 }}>
      <div className="flex flex-col items-center w-full mb-2">
        <div className="w-full max-w-xs mb-3 flex items-center gap-2">
          {editingGuest ? (
            <input
              type="text"
              value={guestName}
              onChange={handleGuestNameChange}
              onBlur={handleGuestNameBlur}
              onKeyDown={handleGuestNameKeyDown}
              autoFocus
              className="flex-1 px-3 py-2 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base shadow font-semibold text-blue-700 bg-blue-50"
            />
          ) : (
            <button
              type="button"
              onClick={handleGuestNameClick}
              className="flex-1 text-left px-3 py-2 rounded border border-transparent hover:border-blue-300 bg-blue-50 text-base font-semibold text-blue-700 shadow cursor-pointer"
              title="Click to edit your name"
            >
              {guestName}
            </button>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-blue-400 cursor-pointer"
            onClick={handleGuestNameClick}
            title="Edit name"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.788l-4 1 1-4 14.362-14.3z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full max-w-xs mb-2 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base shadow"
        />
        <label className="block w-full max-w-xs">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.js,.py,.java,.cpp,.c,.h,.html,.json,.ts,.tsx,.md,.csv,.css,.xml,.yml,.yaml,.sh,.go,.rs,.php,.rb,.swift,.kt,.scala,.sql"
          />
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg py-3 text-lg font-semibold shadow hover:bg-gray-100 transition mb-2"
            onClick={() => document.querySelector('input[type=file]').click()}
            style={{ minWidth: 80 }}
          >
            <ArrowUpTrayIcon className="h-6 w-6 text-gray-500" />
            Upload
          </button>
        </label>
      </div>
      <div className="flex-1 flex flex-col gap-2 items-center w-full">
        {documents.filter(doc => doc.name.toLowerCase().includes(search.toLowerCase())).map((doc, idx) => (
          <div
            key={doc.id}
            className={`flex items-center group w-full max-w-xs`}
          >
            {editingId === doc.id ? (
              <input
                className="flex-1 px-3 py-2 rounded-lg border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base font-medium shadow"
                value={editValue}
                autoFocus
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => saveEdit(doc)}
                onKeyDown={e => handleEditKeyDown(e, doc)}
                style={{ minWidth: 80 }}
              />
            ) : (
              <button
                className={`flex-1 flex items-center text-left px-4 py-3 rounded-lg border border-gray-300 bg-white shadow hover:bg-blue-50 transition text-base font-medium truncate ${selectedDocument?.id === doc.id ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                onClick={() => onDocumentSelect(doc)}
                style={{ minWidth: 80 }}
              >
                {getFileTypeIcon(doc)}
                <span className="truncate">{doc.name}</span>
              </button>
            )}
            <button
              onClick={() => startEditing(doc)}
              className="ml-2 p-1 text-gray-400 hover:text-blue-500"
              title="Rename"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => removeDocument(doc.id)}
              className="ml-2 p-1 text-gray-400 hover:text-red-500"
              title="Remove"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
      {isUploading && (
        <div className="w-full px-2 mb-2">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">Uploading... {Math.round(uploadProgress)}%</div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
