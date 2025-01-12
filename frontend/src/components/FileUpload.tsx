import React, { useCallback, useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface FileUploadProps {
  jobDescription: string;
}

interface AnalysisResult {
  compatibility: number;
  keywords: string[];
  suggestions: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({ jobDescription }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      console.log('Sending request to backend...');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });
      console.log('Response received:', response.data);
      setAnalysisResult(response.data);
    } catch (error: any) {
      console.error('Error analyzing resume:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        setError(`Server error: ${error.response.data.detail || 'Failed to analyze resume'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
        setError('Could not connect to the server. Please make sure the backend is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        setError('Error analyzing resume: ' + error.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      <div
        className={`relative flex flex-col items-center justify-center w-full h-64 p-6 border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50'
        } hover:border-primary-400`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          accept=".pdf,.doc,.docx"
        />
        
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
      </div>

      {file && (
        <button
          onClick={handleSubmit}
          disabled={isAnalyzing || !jobDescription.trim()}
          className={`w-full mt-4 px-4 py-2 text-sm font-medium text-white rounded-md ${
            isAnalyzing || !jobDescription.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      )}

      {analysisResult && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Compatibility Score</span>
              <span className="text-sm font-medium text-primary-600">
                {analysisResult.compatibility}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${analysisResult.compatibility}%` }}
              />
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Matched Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {analysisResult.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
            <ul className="list-disc list-inside space-y-1">
              {analysisResult.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {suggestion}
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
