
import os

ip_list = ["google.com", "facebook.com", "punchng.com"]

for url in ip_list:
    reply = os.popen(f"ping {url}").read
    if "Received = 4" in reply:
        print(f"UP {url} The server is up and running")
    else:
        print(f"DOWN {url} The server is down, contact your Network Administrator")

    
