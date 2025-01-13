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

def generate_case_variations(base_terms):
    """Generate all possible case variations for a list of terms."""
    variations = set()
    for term in base_terms:
        # Original term
        variations.add(term)
        # Uppercase
        variations.add(term.upper())
        # Lowercase
        variations.add(term.lower())
        # Title case
        variations.add(term.title())
        
        # Handle dot variations
        if '.' in term:
            # Remove all dots
            no_dots = term.replace('.', '')
            variations.add(no_dots)
            variations.add(no_dots.upper())
            variations.add(no_dots.lower())
            variations.add(no_dots.title())
            
            # Add space after dots
            spaced_dots = term.replace('.', '. ')
            variations.add(spaced_dots)
            variations.add(spaced_dots.upper())
            variations.add(spaced_dots.lower())
            variations.add(spaced_dots.title())
            
            # Add space between letters
            if len(term) <= 5:  # Only for short abbreviations
                spaced = ' '.join(term.replace('.', ''))
                variations.add(spaced)
                variations.add(spaced.upper())
                variations.add(spaced.lower())
                variations.add(spaced.title())
    
    return list(variations)

# Base terms for degrees
BASE_TERMS = {
    'bca': ['bca', 'b.c.a', 'b.ca'],
    'mca': ['mca', 'm.c.a', 'm.ca'],
    'btech': ['btech', 'b.tech', 'b tech'],
    'mtech': ['mtech', 'm.tech', 'm tech'],
    'be': ['be', 'b.e', 'b e'],
    'me': ['me', 'm.e', 'm e'],
    'bsc': ['bsc', 'b.sc', 'b sc'],
    'msc': ['msc', 'm.sc', 'm sc'],
    'bcom': ['bcom', 'b.com', 'b com'],
    'mcom': ['mcom', 'm.com', 'm com'],
    'bba': ['bba', 'b.b.a', 'b.ba'],
    'mba': ['mba', 'm.b.a', 'm.ba'],
    'ba': ['ba', 'b.a', 'b a'],
    'ma': ['ma', 'm.a', 'm a'],
    'phd': ['phd', 'ph.d', 'ph d'],
}

# Generate all variations
DEGREE_VARIATIONS = {}
for degree, base_terms in BASE_TERMS.items():
    DEGREE_VARIATIONS[degree] = generate_case_variations(base_terms)

