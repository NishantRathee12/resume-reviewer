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
    if (!file || !jobDescription.trim()) {
      setError('Please upload a file and provide a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        setAnalysisResult(response.data);
        // Clear file and job description after successful analysis
        setFile(null);
        setJobDescription('');

        // Add to history
        const historyItem: ResumeHistoryItem = {
          id: Date.now().toString(),
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          analysisResult: response.data
        };
        setResumeHistory(prev => [historyItem, ...prev]);
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error: any) {
      console.error('Error:', error);
      let errorMessage = 'An error occurred while analyzing the resume';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
      } else if (error.request) {
        errorMessage = 'Could not connect to the server. Please try again.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
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
    setIsDragging(false);
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
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
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
