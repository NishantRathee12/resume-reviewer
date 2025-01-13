import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';

const Home: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">AI-Powered</span>
              <span className="block text-primary-600">Resume Reviewer</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Get professional feedback on your resume using advanced AI technology.
              Improve your chances of landing your dream job.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Analyze Your Resume
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Paste the job description and upload your resume to get instant feedback
            </p>
          </div>

          {/* Job Description Section */}
          <div className="mb-8">
            <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Job Description
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={6}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* File Upload Component */}
          <FileUpload 
            jobDescription={jobDescription} 
            setJobDescription={setJobDescription}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; 2025 Resume Reviewer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
