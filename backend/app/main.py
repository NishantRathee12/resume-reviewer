from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
import io
from typing import List, Dict
import re
from docx import Document
import spacy
from collections import Counter
import logging
import os
import sys

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Resume Reviewer API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "https://nishant-resume-reviewer.netlify.app",
    "http://nishant-resume-reviewer.netlify.app",
    "http://localhost:9000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Successfully loaded spaCy model")
except Exception as e:
    logger.warning(f"Error loading spaCy model: {str(e)}")
    logger.info("Downloading spaCy model...")
    try:
        import subprocess
        subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
        nlp = spacy.load("en_core_web_sm")
        logger.info("Successfully downloaded and loaded spaCy model")
    except Exception as download_error:
        logger.error(f"Error downloading spaCy model: {str(download_error)}")
        raise

def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        logger.debug(f"Successfully extracted text from PDF, length: {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")

def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        doc = Document(io.BytesIO(content))
        text = " ".join([paragraph.text for paragraph in doc.paragraphs])
        logger.debug(f"Successfully extracted text from DOCX, length: {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"Error processing DOCX: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing DOCX: {str(e)}")

def extract_keywords(text: str) -> Dict[str, List[str]]:
    """Extract important keywords from text using spaCy."""
    doc = nlp(text.lower())
    keywords = {
        'technical_skills': [],
        'soft_skills': [],
        'education': [],
        'experience': []
    }
    
    # Predefined categories
    technical_indicators = {'programming', 'software', 'technology', 'database', 'framework', 'language', 'tool', 'system'}
    soft_skill_indicators = {'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical', 'organizational'}
    education_indicators = {'degree', 'university', 'college', 'education', 'certification', 'bachelor', 'master', 'phd'}
    experience_indicators = {'experience', 'work', 'job', 'position', 'role', 'project', 'achievement'}
    
    # Extract and categorize keywords
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
            word = token.text.lower()
            # Categorize based on context
            for ancestor in token.ancestors:
                ancestor_text = ancestor.text.lower()
                if any(ind in ancestor_text for ind in technical_indicators):
                    keywords['technical_skills'].append(word)
                elif any(ind in ancestor_text for ind in soft_skill_indicators):
                    keywords['soft_skills'].append(word)
                elif any(ind in ancestor_text for ind in education_indicators):
                    keywords['education'].append(word)
                elif any(ind in ancestor_text for ind in experience_indicators):
                    keywords['experience'].append(word)
    
    # Extract noun phrases
    for chunk in doc.noun_chunks:
        if len(chunk.text) > 2:
            chunk_text = chunk.text.lower()
            # Categorize based on indicators
            if any(ind in chunk_text for ind in technical_indicators):
                keywords['technical_skills'].append(chunk_text)
            elif any(ind in chunk_text for ind in soft_skill_indicators):
                keywords['soft_skills'].append(chunk_text)
            elif any(ind in chunk_text for ind in education_indicators):
                keywords['education'].append(chunk_text)
            elif any(ind in chunk_text for ind in experience_indicators):
                keywords['experience'].append(chunk_text)
    
    # Remove duplicates and get top keywords for each category
    for category in keywords:
        keywords[category] = list(set(keywords[category]))[:10]
    
    return keywords

def calculate_match_scores(resume_keywords: Dict[str, List[str]], job_keywords: Dict[str, List[str]]) -> Dict[str, float]:
    """Calculate match scores for different categories."""
    scores = {}
    
    for category in resume_keywords:
        resume_set = set(resume_keywords[category])
        job_set = set(job_keywords[category])
        
        if job_set:
            match_score = len(resume_set.intersection(job_set)) / len(job_set) * 100
        else:
            match_score = 100  # If no requirements in job description, assume full match
            
        scores[category] = round(match_score, 2)
    
    # Calculate overall match
    total_score = sum(scores.values())
    scores['overall_match'] = round(total_score / len(scores), 2)
    
    return scores

def generate_improvements(resume_keywords: Dict[str, List[str]], job_keywords: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Generate detailed improvement suggestions."""
    improvements = {
        'missing_keywords': [],
        'improvements': [],
        'skills_needed': []
    }
    
    # Find missing keywords in each category
    for category in resume_keywords:
        resume_set = set(resume_keywords[category])
        job_set = set(job_keywords[category])
        missing = job_set - resume_set
        
        if missing:
            improvements['missing_keywords'].extend(list(missing))
            
            # Generate category-specific improvements
            if category == 'technical_skills':
                improvements['skills_needed'].extend(list(missing))
                improvements['improvements'].append(f"Add experience with {', '.join(list(missing))} to your technical skills section")
            elif category == 'soft_skills':
                improvements['improvements'].append(f"Highlight your {', '.join(list(missing))} abilities in your experience descriptions")
            elif category == 'education':
                improvements['improvements'].append("Consider adding relevant certifications or educational achievements")
            elif category == 'experience':
                improvements['improvements'].append("Add more detailed work experience highlighting your achievements and responsibilities")
    
    # Add general improvements if needed
    if len(resume_keywords['technical_skills']) < 5:
        improvements['improvements'].append("Add more technical skills to your resume")
    if len(resume_keywords['soft_skills']) < 3:
        improvements['improvements'].append("Include more soft skills and interpersonal abilities")
    if len(resume_keywords['experience']) < 5:
        improvements['improvements'].append("Expand your work experience section with more details")
    
    return improvements

@app.get("/")
async def read_root():
    return {"message": "Welcome to Resume Reviewer API"}

@app.post("/analyze")
async def analyze_resume(resume: UploadFile = File(...), jobDescription: str = Form(...)):
    """Analyze resume against job description."""
    try:
        logger.info(f"Processing resume: {resume.filename}")
        content = await resume.read()
        
        # Extract text based on file type
        if resume.filename.endswith('.pdf'):
            resume_text = extract_text_from_pdf(content)
        elif resume.filename.endswith('.docx'):
            resume_text = extract_text_from_docx(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Extract keywords from both resume and job description
        resume_keywords = extract_keywords(resume_text)
        job_keywords = extract_keywords(jobDescription)
        
        # Calculate match scores
        scores = calculate_match_scores(resume_keywords, job_keywords)
        
        # Generate improvements
        improvements = generate_improvements(resume_keywords, job_keywords)
        
        # Prepare response
        response = {
            'overallMatch': scores['overall_match'],
            'technicalSkills': scores['technical_skills'],
            'softSkills': scores['soft_skills'],
            'education': scores['education'],
            'experience': scores['experience'],
            'matchedKeywords': [kw for cat in resume_keywords.values() for kw in cat],
            'missingKeywords': improvements['missing_keywords'],
            'improvements': improvements['improvements'],
            'skillsNeeded': improvements['skills_needed']
        }
        
        logger.info("Successfully analyzed resume")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
