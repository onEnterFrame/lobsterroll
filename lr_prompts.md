http://localhost:3000/

When I click the link to confirm my email it goes to localhost. 
I edited the link and went to https://lobsterroll-web.onrender.com/#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6IjAzYzkyZDU2LTE4YzMtNGNmMi1iMTdiLWNmZDE2MTQyYmExNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL252c2JzdHVmd2lodnBuZ3h5eXBzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NDQyMmVhYS1kMzAxLTRhOWYtOTE4OS1jZjgzY2M3ZWIxNWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0NTQyMzI3LCJpYXQiOjE3NzQ1Mzg3MjcsImVtYWlsIjoidGhpcy5vbmVudGVyZnJhbWVAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJkaXNwbGF5X25hbWUiOiJLaW5nc2xleSIsImVtYWlsIjoidGhpcy5vbmVudGVyZnJhbWVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiODQ0MjJlYWEtZDMwMS00YTlmLTkxODktY2Y4M2NjN2ViMTVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzc0NTM4NzI3fV0sInNlc3Npb25faWQiOiI3NjgxYjYxZC1mZWNjLTQyNTktOGQyMi05OWNmMjI3NzUzNmQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.WBxuG5pBXZE7RU3qTPM8-QsFAUt3QGqgLrd6Cj_C4WdbECr6XAA6TYvuabHHn54cr2RE02qtJ412NLLa1-UBLA&expires_at=1774542327&expires_in=3600&refresh_token=z4v5ap4cohq2&sb=&token_type=bearer&type=signup
That displays the loging page.
But when I try to login it just refreshes the page. 

console:
Navigated to https://lobsterroll-web.onrender.com/
icon-192.png:1  GET https://lobsterroll-web.onrender.com/icon-192.png 404 (Not Found)
/#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6IjAzYzkyZDU2LTE4YzMtNGNmMi1iMTdiLWNmZDE2MTQyYmExNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL252c2JzdHVmd2lodnBuZ3h5eXBzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NDQyMmVhYS1kMzAxLTRhOWYtOTE4OS1jZjgzY2M3ZWIxNWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0NTQyMzI3LCJpYXQiOjE3NzQ1Mzg3MjcsImVtYWlsIjoidGhpcy5vbmVudGVyZnJhbWVAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJkaXNwbGF5X25hbWUiOiJLaW5nc2xleSIsImVtYWlsIjoidGhpcy5vbmVudGVyZnJhbWVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiODQ0MjJlYWEtZDMwMS00YTlmLTkxODktY2Y4M2NjN2ViMTVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzc0NTM4NzI3fV0sInNlc3Npb25faWQiOiI3NjgxYjYxZC1mZWNjLTQyNTktOGQyMi05OWNmMjI3NzUzNmQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.WBxuG5pBXZE7RU3qTPM8-QsFAUt3QGqgLrd6Cj_C4WdbECr6XAA6TYvuabHHn54cr2RE02qtJ412NLLa1-UBLA&expires_at=1774542327&expires_in=3600&refresh_token=z4v5ap4cohq2&sb=&token_type=bearer&type=signup:1 Error while trying to use the following icon from the Manifest: https://lobsterroll-web.onrender.com/icon-192.png (Download error or resource isn't a valid image)
index-C9i28pRL.js:103  GET https://lobsterroll-api.onrender.com/v1/auth/me 401 (Unauthorized)
Do @ index-C9i28pRL.js:103
get @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
_notifyAllSubscribers @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:102
setTimeout
_initialize @ index-C9i28pRL.js:102
await in _initialize
(anonymous) @ index-C9i28pRL.js:102
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:87
index-C9i28pRL.js:103  GET https://lobsterroll-api.onrender.com/v1/auth/me 401 (Unauthorized)
Do @ index-C9i28pRL.js:103
get @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
_useSession @ index-C9i28pRL.js:103
await in _useSession
_emitInitialSession @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:103
(anonymous) @ index-C9i28pRL.js:87
