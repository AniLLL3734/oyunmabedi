from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
