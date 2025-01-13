import React, { useState, useEffect, useCallback } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Results from './Results';

interface FileUploadProps {
  // No props needed
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

const FileUpload: React.FC<FileUploadProps> = () => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('resumeHistory');
    if (savedHistory) {
      setResumeHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    // Save history to localStorage whenever it changes
    localStorage.setItem('resumeHistory', JSON.stringify(resumeHistory));
  }, [resumeHistory]);

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
    setAnalysisResult(null); // Clear previous results

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);

    try {
      console.log('Sending request to:', `${process.env.REACT_APP_API_URL}/analyze`);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response:', response.data);

      if (response.data && typeof response.data === 'object') {
        // Validate response data
        const requiredFields = ['overallMatch', 'technicalSkills', 'softSkills', 'education', 'experience'];
        const missingFields = requiredFields.filter(field => !(field in response.data));
        
        if (missingFields.length > 0) {
          throw new Error(`Invalid response: missing fields ${missingFields.join(', ')}`);
        }

        setAnalysisResult(response.data);

        // Add to history
        const historyItem: ResumeHistoryItem = {
          id: Date.now().toString(),
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          analysisResult: response.data
        };
        setResumeHistory(prev => [historyItem, ...prev]);

        // Clear form
        setFile(null);
        setJobDescription('');
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error: any) {
      console.error('Error:', error);
      let errorMessage = 'An error occurred while analyzing the resume';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
        console.error('Error response:', error.response);
      } else if (error.request) {
        errorMessage = 'Could not connect to the server. Please try again.';
        console.error('Error request:', error.request);
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = useCallback(() => {
    setFile(null);
    setJobDescription('');
    setAnalysisResult(null);
    setError(null);
    setIsDragging(false);
    setIsAnalyzing(false);
    
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  const handleHistorySelect = useCallback((id: string) => {
    const item = resumeHistory.find(item => item.id === id);
    if (item) {
      setAnalysisResult(item.analysisResult);
    }
  }, [resumeHistory]);

  const deleteHistoryItem = useCallback((id: string) => {
    setResumeHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Main Upload Form */}
      <div className="space-y-6">
        {!analysisResult ? (
          <>
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

            <div className="mt-4">
              <label htmlFor="job-description" className="block text-sm font-medium text-gray-700">
                Job Description
              </label>
              <textarea
                id="job-description"
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={!file || !jobDescription.trim() || isAnalyzing}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  !file || !jobDescription.trim() || isAnalyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isAnalyzing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Analyze Resume'
                )}
              </button>
            </div>
          </>
        ) : (
          <Results analysisResult={analysisResult} onReset={resetForm} isLoading={isAnalyzing} />
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
