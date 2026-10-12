"""Non-destructive Google Cloud auth preflight. Never log keys, tokens or auth URIs."""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid


class CheckFailed(Exception):
    pass


def check(condition, message):
    if not condition:
        raise CheckFailed(message)


def google_request(url, body=None):
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.load(error)
        except (ValueError, OSError):
            raise CheckFailed("Google returned an unreadable response.") from None
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        raise CheckFailed("Could not reach Google Cloud. Check API restrictions or retry the build.") from None


def error_code(data):
    message = str(data.get("error", {}).get("message", ""))
    code = message.split(" : ")[0]
    # Only allow known safe codes into logs; Google messages can contain configuration values.
    allowed = {"INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "OPERATION_NOT_ALLOWED", "CONFIGURATION_NOT_FOUND", "INVALID_CONTINUE_URI", "UNAUTHORIZED_DOMAIN", "INVALID_PROVIDER_ID", "PROJECT_NUMBER_MISMATCH", "TOO_MANY_ATTEMPTS_TRY_LATER"}
    return code if code in allowed else "GOOGLE_REJECTED_REQUEST"


def main():
    names = ("GOOGLE_CLOUD_API_KEY", "GOOGLE_CLOUD_PROJECT_ID", "GOOGLE_WEB_CLIENT_ID")
    values = {name: os.environ.get(name, "") for name in names}
    for name, value in values.items():
        check(value and value == value.strip(), f"Set {name} in repository Actions secrets without surrounding whitespace.")
    key, project, client = (values[name] for name in names)
    check(re.fullmatch(r"AIza[A-Za-z0-9_-]{35}", key), "GOOGLE_CLOUD_API_KEY must contain the Identity Platform API key only.")
    check(re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project), "GOOGLE_CLOUD_PROJECT_ID must be the text Project ID, not its display name or number.")
    check(re.fullmatch(r"[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com", client), "GOOGLE_WEB_CLIENT_ID must contain the Web application OAuth client ID only.")
    print("All three Google Cloud build settings are present and correctly formatted.")

    base = "https://identitytoolkit.googleapis.com/v1/"
    query = urllib.parse.urlencode({"key": key, "clientId": client})
    status, config = google_request(base + "projects?" + query)
    check(status == 200, f"Google rejected the project/key/client check (HTTP {status}, {error_code(config)}). Check that all three settings use the same project and that Identity Toolkit API is enabled.")
    returned_project = str(config.get("projectId", ""))
    # Some legacy responses expose a numeric project number instead of the text ID.
    if returned_project and not returned_project.isdigit():
        check(returned_project == project, "The API key belongs to a different project than GOOGLE_CLOUD_PROJECT_ID.")
        print("API key, Project ID and OAuth client association verified.")
    else:
        print("API key and OAuth client association verified; public API does not expose the text Project ID.")
    domains = config.get("authorizedDomains", [])
    probe_domain = next((d for d in domains if re.fullmatch(r"[a-zA-Z0-9.-]+", d)), None)
    check(probe_domain, "Google provider configuration has no authorized domain for its non-destructive provider check.")
    probe_uri = "http://localhost" if probe_domain == "localhost" else f"https://{probe_domain}"
    print("Provider probe uses an existing authorized domain; native sign-in requires no website callback.")

    status, google = google_request(base + "accounts:createAuthUri?" + urllib.parse.urlencode({"key": key}), {"providerId": "google.com", "continueUri": probe_uri})
    check(status == 200, f"Google provider check failed (HTTP {status}, {error_code(google)}). Enable Google in Identity Platform and check its Web Client ID/secret.")
    uri = urllib.parse.urlparse(google.get("authUri", ""))
    provider_client = urllib.parse.parse_qs(uri.query).get("client_id", [None])[0]
    check(uri.hostname in ("accounts.google.com", "accounts.googleusercontent.com") and provider_client == client, "Google provider Web Client ID does not match GOOGLE_WEB_CLIENT_ID. Update the provider or repository secret.")
    print("Google provider is enabled and uses the configured Web Client ID.")

    # A unique reserved-domain identifier cannot be a real member. This is a sign-in
    # rejection probe only: it never registers a user, sends email, or writes account data.
    status, password = google_request(base + "accounts:signInWithPassword?" + urllib.parse.urlencode({"key": key}), {"email": f"build-check-{uuid.uuid4().hex}@example.invalid", "password": uuid.uuid4().hex, "returnSecureToken": True})
    check(status == 400 and error_code(password) in ("INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD"), f"Email/password provider check did not return the expected rejection (HTTP {status}, {error_code(password)}). Check that Email/Password is enabled.")
    print("Email/password sign-in is enabled and rejects invalid credentials.")
    print("Cloud authentication preflight passed. Native account selection still requires a device sign-in test.")


if __name__ == "__main__":
    try:
        main()
    except CheckFailed as error:
        print(f"Configuration check failed: {error}", file=sys.stderr)
        sys.exit(1)
