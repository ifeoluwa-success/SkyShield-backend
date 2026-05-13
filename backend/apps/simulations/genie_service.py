import httpx
import json
import logging
import hashlib
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

THREAT_TYPE_PROMPTS = {
    'gps_spoofing': 'GPS/GNSS signal spoofing attack targeting aircraft navigation systems',
    'ads_b_injection': 'ADS-B message injection creating ghost aircraft on radar',
    'radar_jamming': 'Primary surveillance radar jamming disrupting air traffic control',
    'acars_manipulation': 'ACARS datalink message tampering between aircraft and ground',
    'vhf_radio_hijack': 'VHF radio frequency hijacking and pilot communication disruption',
    'ils_interference': 'Instrument Landing System signal interference during approach',
}

OPERATOR_ROLE_FOCUS = {
    'air_traffic_controller': (
        'Focus on: radar displays, radio communications, pilot instructions, '
        'airspace separation, emergency frequencies. '
        'The controller sees: scope display anomalies, unusual aircraft behavior, '
        'garbled communications.'
    ),
    'operations_officer': (
        'Focus on: network systems, ground infrastructure, IT security alerts, '
        'NOTAM systems, coordination with ATC. '
        'The officer sees: system logs, network alerts, infrastructure status boards.'
    ),
    'lead_operator': (
        'Focus on: overall incident command, team coordination, escalation decisions, '
        'reporting to management, liaising with security teams.'
    ),
}

EXPECTED_OUTPUT_SCHEMA = """
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "title": "string — scenario title",
  "description": "string — 2-3 sentence overview",
  "threat_summary": "string — what the attack is doing",
  "steps": [
    {
      "step_id": "step_1",
      "phase": "detection|investigation|containment|recovery",
      "description": "string — what the operator sees/experiences",
      "points_value": 10,
      "time_limit_seconds": 60,
      "options": [
        {
          "id": "A",
          "text": "string — option description",
          "is_correct": true,
          "consequence": "string — what happens if chosen",
          "escalation_trigger": false
        }
      ],
      "correct_action": "A",
      "hint": "string — contextual hint for this step"
    }
  ],
  "escalation_rules": [
    {
      "trigger": "wrong_action|timeout",
      "phase": "detection",
      "consequence": "string",
      "severity_increase": 1
    }
  ],
  "learning_objectives": ["string", "string"],
  "estimated_time_minutes": 15
}
"""


