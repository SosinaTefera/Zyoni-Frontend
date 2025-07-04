import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { DocumentIcon, CodeBracketIcon, ClipboardIcon, CheckIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { useTable } from 'react-table';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function getLanguage(filename, type) {
  if (type && type.includes('csv')) return 'csv';
  if (filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.csv')) return 'csv';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.java')) return 'java';
  if (filename.endsWith('.cpp')) return 'cpp';
  if (filename.endsWith('.c')) return 'c';
  if (filename.endsWith('.txt')) return 'text';
  return 'text';
}

function PreviewPanel({ selectedDocument }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [textContent, setTextContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [panelWidth, setPanelWidth] = useState(340);
  const [wordContent, setWordContent] = useState('');
  const [excelData, setExcelData] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const panelRef = useRef(null);

  // Dynamically measure panel width
  useEffect(() => {
    function updateWidth() {
      if (panelRef.current) {
        setPanelWidth(panelRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    // Use ResizeObserver for more robust resizing
    let observer;
    if (window.ResizeObserver && panelRef.current) {
      observer = new window.ResizeObserver(updateWidth);
      observer.observe(panelRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateWidth);
      if (observer && panelRef.current) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
    setTextContent('');
    setWordContent('');
    setExcelData([]);
    setExcelColumns([]);

    if (!selectedDocument) return;

    const fileType = selectedDocument.type;
    const fileName = selectedDocument.name || '';

    // Handle Word documents
    if (fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.doc') || 
        fileName.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setWordContent(result.value);
        } catch (error) {
          console.error('Error converting Word document:', error);
          setWordContent('<p>Error loading Word document</p>');
        }
      };
      reader.readAsArrayBuffer(selectedDocument.file);
    }
    // Handle Excel documents
    else if (fileType === 'application/vnd.ms-excel' || 
             fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             fileName.endsWith('.xls') || 
             fileName.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            setExcelColumns(headers.map(header => ({
              Header: header,
              accessor: header
            })));
            setExcelData(rows.map(row => {
              const rowData = {};
              headers.forEach((header, index) => {
                rowData[header] = row[index];
              });
              return rowData;
            }));
          }
        } catch (error) {
          console.error('Error converting Excel document:', error);
        }
      };
      reader.readAsArrayBuffer(selectedDocument.file);
    }
    // Handle text-based files
    else if (
      fileType.startsWith('text/') ||
      fileType.includes('javascript') ||
      fileType.includes('python') ||
      fileType.includes('csv') ||
      fileType.includes('html') ||
      fileType.includes('json') ||
      fileType.includes('typescript')
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target.result);
      };
      reader.readAsText(selectedDocument.file);
    }
  }, [selectedDocument]);

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const ExcelTable = ({ columns, data }) => {
    const {
      getTableProps,
      getTableBodyProps,
      headerGroups,
      rows,
      prepareRow,
    } = useTable({
      columns,
      data,
    });

    return (
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps()}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
            {rows.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    <td
                      {...cell.getCellProps()}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPreview = () => {
    if (!selectedDocument) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <DocumentIcon className="h-16 w-16 mb-4" />
          <p>Select a document to preview</p>
        </div>
      );
    }

    const fileType = selectedDocument.type;
    const fileName = selectedDocument.name || '';

    if (fileType === 'application/pdf') {
      return (
        <div className="h-full flex flex-col w-full">
          <div className="flex-1 w-full flex items-center justify-center bg-gray-50 overflow-auto" style={{ minHeight: '500px', maxHeight: '700px' }}>
            <Document
              file={selectedDocument.file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="w-full flex items-center justify-center"
            >
              <Page pageNumber={pageNumber} width={panelWidth - 48} />
            </Document>
          </div>
          {numPages && (
            <div className="w-full p-4 border-t border-gray-200 flex items-center justify-between mt-2 bg-white sticky bottom-0 z-10">
              <button
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    }

    if (fileType.startsWith('image/')) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <img
            src={URL.createObjectURL(selectedDocument.file)}
            alt={selectedDocument.name}
            style={{ maxWidth: panelWidth - 48, maxHeight: 400 }}
            className="object-contain border rounded shadow"
          />
        </div>
      );
    }

    // Word document preview
    if (fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.doc') || 
        fileName.endsWith('.docx')) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">{selectedDocument.name}</span>
            </div>
          </div>
          <div 
            className="flex-1 overflow-auto p-4 bg-white"
            style={{ minHeight: '400px', maxHeight: '700px' }}
            dangerouslySetInnerHTML={{ __html: wordContent || 'Loading Word document...' }}
          />
        </div>
      );
    }

    // Excel document preview
    if (fileType === 'application/vnd.ms-excel' || 
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileName.endsWith('.xls') || 
        fileName.endsWith('.xlsx')) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <TableCellsIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">{selectedDocument.name}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            {excelData.length > 0 ? (
              <ExcelTable columns={excelColumns} data={excelData} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Loading Excel document...</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (
      fileType.startsWith('text/') ||
      fileType.includes('javascript') ||
      fileType.includes('python') ||
      fileType.includes('csv') ||
      fileType.includes('html') ||
      fileType.includes('json') ||
      fileType.includes('typescript')
    ) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <CodeBracketIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">{selectedDocument.name}</span>
            </div>
            <button
              onClick={handleCopy}
              className="ml-2 flex items-center px-2 py-1 rounded bg-gray-100 hover:bg-blue-100 text-gray-600 text-xs font-medium border border-gray-200 transition"
              title="Copy code"
              disabled={!textContent}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-500 mr-1" /> Copied
                </>
              ) : (
                <>
                  <ClipboardIcon className="h-4 w-4 mr-1" /> Copy
                </>
              )}
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-50 rounded" style={{ minHeight: '400px', maxHeight: '700px' }}>
            <SyntaxHighlighter
              language={getLanguage(fileName, fileType)}
              style={oneLight}
              customStyle={{ background: 'transparent', fontSize: 14, wordBreak: 'break-word', whiteSpace: 'pre-wrap', minWidth: 0, width: panelWidth - 48 }}
              wrapLongLines={true}
              showLineNumbers={true}
            >
              {textContent || 'Loading content...'}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <DocumentIcon className="h-16 w-16 mb-4" />
        <p>Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <section ref={panelRef} className="w-full h-full py-4">
      <div className="h-full flex flex-col rounded-2xl border border-gray-300 bg-white/60 shadow-2xl backdrop-blur-md backdrop-saturate-150">
        <div className="p-4 border-b border-gray-200 text-lg font-semibold text-gray-700 text-center bg-gradient-to-r from-blue-100/60 to-purple-100/60 rounded-t-2xl">Document Preview</div>
        <div className="flex-1 overflow-hidden p-4 flex flex-col items-center justify-center">
          {renderPreview()}
        </div>
      </div>
    </section>
  );
}

export default PreviewPanel;