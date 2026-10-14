import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gharbazaar_processing.descriptions import GenerationError, completion_request, completion_text, process_job
from gharbazaar_processing.description_adapter import generate


def facts():
    return dict(intent="buy", property_type="APARTMENT", city="Kolkata", locality="New Town", bedrooms=2, bathrooms=2, carpet_area=1000, area_unit="sqft", furnishing="UNFURNISHED", floor=3, total_floors=8, construction_status="READY", price_rupees=6000000)


class Store:
    def __init__(self, job=None, status="SUCCEEDED", accepted=True):
        self.job, self.state, self.accepted, self.finished = job, status, accepted, []

    def claim(self, _):
        return self.job

    def status(self, _):
        return self.state

    def finish(self, *args):
        self.finished.append(args)
        return self.accepted


class Descriptions(unittest.TestCase):
    def test_prompt_limits_and_privacy(self):
        request = completion_request(facts(), "test/model")
        self.assertEqual(request["max_completion_tokens"], 800)
        self.assertEqual(json.loads(request["messages"][1]["content"]), facts())
        self.assertIn("ONLY", request["messages"][0]["content"])
        with self.assertRaises(GenerationError):
            completion_request({**facts(), "address": "private"}, "test/model")

    def test_invalid_facts_and_model(self):
        for change in ({"price_rupees": True}, {"price_rupees": 2.5}, {"carpet_area": float("nan")}, {"intent": "unknown"}, {"city": "a\x00b"}):
            with self.subTest(change=change), self.assertRaises(GenerationError):
                completion_request({**facts(), **change}, "test/model")
        with self.assertRaises(GenerationError):
            completion_request(facts(), "https://elsewhere/")

    def test_plain_response_and_invalid_outputs(self):
        def response(text, finish="stop"):
            return {"choices": [{"finish_reason": finish, "message": {"content": text}}]}
        self.assertEqual(completion_text(response("A home.\nTwo bedrooms.")), "A home. Two bedrooms.")
        for bad in ({}, response(""), response("a" * 2001), response("<script>"), response("a\x00b"), response("\ud800"), response("truncated", "length"), response(None), {"choices": [None]}):
            with self.subTest(bad=bad), self.assertRaises(GenerationError):
                completion_text(bad)

    def test_duplicate_completed_delivery_does_not_call_provider(self):
        called=[]
        process_job("job", Store(), lambda *_: called.append(True))
        self.assertEqual(called, [])

    def test_busy_lease_requests_redelivery_without_provider_call(self):
        called=[]
        with self.assertRaises(GenerationError):
            process_job("job", Store(status="RUNNING"), lambda *_: called.append(True))
        self.assertEqual(called, [])

    def test_success_fenced_by_lease(self):
        job={"facts": facts(), "model": "test/model", "lease_token": "lease", "attempts": 1}
        store=Store(job)
        process_job("job", store, lambda *_: "Reviewed suggestion.")
        self.assertEqual(store.finished, [("job", "lease", "Reviewed suggestion.", None, False)])
        with self.assertRaises(GenerationError):
            process_job("job", Store(job, accepted=False), lambda *_: "Stale suggestion.")

    def test_bounded_retry_and_permanent_failure(self):
        def transient(*_):
            raise GenerationError("PROVIDER_UNAVAILABLE", retry=True)
        def permanent(*_):
            raise GenerationError("INVALID_OUTPUT")
        for attempts in (1, 3):
            store=Store({"facts": facts(), "model": "test/model", "lease_token": "lease", "attempts": attempts})
            if attempts == 1:
                with self.assertRaises(GenerationError):
                    process_job("job", store, transient)
            else:
                process_job("job", store, transient)
            self.assertEqual(store.finished[0][3:], ("PROVIDER_UNAVAILABLE", True))
        store=Store({"facts": facts(), "model": "test/model", "lease_token": "lease", "attempts": 1})
        process_job("job", store, permanent)
        self.assertEqual(store.finished[0][3:], ("INVALID_OUTPUT", False))

    def test_disabled_generation_never_calls_provider(self):
        with patch.dict("os.environ", {"AI_DESCRIPTION_ENABLED": "false"}), patch("gharbazaar_processing.description_adapter.json_request") as request:
            with self.assertRaises(GenerationError):
                generate(facts(), "test/model")
            request.assert_not_called()

    def test_rest_gateway_integration_with_fake_provider(self):
        response={"choices": [{"finish_reason": "stop", "message": {"content": "A two-bedroom apartment."}}]}
        with patch.dict("os.environ", {"AI_DESCRIPTION_ENABLED": "true", "AI_GATEWAY_MODEL": "test/model", "AI_GATEWAY_API_KEY": "test-secret"}), patch("gharbazaar_processing.description_adapter.json_request", return_value=response) as request:
            self.assertEqual(generate(facts(), "test/model"), "A two-bedroom apartment.")
            self.assertEqual(request.call_args.args[0], "https://ai-gateway.vercel.sh/v1/chat/completions")
            self.assertEqual(request.call_args.kwargs["timeout"], 45)


if __name__ == "__main__":
    unittest.main()