# Define education degree mappings and patterns with all variations
EDUCATION_PATTERNS = {
    'degrees': {
        # Bachelor's degrees with all variations
        'bachelor': [
            'bachelor', 'bachelors', 'bachelor\'s', 'Bachelor', 'Bachelors', 'BACHELOR', 'BACHELORS',
            *DEGREE_VARIATIONS['bca'],    # BCA variations
            *DEGREE_VARIATIONS['btech'],  # BTech variations
            *DEGREE_VARIATIONS['be'],     # BE variations
            *DEGREE_VARIATIONS['bsc'],    # BSc variations
            *DEGREE_VARIATIONS['bcom'],   # BCom variations
            *DEGREE_VARIATIONS['bba'],    # BBA variations
            *DEGREE_VARIATIONS['ba'],     # BA variations
            'undergraduate', 'Undergraduate', 'UNDERGRADUATE',
            'ug', 'UG', 'u.g', 'U.G', 'u.g.', 'U.G.'
        ],
        # Master's degrees with all variations
        'master': [
            'master', 'masters', 'master\'s', 'Master', 'Masters', 'MASTER', 'MASTERS',
            *DEGREE_VARIATIONS['mca'],    # MCA variations
            *DEGREE_VARIATIONS['mtech'],  # MTech variations
            *DEGREE_VARIATIONS['me'],     # ME variations
            *DEGREE_VARIATIONS['msc'],    # MSc variations
            *DEGREE_VARIATIONS['mcom'],   # MCom variations
            *DEGREE_VARIATIONS['mba'],    # MBA variations
            *DEGREE_VARIATIONS['ma'],     # MA variations
            'postgraduate', 'Postgraduate', 'POSTGRADUATE',
            'pg', 'PG', 'p.g', 'P.G', 'p.g.', 'P.G.'
        ],
        # Doctorate degrees with all variations
        'doctorate': [
            *DEGREE_VARIATIONS['phd'],
            'doctorate', 'Doctorate', 'DOCTORATE',
            'doctor of philosophy', 'Doctor of Philosophy', 'DOCTOR OF PHILOSOPHY'
        ]
    },
    'fields': {
        # Technology and Engineering fields with variations
        'technology': [
            'computer science', 'Computer Science', 'COMPUTER SCIENCE',
            'cs', 'CS', 'c.s', 'C.S', 'c.s.', 'C.S.',
            'cse', 'CSE', 'c.s.e', 'C.S.E', 'c.s.e.', 'C.S.E.',
            'information technology', 'Information Technology', 'INFORMATION TECHNOLOGY',
            'it', 'IT', 'i.t', 'I.T', 'i.t.', 'I.T.',
            'software engineering', 'Software Engineering', 'SOFTWARE ENGINEERING',
            'se', 'SE', 's.e', 'S.E', 's.e.', 'S.E.',
            'computer engineering', 'Computer Engineering', 'COMPUTER ENGINEERING',
            'ce', 'CE', 'c.e', 'C.E', 'c.e.', 'C.E.',
            'electronics', 'Electronics', 'ELECTRONICS',
            'ec', 'EC', 'e.c', 'E.C', 'e.c.', 'E.C.',
            'electrical', 'Electrical', 'ELECTRICAL',
            'ee', 'EE', 'e.e', 'E.E', 'e.e.', 'E.E.',
            'mechanical', 'Mechanical', 'MECHANICAL',
            'me', 'ME', 'm.e', 'M.E', 'm.e.', 'M.E.',
            'civil engineering', 'Civil Engineering', 'CIVIL ENGINEERING',
            'civil', 'Civil', 'CIVIL',
            'data science', 'Data Science', 'DATA SCIENCE',
            'ds', 'DS', 'd.s', 'D.S', 'd.s.', 'D.S.',
            'artificial intelligence', 'Artificial Intelligence', 'ARTIFICIAL INTELLIGENCE',
            'ai', 'AI', 'a.i', 'A.I', 'a.i.', 'A.I.',
            'machine learning', 'Machine Learning', 'MACHINE LEARNING',
            'ml', 'ML', 'm.l', 'M.L', 'm.l.', 'M.L.',
            'robotics', 'Robotics', 'ROBOTICS',
            'automation', 'Automation', 'AUTOMATION',
            'information systems', 'Information Systems', 'INFORMATION SYSTEMS',
            'is', 'IS', 'i.s', 'I.S', 'i.s.', 'I.S.',
            'web development', 'Web Development', 'WEB DEVELOPMENT',
            'web dev', 'Web Dev', 'WEB DEV',
            'mobile development', 'Mobile Development', 'MOBILE DEVELOPMENT',
            'app dev', 'App Dev', 'APP DEV',
            'cloud computing', 'Cloud Computing', 'CLOUD COMPUTING',
            'devops', 'DevOps', 'DEVOPS',
            'cybersecurity', 'Cybersecurity', 'CYBERSECURITY',
            'security', 'Security', 'SECURITY',
            'network engineering', 'Network Engineering', 'NETWORK ENGINEERING',
            'networking', 'Networking', 'NETWORKING'
        ]
    }
}

def clean_and_normalize_text(text: str) -> str:
    """Clean and normalize text by removing extra spaces and normalizing dots."""
    # Remove extra whitespace
    text = ' '.join(text.split())
    # Normalize dots in abbreviations (e.g., "b.tech" and "b. tech" -> "b.tech")
    text = re.sub(r'\.\s+', '.', text)
    return text

