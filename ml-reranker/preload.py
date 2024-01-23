from transformers import AutoTokenizer, AutoModelForSequenceClassification

AutoModelForSequenceClassification.from_pretrained('cross-encoder/ms-marco-MiniLM-L-12-v2')
AutoTokenizer.from_pretrained('cross-encoder/ms-marco-MiniLM-L-12-v2')