class GenieScenarioGenerator:
    """
    Wraps the Google DeepMind / Gemini API to dynamically generate
    aviation cybersecurity training scenarios.

    Note: Genie 2 world model access is via the Gemini API endpoint.
    Uses gemini-1.5-pro with structured output for scenario generation.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    MODEL = "models/gemini-1.5-pro"
    CACHE_TTL = 3600  # 1 hour
    MAX_RETRIES = 3
    TIMEOUT = 30.0

    def __init__(self):
        self.api_key = settings.GENIE_API_KEY
        self.endpoint = (
            f"{self.BASE_URL}/{self.MODEL}:generateContent"
            f"?key={self.api_key}"
        )

    def _build_cache_key(self, method_name, **kwargs):
        raw = f"{method_name}:{json.dumps(kwargs, sort_keys=True)}"
        return f"genie:{hashlib.md5(raw.encode()).hexdigest()}"

    def _log_api_call(self, method, prompt_summary, success, error=None):
        """Log API call to AuditLog model."""
        try:
            from apps.core.models import AuditLog
            AuditLog.objects.create(
                action='genie_api_call',
                details={
                    'method': method,
                    'prompt_summary': prompt_summary[:200],
                    'success': success,
                    'error': str(error) if error else None,
                    'timestamp': timezone.now().isoformat()
                }
            )
        except Exception as e:
            logger.warning(f"Could not log to AuditLog: {e}")

    def _call_api(self, prompt):
        """
        Core API call with retry logic.
        Tries up to MAX_RETRIES times with exponential backoff.
        Returns parsed JSON response text.
        Raises RuntimeError if all retries fail.
        """
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json"
            }
        }

        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                with httpx.Client(timeout=self.TIMEOUT) as client:
                    response = client.post(
                        self.endpoint,
                        json=payload,
                        headers={"Content-Type": "application/json"}
                    )
                    response.raise_for_status()
                    data = response.json()
                    text = (data['candidates'][0]['content']['parts'][0]['text'])
                    return json.loads(text)
            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"Genie API timeout attempt {attempt+1}")
                if attempt < self.MAX_RETRIES - 1:
                    import time
                    time.sleep(2 ** attempt)
            except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
                last_error = e
                logger.error(f"Genie API error attempt {attempt+1}: {e}")
                if attempt < self.MAX_RETRIES - 1:
                    import time
                    time.sleep(2 ** attempt)

        raise RuntimeError(
            f"Genie API failed after {self.MAX_RETRIES} attempts: "
            f"{last_error}"
        )

    def _disabled_fallback(self):
        """
        Fallback used when GENIE_ENABLED is False: return a random existing scenario's steps.
        """
        from .models import Scenario

        scenario = Scenario.objects.filter(is_active=True).order_by('?').first()
        if not scenario:
            return {
                "title": "Fallback Scenario",
                "description": "Genie is disabled. No scenarios available for fallback.",
                "threat_summary": "",
                "steps": [],
                "escalation_rules": [],
                "learning_objectives": [],
                "estimated_time_minutes": 15,
            }

        steps = scenario.steps or []
        correct_actions = []
        for s in steps:
            if isinstance(s, dict) and 'correct_action' in s:
                correct_actions.append(s.get('correct_action'))

        return {
            "title": scenario.title,
            "description": scenario.description,
            "threat_summary": scenario.threat_type,
            "steps": steps,
            "escalation_rules": getattr(scenario, 'escalation_rules', []) or [],
            "learning_objectives": scenario.learning_objectives or [],
            "estimated_time_minutes": scenario.estimated_time or 15,
            "correct_actions": correct_actions,
            "graph": getattr(scenario, 'graph', {}) or {},
        }

    def generate_incident(self, threat_type, difficulty, airport_context):
        """
        Generate a complete branching scenario for a given threat type.
        Returns dict matching Scenario.steps format.
        Caches result for 1 hour.

        threat_type: key from THREAT_TYPE_PROMPTS or raw string
        difficulty: int 1-5
        airport_context: string describing airport (e.g. 'international hub')
        """
        if not getattr(settings, 'GENIE_ENABLED', False):
            result = self._disabled_fallback()
            self._log_api_call('generate_incident', 'GENIE_DISABLED_FALLBACK', True)
            return result

        cache_key = self._build_cache_key(
            'generate_incident',
            threat_type=threat_type,
            difficulty=difficulty,
            airport_context=airport_context
        )
        cached = cache.get(cache_key)
        if cached:
            return cached

        threat_description = THREAT_TYPE_PROMPTS.get(threat_type, threat_type)

        prompt = f"""
You are an expert aviation cybersecurity trainer creating a realistic
simulation scenario for airport personnel training.

SETTING: {airport_context}
THREAT: {threat_description}
DIFFICULTY LEVEL: {difficulty}/5
  (1=novice trainee, 3=experienced operator, 5=expert stress test)

SCENARIO REQUIREMENTS:
- Create {3 + difficulty} decision points (more for higher difficulty)
- Each decision point must have exactly 3-4 options
- Exactly one option is correct per decision point
- Wrong options should trigger realistic consequences
- At difficulty 4-5, add at least one escalation trigger
- Use realistic aviation terminology (METAR, ATIS, SELCAL, SIGMET, etc.)
- Make the scenario feel urgent and high-stakes