def extract_education_info(text: str) -> List[str]:
    """Extract education information from text with improved pattern matching."""
    text = clean_and_normalize_text(text)
    education_info = set()
    
    # Split text into sentences and process each one
    sentences = [s.strip() for s in text.split('.') if s.strip()]
    
    for sentence in sentences:
        # Try matching the original text and lowercase version
        texts_to_check = [sentence, sentence.lower(), sentence.upper()]
        
        for check_text in texts_to_check:
            # Look for degree patterns
            for degree_type, variations in EDUCATION_PATTERNS['degrees'].items():
                if any(variation in check_text for variation in variations):
                    # Try to find the field of study
                    for field_type, fields in EDUCATION_PATTERNS['fields'].items():
                        if any(field in check_text for field in fields):
                            education_info.add(f"{degree_type} in {field_type}")
                            break
                    else:
                        # If no specific field found, just add the degree
                        education_info.add(degree_type)
                    break
    
    return list(education_info)

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
    keywords['education'] = extract_education_info(text)
    
    # Define soft skills patterns
    soft_skills_keywords = [
        'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
        'time management', 'organization', 'adaptability', 'creativity', 'critical thinking',
        'collaboration', 'interpersonal', 'presentation', 'decision making', 'flexibility',
        'project management', 'team player', 'multitasking', 'attention to detail'
    ]

    # Define technical skills patterns
    technical_skills_keywords = [
        'programming', 'software', 'development', 'framework', 'language', 'database',
        'python', 'java', 'javascript', 'typescript', 'react', 'node', 'angular', 'vue',
        'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'oracle',
        'aws', 'azure', 'cloud', 'docker', 'kubernetes', 'devops', 'ci/cd',
        'git', 'github', 'bitbucket', 'jira', 'agile', 'scrum', 'rest', 'api',
        'microservices', 'web services', 'testing', 'debugging', 'algorithms',
        'data structures', 'oop', 'object oriented', 'functional programming',
        'mobile', 'android', 'ios', 'swift', 'kotlin', 'flutter', 'react native'
    ]
    
    # Extract technical skills and experience
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
            word = token.text.lower()
            
            # Check for technical skills
            if any(tech.lower() in word for tech in technical_skills_keywords):
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
        # Ensure each category has at least an empty list
        if not keywords[category]:
            keywords[category] = []
    
    return keywords

def calculate_match_scores(resume_keywords: Dict[str, List[str]], job_keywords: Dict[str, List[str]]) -> Dict[str, float]:
    """Calculate match scores for different categories."""
    scores = {}
    
    for category in resume_keywords:
        resume_set = set(resume_keywords.get(category, []))
        job_set = set(job_keywords.get(category, []))
        
        if job_set:
            match_score = len(resume_set.intersection(job_set)) / len(job_set) * 100
        else:
            match_score = 100  # If no requirements in job description, assume full match
            
        scores[category] = round(match_score, 2)
    
    # Calculate overall match (excluding empty categories)
    valid_scores = [score for score in scores.values() if score is not None]
    scores['overall_match'] = round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else 0
    
    return scores

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
async def analyze_resume(resume_file: UploadFile = File(...), job_description: str = Form(...)):
    """Analyze resume against job description."""
    try:
        logger.info(f"Processing resume: {resume_file.filename}")
        logger.debug(f"Job description length: {len(job_description)}")
        
        if not job_description.strip():
            raise HTTPException(status_code=400, detail="Job description cannot be empty")
        
        content = await resume_file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Resume file is empty")
        
        # Extract text based on file type
        resume_text = ""
        try:
            if resume_file.filename.lower().endswith('.pdf'):
                resume_text = extract_text_from_pdf(content)
            elif resume_file.filename.lower().endswith('.docx'):
                resume_text = extract_text_from_docx(content)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or DOCX file.")
        except Exception as e:
            logger.error(f"Error extracting text from file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Could not read the file: {str(e)}")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the resume. Please make sure the file is not corrupted or empty.")
        
        logger.debug(f"Extracted text length: {len(resume_text)}")
            
        # Extract keywords from both resume and job description
        try:
            resume_keywords = extract_keywords(resume_text)
            job_keywords = extract_keywords(job_description)
            logger.debug(f"Extracted keywords - Resume: {resume_keywords}, Job: {job_keywords}")
        except Exception as e:
            logger.error(f"Error extracting keywords: {str(e)}")
            raise HTTPException(status_code=500, detail="Error analyzing keywords from the resume and job description")
        
        # Calculate match scores
        try:
            scores = calculate_match_scores(resume_keywords, job_keywords)
            logger.debug(f"Calculated scores: {scores}")
        except Exception as e:
            logger.error(f"Error calculating scores: {str(e)}")
            raise HTTPException(status_code=500, detail="Error calculating match scores")
        
        # Generate improvements
        try:
            improvements = generate_improvements(resume_keywords, job_keywords)
            logger.debug(f"Generated improvements: {improvements}")
        except Exception as e:
            logger.error(f"Error generating improvements: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating improvement suggestions")
        
        # Prepare response
        try:
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
        except Exception as e:
            logger.error(f"Error preparing response: {str(e)}")
            raise HTTPException(status_code=500, detail="Error preparing analysis results")
        
        logger.info("Successfully analyzed resume")
        return response
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as they already have proper status codes
        raise he
    except Exception as e:
        logger.error(f"Unexpected error analyzing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
