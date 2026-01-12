import { FileUpload } from '@components/file-upload';
import { CodeViewer } from '@components/code-viewer';

interface ScriptFormProps {
    selectedFile: File | null;
    onFileSelect: (file: File) => void;
    error?: string;
}

export function ScriptForm({ selectedFile, onFileSelect, error }: ScriptFormProps) {
    return (
        <div className="grid grid-cols-1 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
                <label className="block text-sm font-semibold text-black uppercase tracking-wide">
                    Upload Script <span className="text-[#ef4444]">*</span>
                </label>

                <FileUpload
                    onFileSelect={onFileSelect}
                    accept=".js"
                    selectedFile={selectedFile}
                    error={error}
                />

                {selectedFile && (
                    <div className="p-3 bg-[#FAF9F6] border-2 border-black rounded-md shadow-[2px_2px_0_#000]">
                        <div className="flex items-center gap-2 text-sm">
                            <svg
                                className="w-4 h-4 text-black"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <span className="text-black font-medium">{selectedFile.name}</span>
                            <span className="text-[#6B6B6B]">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Documentation Panel */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <svg
                        className="w-5 h-5 text-[#5791FF]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                    </svg>
                    <h3 className="text-sm font-bold text-black uppercase tracking-wide">Documentation</h3>
                </div>

                <div className="bg-white border-2 border-black rounded-md p-4 space-y-4 shadow-[2px_2px_0_#000]">
                    <div className="flex items-start gap-2">
                        <svg
                            className="w-5 h-5 text-[#22c55e] mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p className="text-sm text-[#404040]">
                            Database connections are auto-injected via environment variables. No hardcoded credentials needed!
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-black uppercase tracking-wide">
                            Environment Variables
                        </p>
                        <ul className="text-sm space-y-1">
                            <li className="font-mono text-xs bg-[#FEF34B] border-2 border-black px-2 py-1 rounded inline-block mr-2 shadow-[1px_1px_0_#000]">
                                POSTGRES_URL
                            </li>
                            <li className="font-mono text-xs bg-[#FEF34B] border-2 border-black px-2 py-1 rounded inline-block mr-2 shadow-[1px_1px_0_#000]">
                                MONGODB_URL
                            </li>
                            <li className="font-mono text-xs bg-[#FEF34B] border-2 border-black px-2 py-1 rounded inline-block mr-2 shadow-[1px_1px_0_#000]">
                                DB_NAME
                            </li>
                            <li className="font-mono text-xs bg-[#FEF34B] border-2 border-black px-2 py-1 rounded inline-block shadow-[1px_1px_0_#000]">
                                DB_TYPE
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-black uppercase tracking-wide">
                            PostgreSQL Example
                        </p>
                        <CodeViewer
                            code={`const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.POSTGRES_URL
});
await client.connect();
const result = await client.query('SELECT NOW()');
console.log(result.rows);
await client.end();`}
                            language="javascript"
                            showLineNumbers={false}
                            maxHeight="180px"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-black uppercase tracking-wide">
                            MongoDB Example
                        </p>
                        <CodeViewer
                            code={`const { MongoClient } = require('mongodb');
const client = new MongoClient(
  process.env.MONGODB_URL
);
await client.connect();
const db = client.db(process.env.DB_NAME);
const docs = await db.collection('users').find().toArray();
console.log(docs);
await client.close();`}
                            language="javascript"
                            showLineNumbers={false}
                            maxHeight="200px"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
