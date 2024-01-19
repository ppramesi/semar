from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

AutoModelForSequenceClassification.from_pretrained('cross-encoder/ms-marco-MiniLM-L-12-v2')
AutoTokenizer.from_pretrained('cross-encoder/ms-marco-MiniLM-L-12-v2')
pipeline("zero-shot-classification", model="MoritzLaurer/deberta-v3-large-zeroshot-v1.1-all-33")