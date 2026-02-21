import firebase_admin
from firebase_admin import credentials, firestore
import os
from db import db, create_chat, send_message, get_messages
from dotenv import load_dotenv


from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

import uuid
from db import db

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([name, email, password,role]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Check if user already exists
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        if len(query) > 0:
            return jsonify({"error": "Email already exists"}), 409
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Create new user document
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'name': name,
            'email': email,
            'password': hashed_password,
            'role': role,
            'physio_id': None
        }
        
        users_ref.document(user_id).set(user_data)
        
        # Return success response (exclude password)
        return jsonify({
            "message": "User created successfully", 
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "physio_id": None
            }
        }), 201

    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({"error": "Missing email or password"}), 400

    try:
        # Fetch user by email
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        if not query:
             return jsonify({"error": "Invalid credentials"}), 401
             
        user_doc = query[0]
        user_data = user_doc.to_dict()
        
        if user_data and check_password_hash(user_data['password'], password):
            return jsonify({
                "message": "Login successful", 
                "user": {
                    "id": user_data['id'], 
                    "name": user_data['name'], 
                    "email": user_data['email'],
                    "role": user_data.get('role'),
                    "physio_id": user_data.get('physio_id')
                }
            }), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/profile/update', methods=['POST'])
def update_profile():
    data = request.get_json()
    user_id = data.get('id')
    name = data.get('name')
    email = data.get('email')

    if not user_id:
        return jsonify({"error": "Missing user ID"}), 400

    try:
        user_ref = db.collection('users').document(user_id)
        update_data = {}
        if name:
            update_data['name'] = name
        if email:
            update_data['email'] = email
        
        if not update_data:
            return jsonify({"error": "No data to update"}), 400

        user_ref.update(update_data)
        
        # Fetch updated user
        updated_doc = user_ref.get()
        user_data = updated_doc.to_dict()
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": user_data['id'],
                "name": user_data['name'],
                "email": user_data['email'],
                "role": user_data.get('role'),
                "physio_id": user_data.get('physio_id')
            }
        }), 200

    except Exception as e:
        print(f"Profile update error: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/physiotherapists', methods=['GET'])
def get_physiotherapists():
    try:
        users_ref = db.collection('users')
        query = users_ref.where('role', '==', 'physiotherapist').get()
        
        physios = []
        for doc in query:
            user_data = doc.to_dict()
            physios.append({
                "id": user_data['id'],
                "name": user_data['name'],
                "email": user_data['email']
            })
            
        return jsonify({"physiotherapists": physios}), 200
    except Exception as e:
        print(f"Error fetching physiotherapists: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/link-physio', methods=['POST'])
def link_physio():
    data = request.get_json()
    patient_id = data.get('patient_id')
    physio_id = data.get('physio_id')
    
    if not all([patient_id, physio_id]):
        return jsonify({"error": "Missing patient_id or physio_id"}), 400
        
    try:
        patient_ref = db.collection('users').document(patient_id)
        patient_ref.update({"physio_id": physio_id})
        
        return jsonify({"message": "Physiotherapist linked successfully"}), 200
    except Exception as e:
        print(f"Error linking physiotherapist: {e}")
        return jsonify({"error": str(e)}), 500

# ----------------- LIVE CHAT ROUTES -----------------

@app.route("/chat/create", methods=["POST"])
def api_create_chat():
    data = request.get_json()
    patient_id = data.get("patient_id")
    physio_id = data.get("physio_id")
    
    if not all([patient_id, physio_id]):
        return jsonify({"error": "Missing patient_id or physio_id"}), 400
    
    chat_id = create_chat(patient_id, physio_id)
    return jsonify({"chat_id": chat_id}), 201

@app.route("/chat/send", methods=["POST"])
def api_send_message():
    data = request.get_json()
    chat_id = data.get("chat_id")
    sender_id = data.get("sender_id")
    text = data.get("text")
    msg_type = data.get("type", "text")
    
    if not all([chat_id, sender_id, text]):
        return jsonify({"error": "Missing required fields"}), 400
    
    message_id = send_message(chat_id, sender_id, text, msg_type)
    return jsonify({"message_id": message_id}), 201

@app.route("/chat/messages/<chat_id>", methods=["GET"])
def api_get_messages(chat_id):
    try:
        messages = get_messages(chat_id)
        return jsonify({"messages": messages}), 200
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)