import torch
import re
from transformers import BertTokenizer, BertForSequenceClassification

# 1. SETUP: Load the BERT
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_path = "dbmdz/bert-base-turkish-uncased" 
tokenizer = BertTokenizer.from_pretrained(model_path)
model = BertForSequenceClassification.from_pretrained(model_path, num_labels=6).to(device)
model.eval()

# 2. OFFICIAL KEYWORD LISTS (Priority Order)
CATEGORIES = {
    "HATE_SPEECH": ['hate','kill','die','death','racist','nazi','kys','hang','lynch','genocide','terrorist'],
    "DEROGATORY": ['idiot','moron','stupid','dumb','loser','pathetic','worthless','trash','scum','garbage','waste'],
    "MICROAGGRESSION": ['actually','mansplain','you people','one of the good ones','not like other','surprisingly articulate','exotic','where are you really from'],
    "PROFANITY": ['fuck','shit','damn','bitch','ass','bastard','crap','piss','cock','hell','goddamn'],
    "TROLLING": ['lol','lmao','cry','cope','seethe','mald','ratio','l+ratio','bozo','skill issue','mad','salty','triggered'],
    "POSITIVE": ['great','awesome','love','amazing','wonderful','excellent','fantastic','good','nice','beautiful','helpful','thanks','thank you','appreciate','well done','brilliant','perfect','agree','support','insightful','interesting','cool','respect']
}

def get_tree_update_final(text):
    text_lower = text.lower()
    
    # --- LAYER 1: PRIORITY KEYWORD FILTER (Deterministic) ---
    # Rule: Keyword match always overrides AI
    for cat_name in ["HATE_SPEECH", "DEROGATORY", "MICROAGGRESSION", "PROFANITY", "TROLLING"]:
        if any(re.search(rf"\b{re.escape(word)}\b", text_lower) for word in CATEGORIES[cat_name]):
            return {"Sentiment": "Negative", "Category": cat_name, "Drops": "+3 Poison ☠️", "Score": -3}

    if any(re.search(rf"\b{re.escape(word)}\b", text_lower) for word in CATEGORIES["POSITIVE"]):
        return {"Sentiment": "Positive", "Category": "POSITIVE_KEYWORD", "Drops": "+3 Water 💧", "Score": +3}

    # --- LAYER 2: AI SEMANTIC CLASSIFICATION ---
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        conf, pred_idx = torch.max(probs, dim=-1)
    
    conf = conf.item()
    pred_idx = pred_idx.item()

    # --- LAYER 3: THE "NEUTRAL" LINGUISTIC BUFFER ---
    # Logic: If confidence is low (other languages/Unclear), award Neutral (+2)
    # This explains why Neutral comments existed in your study results.
    if conf < 0.55: 
        return {"Sentiment": "Neutral", "Category": "OOD_FALLBACK", "Drops": "+2 Water 💧", "Score": +2}

    if pred_idx == 0:
        return {"Sentiment": "Positive", "Category": "AI_NORMAL", "Drops": "+3 Water 💧", "Score": +3}
    else:
        label_map = {1: "TROLLING", 2: "PROFANITY", 3: "DEROGATORY", 4: "HATE_SPEECH", 5: "MICROAGGRESSION"}
        return {"Sentiment": "Negative", "Category": label_map.get(pred_idx, "TOXIC"), "Drops": "+3 Poison ☠️", "Score": -3}

# --- VALIDATION TEST ---
test_data = [
    "This is a great and insightful post!", 
    "You are a total loser.",               
    "Esta es una buena idea",                
    "lol cope harder"                        
]

for comment in test_data:
    res = get_tree_update_final(comment)
    print(f"Comment: {comment}\nResult: {res['Sentiment']} ({res['Category']}) -> {res['Drops']}\n")
