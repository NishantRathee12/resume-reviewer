import React, { useState, useCallback } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Results from './Results';

interface FileUploadProps {
  jobDescription: string;
  setJobDescription: (jobDescription: string) => void;
}

interface AnalysisResult {
  overallMatch: number;
  technicalSkills: number;
  experience: number;
  education: number;
  softSkills: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  improvements: string[];
  skillsNeeded: string[];
}

interface ResumeHistoryItem {
  id: string;
  fileName: string;
  uploadDate: string;
  analysisResult: AnalysisResult;
}

const FileUpload: React.FC<FileUploadProps> = ({ jobDescription, setJobDescription }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.includes('word')) {
        setFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF or Word document');
      }
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.includes('word')) {
        setFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF or Word document');
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!file || !jobDescription.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;
      setAnalysisResult(result);

      // Add to history
      const historyItem: ResumeHistoryItem = {
        id: Date.now().toString(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        analysisResult: result
      };
      setResumeHistory(prev => [historyItem, ...prev]);

    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while analyzing the resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistorySelect = (id: string) => {
    const item = resumeHistory.find(item => item.id === id);
    if (item) {
      setAnalysisResult(item.analysisResult);
    }
  };

  const resetForm = () => {
    setFile(null);
    setJobDescription('');
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const deleteHistoryItem = (id: string) => {
    setResumeHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Main Upload Form */}
      <div className="space-y-6">
        {!analysisResult ? (
          <div
            className={`relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <input
                type="file"
                className="hidden"
                onChange={handleFileInput}
                accept=".pdf,.doc,.docx"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex flex-col items-center">
                  {!file ? (
                    <>
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
                      <p className="mt-4 text-lg font-medium text-gray-900">
                        Drag and drop your resume
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        or click to select a file
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Supported formats: PDF, DOC, DOCX
                      </p>
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-12 h-12 text-primary-500" />
                      <p className="mt-4 text-lg font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        ) : (
          <Results analysisResult={analysisResult} onReset={resetForm} />
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!analysisResult && file && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isAnalyzing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>
        )}
      </div>

      {/* Previous Uploads Section */}
      {resumeHistory.length > 0 && (
        <div className="mt-12 bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Previous Uploads</h3>
            <p className="mt-1 text-sm text-gray-500">View or delete your previous resume analyses</p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {resumeHistory.map((item) => (
                <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{item.fileName}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded on {new Date(item.uploadDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Match Score: {item.analysisResult.overallMatch}%
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleHistorySelect(item.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
