import requests

def test_health_check():
    try:
        response = requests.get('http://localhost:5001/api/health')
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_health_check()
