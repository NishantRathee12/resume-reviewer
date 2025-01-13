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
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      const result = response.data;
      setAnalysisResult(result);

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
        setError(`Server error: ${error.response.data.detail || 'Failed to analyze resume'}`);
      } else if (error.request) {
        setError('Could not connect to the server. Please make sure the backend is running.');
      } else {
        setError('Error analyzing resume: ' + error.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistorySelect = async (id: string) => {
    // TODO: Implement loading previous analysis results
    console.log('Loading analysis for history item:', id);
  };

  return (
    <div>
      <div className="max-w-xl mx-auto">
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-white'
          }`}
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
      </div>

      {/* Results Section */}
      {analysisResult && (
        <div className="mt-8">
          <Results analysisResult={analysisResult} />
        </div>
      )}

      {/* Resume History Section */}
      {resumeHistory.length > 0 && (
        <ResumeHistory
          history={resumeHistory}
          onSelect={handleHistorySelect}
        />
      )}
    </div>
  );
};

export default FileUpload;
