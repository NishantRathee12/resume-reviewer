import React, { useCallback, useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Results from './Results';
import ResumeHistory from './ResumeHistory';

interface FileUploadProps {
  jobDescription: string;
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
  overallMatch: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ jobDescription }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    // Accept PDF and DOC/DOCX files
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (validTypes.includes(file.type)) {
      setFile(file);
      setAnalysisResult(null); // Reset previous results
    } else {
      setError('Please upload a PDF or Word document');
    }
  };

  const handleSubmit = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Please provide both a resume and a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
      
      // Check API health first
      try {
        const healthCheck = await axios.get(`${API_URL}/health`);
        console.log('API Health Check:', healthCheck.data);
        if (healthCheck.data.status !== 'healthy') {
          throw new Error('API is not healthy');
        }
      } catch (error) {
        console.error('API Health Check Failed:', error);
        throw new Error('Could not connect to the API. Please try again later.');
      }

      // Proceed with analysis
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Increased timeout to 60 seconds
      });

      const result = response.data;
      setAnalysisResult(result);
      setError(null);

      // Add to history
      const newHistoryItem: ResumeHistoryItem = {
        id: Date.now().toString(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        overallMatch: result.overallMatch,
      };
      setResumeHistory(prev => [newHistoryItem, ...prev]);
    } catch (error: any) {
      console.error('Error analyzing resume:', error);
      if (error.response) {
        // Server returned an error
        const errorMessage = error.response.data.detail || 'Failed to analyze resume';
        setError(`Server error: ${errorMessage}`);
      } else if (error.request) {
        // Request was made but no response
        setError('Could not connect to the server. Please check if the backend is running.');
      } else {
        // Something else went wrong
        setError(error.message || 'Error analyzing resume');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistorySelect = async (id: string) => {
    // TODO: Implement loading previous analysis results
    console.log('Loading analysis for history item:', id);
  };

  const resetForm = () => {
    setFile(null);
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
      {!analysisResult ? (
        // Upload Form
        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
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
                        Drag and drop your resume here
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
            className={`mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !file || !jobDescription.trim() || isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </button>

          {/* Resume History Section */}
          {resumeHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Previous Uploads</h3>
              <div className="space-y-4">
                {resumeHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(item.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleHistorySelect(item.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Show Results
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Results Area
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Analyze Another Resume
              </button>
            </div>
            
            {/* Results Content */}
            <Results analysisResult={analysisResult} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