{EXPECTED_OUTPUT_SCHEMA}
"""
        try:
            result = self._call_api(prompt)
            self._log_api_call('generate_incident', f"{threat_type} d{difficulty}", True)
            cache.set(cache_key, result, self.CACHE_TTL)
            return result
        except RuntimeError as e:
            self._log_api_call('generate_incident', f"{threat_type} d{difficulty}", False, e)
            raise

    def generate_threat_variation(self, base_scenario_id, variation_seed=None):
        """
        Generate a variation of an existing scenario.
        Same threat type, different attack vector, timing, or affected system.
        Returns new steps JSON for creating a new Scenario record.
        """
        if not getattr(settings, 'GENIE_ENABLED', False):
            result = self._disabled_fallback()
            self._log_api_call('generate_variation', 'GENIE_DISABLED_FALLBACK', True)
            return result

        from .models import Scenario
        try:
            scenario = Scenario.objects.get(id=base_scenario_id)
        except Scenario.DoesNotExist:
            raise ValueError(f"Scenario {base_scenario_id} not found")

        cache_key = self._build_cache_key(
            'generate_variation',
            scenario_id=str(base_scenario_id),
            seed=variation_seed
        )
        cached = cache.get(cache_key)
        if cached:
            return cached

        prompt = f"""
You are an aviation cybersecurity trainer.

Here is an existing training scenario:
Title: {scenario.title}
Threat type: {scenario.threat_type}
Current steps summary: {json.dumps(scenario.steps)[:1000]}

Create a VARIATION of this scenario with:
- Same threat category ({scenario.threat_type})
- Different attack vector or affected airport system
- Different timing (time of day, traffic load, weather conditions)
- Different set of decision points
- Seed for reproducibility: {variation_seed or 'random'}

{EXPECTED_OUTPUT_SCHEMA}
"""
        try:
            result = self._call_api(prompt)
            self._log_api_call('generate_variation', str(base_scenario_id), True)
            cache.set(cache_key, result, self.CACHE_TTL)
            return result
        except RuntimeError as e:
            self._log_api_call('generate_variation', str(base_scenario_id), False, e)
            raise

    def generate_briefing_narrative(self, scenario, operator_role):
        """
        Generate role-specific mission briefing text.
        air_traffic_controller: radar/comms focus
        operations_officer: systems/network focus
        lead_operator: command/coordination focus
        Returns narrative string.
        """
        if not getattr(settings, 'GENIE_ENABLED', False):
            self._log_api_call('generate_briefing', 'GENIE_DISABLED_FALLBACK', True)
            return scenario.description

        role_focus = OPERATOR_ROLE_FOCUS.get(
            operator_role,
            OPERATOR_ROLE_FOCUS['lead_operator']
        )

        prompt = f"""
You are briefing an airport worker before a cybersecurity training exercise.

SCENARIO: {scenario.title}
THREAT: {scenario.threat_type}
OPERATOR ROLE: {operator_role}
ROLE FOCUS: {role_focus}

Write a realistic pre-mission briefing (150-200 words) that:
1. Sets the scene (time of day, airport conditions, traffic load)
2. Describes what the operator will see at their workstation
3. Explains their specific responsibilities during this incident
4. Ends with a clear "Mission start" call to action

Write in second person ("You are...").
Use professional aviation language.
Do NOT reveal what the correct actions are.
Return only the briefing text — no JSON, no headers.
"""
        try:
            with httpx.Client(timeout=self.TIMEOUT) as client:
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.8,
                        "maxOutputTokens": 512
                    }
                }
                response = client.post(
                    self.endpoint, json=payload,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                data = response.json()
                text = (data['candidates'][0]['content']['parts'][0]['text'].strip())
                self._log_api_call('generate_briefing', f"{scenario.id} {operator_role}", True)
                return text
        except Exception as e:
            self._log_api_call('generate_briefing', f"{getattr(scenario, 'id', None)} {operator_role}", False, e)
            logger.error(f"Briefing generation failed: {e}")
            return scenario.description

    def health_check(self):
        """
        Check if Genie/Gemini API is reachable.
        Returns True if healthy, False otherwise.
        """
        try:
            if not getattr(settings, 'GENIE_ENABLED', False):
                return False
            with httpx.Client(timeout=5.0) as client:
                payload = {
                    "contents": [{"parts": [{"text": "ping"}]}],
                    "generationConfig": {"maxOutputTokens": 5}
                }
                response = client.post(
                    self.endpoint, json=payload,
                    headers={"Content-Type": "application/json"}
                )
                ok = response.status_code == 200
                self._log_api_call('health_check', 'ping', ok, None if ok else response.text)
                return ok
        except Exception as e:
            self._log_api_call('health_check', 'ping', False, e)
            return False

