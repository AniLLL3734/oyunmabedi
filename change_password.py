import requests

# API endpoint
url = 'http://localhost:5000/api/change-password'

# Data to send
data = {
    'email': 'buketmmc@ttmtal.com',
    'new_password': 'bmumcu1'
}

# Make the POST request
response = requests.post(url, json=data)

# Print the response
print(response.json())
