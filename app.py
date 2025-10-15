from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth

load_dotenv()

# Firebase Admin SDK initialization
cred = credentials.Certificate('C:\\Users\\Administrator\\Downloads\\ttmtal-7b139-firebase-adminsdk-fbsvc-f8c32f1a22.json')
firebase_admin.initialize_app(cred)

app = Flask(__name__)
CORS(app)

@app.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        # Get data from JSON or form
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        name = data.get('name')
        email = data.get('email')
        message = data.get('message')

        # Validate input
        if not all([name, email, message]):
            return jsonify({'error': 'All fields are required'}), 400

        # Email configuration
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        to_email = os.getenv('TO_EMAIL', 'your-email@example.com')

        if not all([smtp_username, smtp_password]):
            return jsonify({'error': 'Email configuration missing'}), 500

        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = to_email
        msg['Subject'] = f'Portfolio Contact Form - Message from {name}'

        body = f"""
        Name: {name}
        Email: {email}

        Message:
        {message}
        """

        msg.attach(MIMEText(body, 'plain'))

        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, to_email, text)
        server.quit()

        return jsonify({'message': 'Email sent successfully'}), 200

    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({'error': 'Failed to send email'}), 500

@app.route('/api/change-password', methods=['POST'])
def change_password():
    try:
        data = request.get_json()
        email = data.get('email')
        new_password = data.get('new_password')

        if not email or not new_password:
            return jsonify({'error': 'Email and new password are required'}), 400

        # Update password using Firebase Admin SDK
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        print(f"Error changing password: {e}")
        return jsonify({'error': 'Failed to change password'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
