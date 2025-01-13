from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
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

# Define education degree mappings and patterns
EDUCATION_PATTERNS = {
    'degrees': {
        # Bachelor's degrees
        'bachelor': [
            'bachelor', 'bachelors', 'b.tech', 'btech', 'b.e', 'be', 'b.sc', 'bsc',
            'bca', 'b.c.a', 'b.com', 'bcom', 'bba', 'b.b.a', 'ba', 'b.a',
            'undergraduate', 'ug', 'bachelor of technology', 'bachelor of engineering',
            'bachelor of science', 'bachelor of commerce', 'bachelor of arts',
            'bachelor of business administration', 'bachelor of computer applications'
        ],
        # Master's degrees
        'master': [
            'master', 'masters', 'm.tech', 'mtech', 'm.e', 'me', 'm.sc', 'msc',
            'mca', 'm.c.a', 'master in computer applications', 'master of computer applications',
            'mba', 'm.b.a', 'ma', 'm.a', 'ms', 'm.s', 'm.com', 'mcom',
            'postgraduate', 'pg', 'master of technology', 'master of engineering',
            'master of science', 'master of commerce', 'master of arts',
            'master of business administration'
        ],
        # Doctorate degrees
        'doctorate': [
            'phd', 'ph.d', 'doctorate', 'doctor of philosophy'
        ],
        # Other qualifications
        'other': [
            'diploma', 'certification', 'certificate', 'associate degree',
            'professional certification', 'post graduate diploma', 'pgd', 'pg diploma'
        ]
    },
    'fields': {
        # Technology and Engineering
        'technology': [
            'computer science', 'information technology', 'software engineering',
            'computer engineering', 'electronics', 'electrical', 'mechanical',
            'civil engineering', 'data science', 'artificial intelligence',
            'machine learning', 'robotics', 'automation', 'mechatronics',
            'information systems', 'web development', 'mobile development',
            'cloud computing', 'cybersecurity', 'network engineering',
            'telecommunications', 'embedded systems'
        ],
        # Business and Management
        'business': [
            'business administration', 'management', 'finance', 'marketing',
            'accounting', 'economics', 'human resources', 'hr management',
            'operations management', 'supply chain management', 'project management',
            'international business', 'entrepreneurship', 'business analytics',
            'digital marketing', 'e-commerce'
        ],
        # Science and Mathematics
        'science': [
            'mathematics', 'physics', 'chemistry', 'biology', 'statistics',
            'applied mathematics', 'computational science', 'environmental science',
            'biotechnology', 'bioinformatics', 'quantum computing', 'data analytics',
            'applied physics', 'material science'
        ],
        # Arts and Humanities
        'arts': [
            'communication', 'english', 'literature', 'journalism', 'media studies',
            'design', 'graphic design', 'ui/ux design', 'user interface design',
            'user experience design', 'digital media', 'content creation',
            'technical writing', 'creative writing'
        ]
    },
    'institutions': [
        'university', 'college', 'institute', 'school', 'academy',
        'polytechnic', 'global', 'international', 'national'
    ],
    'academic_terms': [
        'cgpa', 'gpa', 'grade', 'academic', 'score', 'percentage',
        'distinction', 'first class', 'second class', 'honors', 'honours'
    ]
}

def normalize_education_term(term: str) -> str:
    """Normalize education terms to standard forms."""
    term = term.lower().strip()
    
    # Check degree mappings
    for degree_type, variations in EDUCATION_PATTERNS['degrees'].items():
        if any(var in term for var in variations):
            return degree_type
            
    # Check field mappings
    for field_type, variations in EDUCATION_PATTERNS['fields'].items():
        if any(var in term for var in variations):
            return field_type
            
    return term

def extract_keywords(text: str) -> Dict[str, List[str]]:
    """Extract important keywords from text using spaCy with improved education detection."""
    doc = nlp(text.lower())
    keywords = {
        'technical_skills': [],
        'soft_skills': [],
        'education': [],
        'experience': []
    }
    
    # Extract education information
    education_info = set()
    for sent in doc.sents:
        sent_text = sent.text.lower()
        
        # Check for degree patterns
        for degree_type, variations in EDUCATION_PATTERNS['degrees'].items():
            if any(var in sent_text for var in variations):
                # Try to extract the complete degree phrase
                for field_type, fields in EDUCATION_PATTERNS['fields'].items():
                    if any(field in sent_text for field in fields):
                        education_info.add(f"{degree_type} in {field_type}")
                        break
                else:
                    education_info.add(degree_type)
        
        # Check for institutions
        if any(inst in sent_text for inst in EDUCATION_PATTERNS['institutions']):
            education_info.add(sent_text.strip())
            
        # Check for academic terms
        if any(term in sent_text for term in EDUCATION_PATTERNS['academic_terms']):
            education_info.add(sent_text.strip())
    
    keywords['education'] = list(education_info)
    
    # Define soft skills patterns
    soft_skills_keywords = [
        'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
        'time management', 'organization', 'adaptability', 'creativity', 'critical thinking',
        'collaboration', 'interpersonal', 'presentation', 'decision making', 'flexibility',
        'project management', 'team player', 'multitasking', 'attention to detail'
    ]
    
    # Extract technical skills and experience
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
            word = token.text.lower()
            
            # Check context for technical skills
            if any(tech in word for tech in ['programming', 'software', 'development', 'framework', 'language', 'database']):
                keywords['technical_skills'].append(word)
            
            # Check for experience keywords
            if any(exp in word for exp in ['experience', 'work', 'project', 'year']):
                keywords['experience'].append(word)
    
    # Check for soft skills
    for sent in doc.sents:
        sent_text = sent.text.lower()
        for skill in soft_skills_keywords:
            if skill in sent_text:
                keywords['soft_skills'].append(skill)
    
    # Clean up and remove duplicates
    for category in keywords:
        keywords[category] = list(set(keywords[category]))
        keywords[category] = [k.strip() for k in keywords[category] if len(k.strip()) > 2]
    
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

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is running."""
    return {"status": "ok", "message": "API is running"}

@app.get("/")
async def read_root():
    """Root endpoint."""
    return {"message": "Welcome to Resume Reviewer API"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "API is running"}

@app.post("/analyze")
async def analyze_resume(resume: UploadFile = File(...), jobDescription: str = Form(...)):
    """Analyze resume against job description."""
    try:
        logger.info(f"Processing resume: {resume.filename}")
        content = await resume.read()
        
        # Extract text based on file type
        if resume.filename.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(content)
        elif resume.filename.lower().endswith('.docx'):
            resume_text = extract_text_from_docx(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or DOCX file.")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the resume. Please make sure the file is not corrupted.")
            
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
