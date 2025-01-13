import React from 'react';
import { ChartPieIcon, ClipboardDocumentListIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface ResultsProps {
  analysisResult: {
    overallMatch: number;
    technicalSkills: number;
    experience: number;
    education: number;
    softSkills: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    improvements: string[];
    skillsNeeded: string[];
  };
  onReset: () => void;
}

const Results: React.FC<ResultsProps> = ({ analysisResult, onReset }) => {
  if (!analysisResult) return null;

  return (
    <div className="space-y-8">
      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Analyze Another Resume
        </button>
      </div>

      {/* Overview Section */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <ChartPieIcon className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Overall Match', value: analysisResult.overallMatch },
            { label: 'Technical Skills', value: analysisResult.technicalSkills },
            { label: 'Experience', value: analysisResult.experience },
            { label: 'Education', value: analysisResult.education },
            { label: 'Soft Skills', value: analysisResult.softSkills },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">{item.label}</div>
              <div className="mt-2 relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${item.value}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                  />
                </div>
                <div className="text-lg font-semibold text-gray-700 mt-1">{item.value}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Details Section */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Found Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {analysisResult.matchedKeywords.length > 0 ? (
                analysisResult.matchedKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No matching keywords found</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Missing Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {analysisResult.missingKeywords.length > 0 ? (
                analysisResult.missingKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No missing keywords</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Improvements Section */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <AcademicCapIcon className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Improvements</h2>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Suggested Improvements</h3>
            {analysisResult.improvements.length > 0 ? (
              <ul className="space-y-2">
                {analysisResult.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mr-2">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No improvements suggested</p>
            )}
          </div>
          {analysisResult.skillsNeeded.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Skills to Consider</h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.skillsNeeded.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Results;
