"""Private REST adapter; never log response bodies, property facts or tokens."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from .descriptions import GenerationError, completion_request, completion_text


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def json_request(url, headers, body=None, timeout=15):
    request = urllib.request.Request(url, headers={**headers, "Content-Type": "application/json"}, data=None if body is None else json.dumps(body, allow_nan=False).encode())
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=timeout) as response:
            data = response.read(32769)
            if len(data) > 32768:
                raise GenerationError("INVALID_OUTPUT")
            return json.loads(data)
    except urllib.error.HTTPError as error:
        raise GenerationError("PROVIDER_UNAVAILABLE" if error.code in (408, 429) or error.code >= 500 else "PROVIDER_REJECTED", retry=error.code in (408, 429) or error.code >= 500) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise GenerationError("PROVIDER_UNAVAILABLE", retry=True) from None
    except (ValueError, UnicodeError):
        raise GenerationError("INVALID_OUTPUT") from None


class JobStore:
    def __init__(self):
        base, key = os.getenv("SUPABASE_URL", "").rstrip("/"), os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        url = urllib.parse.urlsplit(base)
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or not key:
            raise GenerationError("CONFIGURATION")
        self.base = base + "/rest/v1/"
        self.headers = {"apikey": key, **({} if key.startswith("sb_") else {"Authorization": "Bearer " + key})}

    def claim(self, job_id):
        rows = json_request(self.base + "rpc/claim_property_description_job", self.headers, {"p_id": job_id})
        return rows[0] if rows else None

    def status(self, job_id):
        rows = json_request(self.base + "property_description_jobs?id=eq." + job_id + "&select=status", self.headers)
        return rows[0]["status"] if rows else None

    def finish(self, job_id, lease, result, error, retry):
        return json_request(self.base + "rpc/finish_property_description_job", self.headers, {"p_id": job_id, "p_lease": lease, "p_result": result, "p_error": error, "p_retry": retry}) is True


def generate(facts, model):
    if os.getenv("AI_DESCRIPTION_ENABLED") != "true" or model != os.getenv("AI_GATEWAY_MODEL"):
        raise GenerationError("CONFIGURATION")
    token = os.getenv("AI_GATEWAY_API_KEY")
    if not token:
        from vercel.oidc import get_vercel_oidc_token
        try:
            token = get_vercel_oidc_token()
        except Exception:
            raise GenerationError("CONFIGURATION") from None
    body = completion_request(facts, model)
    response = json_request("https://ai-gateway.vercel.sh/v1/chat/completions", {"Authorization": "Bearer " + token}, body, timeout=45)
    return completion_text(response)
