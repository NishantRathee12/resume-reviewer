from fastapi import FastAPI, UploadFile, Form, HTTPException
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

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Resume Reviewer API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "https://resume-reviewer.netlify.app",  # Replace with your Netlify domain
    "https://resume-reviewer-api.onrender.com"  # Your Render domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Successfully loaded spaCy model")
except Exception as e:
    logger.error(f"Error loading spaCy model: {str(e)}")
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

def extract_keywords(text: str) -> List[str]:
    """Extract important keywords from text using spaCy."""
    doc = nlp(text.lower())
    keywords = []
    
    # Extract nouns, proper nouns, and skill-related words
    for token in doc:
        if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
            keywords.append(token.text)
        
    # Extract noun phrases
    for chunk in doc.noun_chunks:
        if len(chunk.text) > 2:
            keywords.append(chunk.text)
            
    # Count frequencies and get top keywords
    keyword_freq = Counter(keywords)
    logger.debug(f"Extracted keywords, count: {len(keywords)}")
    return [word for word, freq in keyword_freq.most_common(20)]

def generate_suggestions(resume_text: str, job_keywords: List[str], matched_keywords: List[str]) -> List[str]:
    """Generate suggestions based on analysis."""
    suggestions = []
    
    # Missing keywords suggestion
    missing_keywords = set(job_keywords) - set(matched_keywords)
    if missing_keywords:
        suggestions.append(f"Consider adding these key skills: {', '.join(list(missing_keywords)[:5])}")
    
    # Length suggestion
    word_count = len(resume_text.split())
    if word_count < 300:
        suggestions.append("Your resume seems brief. Consider adding more details about your experiences.")
    elif word_count > 1000:
        suggestions.append("Your resume is quite lengthy. Consider making it more concise.")
    
    # Format suggestions
    if len(re.findall(r'\b\d+(?:\.\d+)?%?\b', resume_text)) < 3:
        suggestions.append("Add more quantifiable achievements (numbers, percentages) to strengthen your impact.")
    
    logger.debug(f"Generated suggestions, count: {len(suggestions)}")
    return suggestions

@app.get("/")
async def read_root():
    return {"message": "Welcome to Resume Reviewer API"}

@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile,
    jobDescription: str = Form(...)
):
    logger.info(f"Received resume analysis request - File: {resume.filename}, Content-Type: {resume.content_type}")
    
    try:
        # Validate file type
        if resume.content_type not in [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]:
            logger.error(f"Invalid file type: {resume.content_type}")
            raise HTTPException(status_code=400, detail="File must be PDF or Word document")
        
        # Read file content
        content = await resume.read()
        logger.debug(f"Successfully read file content, size: {len(content)} bytes")
        
        # Extract text based on file type
        try:
            if resume.content_type == 'application/pdf':
                resume_text = extract_text_from_pdf(content)
            else:
                resume_text = extract_text_from_docx(content)
            logger.debug(f"Successfully extracted text, length: {len(resume_text)} characters")
        except Exception as e:
            logger.error(f"Error extracting text from file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Error extracting text from file: {str(e)}")
        
        # Extract keywords
        try:
            job_keywords = extract_keywords(jobDescription)
            resume_keywords = extract_keywords(resume_text)
            logger.debug(f"Extracted keywords - Job: {len(job_keywords)}, Resume: {len(resume_keywords)}")
        except Exception as e:
            logger.error(f"Error extracting keywords: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error analyzing keywords: {str(e)}")
        
        # Find matching keywords
        matched_keywords = list(set(job_keywords) & set(resume_keywords))
        
        # Calculate compatibility score
        if len(job_keywords) > 0:
            compatibility = round((len(matched_keywords) / len(job_keywords)) * 100)
        else:
            compatibility = 0
        
        # Generate suggestions
        suggestions = generate_suggestions(resume_text, job_keywords, matched_keywords)
        
        response = {
            "compatibility": min(compatibility, 100),  # Cap at 100%
            "keywords": matched_keywords,
            "suggestions": suggestions
        }
        logger.info("Successfully completed resume analysis")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during resume analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")
