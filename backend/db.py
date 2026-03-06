import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# Check Render's secure secret folder first, then fall back to local folder
render_path = '/etc/secrets/serviceAccountKey.json'
local_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

cred_path = render_path if os.path.exists(render_path) else local_path

if not firebase_admin._apps:
    # If the file is missing or broken, this will now intentionally crash and tell us exactly why, 
    # instead of silently failing and freezing your app!
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print(f"Firebase initialized successfully using: {cred_path}")

db = firestore.client()

# ----------------- LIVE CHAT FUNCTIONS -----------------
def get_chat_id(patient_id, physio_id):
    """Generate a consistent chat ID by sorting participant IDs"""
    ids = sorted([patient_id, physio_id])
    return f"chat_{ids[0]}_{ids[1]}"

def create_chat(patient_id, physio_id):
    """Create or get a chat room between patient and physiotherapist"""
    chat_id = get_chat_id(patient_id, physio_id)
    chat_ref = db.collection("chats").document(chat_id)
    
    doc = chat_ref.get()
    if not doc.exists:
        chat_ref.set({
            "id": chat_id,
            "participants": [patient_id, physio_id],
            "lastUpdated": datetime.now(timezone.utc)
        })
    return chat_id

def send_message(chat_id, sender_id, text, msg_type="text"):
    """Send a message in a chat room"""
    message_ref = db.collection("chats").document(chat_id).collection("messages").document()
    message_ref.set({
        "senderId": sender_id,
        "text": text,
        "type": msg_type,
        "timestamp": datetime.now(timezone.utc),  # timezone-aware UTC
        "readBy": []
    })
    # Update chat's lastUpdated timestamp
    db.collection("chats").document(chat_id).update({"lastUpdated": datetime.now(timezone.utc)})
    return message_ref.id

def get_messages(chat_id, limit=50):
    """Fetch the last messages of a chat room"""
    messages_ref = db.collection("chats").document(chat_id).collection("messages") \
                     .order_by("timestamp").limit_to_last(limit)
    return [msg.to_dict() for msg in messages_ref.stream()]