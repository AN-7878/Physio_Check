
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from datetime import datetime, timezone


load_dotenv()

# Initialize Firebase Admin SDK
# Ensure you have 'serviceAccountKey.json' in your backend directory
cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        print("Make sure 'serviceAccountKey.json' is in the backend directory.")

db = firestore.client()

# ----------------- LIVE CHAT FUNCTIONS -----------------
def create_chat(patient_id, physio_id):
    """Create a new chat room between patient and physiotherapist"""
    chat_ref = db.collection("chats").document()
    chat_ref.set({
        "participants": [patient_id, physio_id],
        "lastUpdated": datetime.now(timezone.utc)  # timezone-aware UTC
    })
    return chat_ref.id

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