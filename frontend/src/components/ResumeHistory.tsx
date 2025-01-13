import React from 'react';
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface ResumeHistoryItem {
  id: string;
  fileName: string;
  uploadDate: string;
  overallMatch: number;
}

interface ResumeHistoryProps {
  history: ResumeHistoryItem[];
  onSelect: (id: string) => void;
}

const ResumeHistory: React.FC<ResumeHistoryProps> = ({ history, onSelect }) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow mt-8">
      <div className="flex items-center mb-4">
        <ClockIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Previous Uploads</h2>
      </div>
      <div className="overflow-hidden">
        <div className="flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {history.map((item) => (
              <li key={item.id} className="py-4">
                <button
                  onClick={() => onSelect(item.id)}
                  className="w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.fileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Uploaded on {new Date(item.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {item.overallMatch}% Match
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ResumeHistory;
