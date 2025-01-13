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
  analysisResult: any;
}

const FileUpload: React.FC<FileUploadProps> = ({ jobDescription, setJobDescription }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Main Upload Form */}
        <div className="md:col-span-2">
          {!analysisResult ? (
            <div className="space-y-6">
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

              {error && (
                <div className="mt-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!file || !jobDescription.trim() || isAnalyzing}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                  !file || !jobDescription.trim() || isAnalyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Analyze Another Resume
                </button>
              </div>
              <Results analysisResult={analysisResult} />
            </div>
          )}
        </div>

        {/* Resume History Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Previous Uploads</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {resumeHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 p-3 rounded-md border border-gray-200"
                >
                  <p className="font-medium text-sm truncate">{item.fileName}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(item.uploadDate).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleHistorySelect(item.id)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      View Results
                    </button>
                    <button
                      onClick={() => deleteHistoryItem(item.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {resumeHistory.length === 0 && (
                <p className="text-sm text-gray-500 text-center">
                  No previous uploads
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
