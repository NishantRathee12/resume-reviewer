#!/usr/bin/env bash
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm 