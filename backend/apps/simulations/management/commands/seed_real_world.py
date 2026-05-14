"""
DEV / QA: wipe the training catalog (courses + incident runs + scenarios) and
replace with realistic aviation-cyber scenarios and structured courses.

Usage:
  python manage.py seed_real_world
  python manage.py seed_real_world --no-wipe       # only insert (may duplicate if titles exist)
  python manage.py seed_real_world --no-enroll     # skip demo trainee enrollment
  python manage.py seed_real_world --password X    # password when creating demo users

WARNING: default run deletes ALL Course and Scenario rows (and all IncidentRun
records). SimulationSession / UserDecision rows tied to those scenarios are
removed via CASCADE. Users are not deleted.

Requires demo users (created if missing):
  demo.trainee@skyshield.demo
  demo.supervisor@skyshield.demo
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.simulations.course_service import CourseService
from apps.simulations.models import (
    Course,
    CourseModule,
    IncidentRun,
    Scenario,
)

User = get_user_model()

DEMO_DOMAIN = 'skyshield.demo'


def _step_bundle(step_specs):
    """
    Build `steps`, `graph.nodes`, `hints` list, and flat `correct_actions`
    for the mission engine (graph-based evaluation).
    """
    steps = []
    nodes = []
    hints = []
    correct_actions = []
    for spec in step_specs:
        sid = spec["id"]
        steps.append(
            {
                "id": sid,
                "step_id": sid,
                "title": spec["title"],
                "description": spec["narrative"],
                "points_value": spec.get("points", 12),
                "options": [
                    {"id": o["id"], "label": o["label"]} for o in spec["choices"]
                ],
            }
        )
        nodes.append(
            {
                "id": sid,
                "step_id": sid,
                "correct_action": spec["correct_id"],
                "consequences": spec.get("consequences", []),
                "next_state": {},
            }
        )
        hints.append(spec.get("hint", "Use company checklists and escalate early."))
        correct_actions.append(spec["correct_id"])
    graph = {"nodes": nodes}
    return steps, graph, hints, correct_actions


def _scenario_specs():
    """Catalog of realistic scenarios (title must be unique for --no-wipe idempotency)."""
    return [
        {
            "title": "KEWR traffic area — GNSS position split (Lost Lake 453)",
            "description": (
                "You are PM on a Part 121 arrival into the New York metro. FMS, "
                "raw GPS, and ATC radar cues disagree during vectoring. Work the "
                "threat as a coordinated crew: verify sources, communicate, and "
                "avoid following a synthetic position."
            ),
            "category": "navigation",
            "threat_type": "gps_spoofing",
            "difficulty": "intermediate",
            "estimated_time": 22,
            "points_possible": 120,
            "passing_score": 72,
            "tags": ["GNSS", "KEWR", "Part121", "crew_coordination"],
            "is_featured": True,
            "learning_objectives": [
                "Cross-check FMS position against independent cues",
                "Use ATC phraseology for suspected nav integrity issues",
                "Apply QRH / company abnormal for unreliable GNSS",
            ],
            "initial_state": {
                "flight": "SKY453",
                "phase": "descent",
                "altitude_ft": 11000,
                "assigned_heading": 270,
                "fms_position_note": "FMS shows 1.2 NM north of ATC radar track",
                "environment": "IMC, moderate turbulence",
            },
            "step_specs": [
                {
                    "id": "gnss-01",
                    "title": "First indication",
                    "narrative": (
                        "MAP display agrees with ATC, but the FMS legs look shifted "
                        "and GPS PRIMARY annunciates intermittently. What is your first move?"
                    ),
                    "choices": [
                        {
                            "id": "ignore",
                            "label": "Silence the alert and continue LNAV — likely database glitch",
                        },
                        {
                            "id": "cross_check",
                            "label": "Cross-check raw GPS, VOR/DME if available, and ask ATC for "
                            "ground-based confirmation",
                        },
                        {
                            "id": "descend_early",
                            "label": "Descend 2000 ft without telling ATC to regain signal",
                        },
                    ],
                    "correct_id": "cross_check",
                    "points": 15,
                    "hint": "Treat disagreeing nav sources as a potential spoof or fault until ruled out.",
                },
                {
                    "id": "gnss-02",
                    "title": "ATC coordination",
                    "narrative": (
                        "ATC asks you to confirm distance from LENDY. Your FMS shows inside 8 NM "
                        "but the controller insists you are wide. What do you report?"
                    ),
                    "choices": [
                        {
                            "id": "insist_fms",
                            "label": "Insist the FMS is authoritative and request direct-to",
                        },
                        {
                            "id": "report_anomaly",
                            "label": "Report possible navigation integrity issue and request "
                            "vectors / raw data comparison",
                        },
                        {
                            "id": "squawk_7700",
                            "label": "Squawk 7700 immediately without explanation",
                        },
                    ],
                    "correct_id": "report_anomaly",
                    "points": 18,
                    "hint": "Plain-language nav uncertainty + willingness to accept vectors is ICAO-aligned.",
                },
                {
                    "id": "gnss-03",
                    "title": "Company notification",
                    "narrative": (
                        "You are cleared for the visual with traffic inside 5 NM. "
                        "Company ops wants a cyber-related report. What is the priority?"
                    ),
                    "choices": [
                        {
                            "id": "finish_landing",
                            "label": "Complete the approach safely, then file a structured report on the ground",
                        },
                        {
                            "id": "text_ops",
                            "label": "Send a long text to dispatch while hand-flying",
                        },
                        {
                            "id": "divert_now",
                            "label": "Declare emergency and divert to the farthest alternate",
                        },
                    ],
                    "correct_id": "finish_landing",
                    "points": 14,
                    "hint": "Aviate first; capture details after the aircraft is stable.",
                },
                {
                    "id": "gnss-04",
                    "title": "Post-event evidence",
                    "narrative": (
                        "After parking, security asks to image your EFB. What preserves evidence best?"
                    ),
                    "choices": [
                        {
                            "id": "factory_reset",
                            "label": "Factory-reset the EFB before handing it over",
                        },
                        {
                            "id": "chain_of_custody",
                            "label": "Power down per procedure and release devices only through "
                            "approved chain-of-custody",
                        },
                        {
                            "id": "delete_logs",
                            "label": "Delete crew chat logs to protect privacy",
                        },
                    ],
                    "correct_id": "chain_of_custody",
                    "points": 16,
                    "hint": "Forensics needs untouched volatile data where policy allows.",
                },
            ],
            "escalation_rules": [
                {
                    "trigger": "wrong_action",
                    "phase": "detection",
                    "consequence": "ATC issues go-around; company opens safety review",
                    "severity_increase": 1,
                },
                {
                    "trigger": "timeout",
                    "phase": "detection",
                    "consequence": "Loss of separation risk flagged",
                    "severity_increase": 2,
                },
            ],
        },
        {
            "title": "Guard frequency flood — COM interference during sector handoff",
            "description": (
                "High-power noise and malicious voice overlays appear on company discrete "
                "and 121.5 during a busy handoff. Decide how to authenticate ATC, protect "
                "passengers from bogus commands, and restore disciplined comms."
            ),
            "category": "communication",
            "threat_type": "jamming",
            "difficulty": "intermediate",
            "estimated_time": 16,
            "points_possible": 100,
            "passing_score": 70,
            "tags": ["VHF", "121.5", "jamming", "ATC_auth"],
            "is_featured": True,
            "learning_objectives": [
                "Authenticate ATC instructions when comm quality degrades",
                "Use alternate company frequencies and SATVOICE per SOP",
                "Coordinate with cabin crew on suspicious PA-like interference",
            ],
            "initial_state": {
                "flight": "SKY882",
                "sector": "ZNY_34",
                "active_freqs": ["132.55 company", "121.5 guard"],
                "symptom": "Overlapping transmissions with impossible wind readouts",
            },
            "step_specs": [
                {
                    "id": "com-01",
                    "title": "Suspect transmission",
                    "narrative": (
                        "You receive an urgent clearance to turn 40 degrees left immediately "
                        "— voice sounds like your usual controller but the readback from another "
                        "aircraft never comes. Next step?"
                    ),
                    "choices": [
                        {
                            "id": "comply_now",
                            "label": "Comply immediately — any delay risks collision",
                        },
                        {
                            "id": "verify",
                            "label": "Ask ATC to confirm on previous frequency / secondary "
                            "and state unable until verified",
                        },
                        {
                            "id": "guard_only",
                            "label": "Switch exclusively to 121.5 and disregard company discrete",
                        },
                    ],
                    "correct_id": "verify",
                    "points": 20,
                    "hint": "If authenticity is in doubt, verify on a known-good path before maneuvering.",
                },
                {
                    "id": "com-02",
                    "title": "Cabin coordination",
                    "narrative": (
                        "Cabin reports a PA-like voice ordering seatbelt sign off during "
                        "final approach prep. What do you do?"
                    ),
                    "choices": [
                        {
                            "id": "ignore_cabin",
                            "label": "Ignore — focus only on ATC",
                        },
                        {
                            "id": "cabin_alert",
                            "label": "Use interphone to confirm flight deck-only PA and brief "
                            "cabin to disregard unauthorized instructions",
                        },
                        {
                            "id": "open_door",
                            "label": "Send FO to cabin to listen for spoofed audio",
                        },
                    ],
                    "correct_id": "cabin_alert",
                    "points": 18,
                    "hint": "Social engineering often targets passengers and crew simultaneously.",
                },
                {
                    "id": "com-03",
                    "title": "Ground reporting",
                    "narrative": (
                        "You landed safely. Who should receive the first structured comm report?"
                    ),
                    "choices": [
                        {
                            "id": "post_social",
                            "label": "Post a summary on the crew forum for awareness",
                        },
                        {
                            "id": "soc_route",
                            "label": "Route report through company security / SOC per cyber-comm SOP",
                        },
                        {
                            "id": "faa_only",
                            "label": "Call the local FSDO hotline before notifying company",
                        },
                    ],
                    "correct_id": "soc_route",
                    "points": 15,
                    "hint": "Follow the chain that preserves legal privilege and incident coordination.",
                },
            ],
            "escalation_rules": [
                {
                    "trigger": "wrong_action",
                    "phase": "detection",
                    "consequence": "Unverified turn triggers RA event",
                    "severity_increase": 2,
                },
            ],
        },
        {
            "title": "FAKEX Maintenance — credential phishing to flight operations",
            "description": (
                "Ops inbox receives a time-pressured email claiming a mandatory EFB update "
                "with a look-alike domain. Walk through verification, user reporting, and "
                "containment without disrupting legitimate dispatch."
            ),
            "category": "social_engineering",
            "threat_type": "phishing",
            "difficulty": "beginner",
            "estimated_time": 12,
            "points_possible": 80,
            "passing_score": 68,
            "tags": ["phishing", "email", "EFB", "trainee"],
            "is_featured": False,
            "learning_objectives": [
                "Verify sender identity and URL out-of-band",
                "Use SOC phish reporting hooks without clicking payloads",
                "Containment without tipping the attacker",
            ],
            "initial_state": {
                "vector": "Email to crew scheduling alias",
                "sender_display": "efb-updates@skyshield-air.fake",
                "deadline": "45 minutes",
            },
            "step_specs": [
                {
                    "id": "phish-01",
                    "title": "Initial triage",
                    "narrative": "The link resembles your SSO portal but the TLS cert issuer looks wrong. Action?",
                    "choices": [
                        {"id": "click_update", "label": "Click the link on LTE — faster than office Wi-Fi"},
                        {"id": "report_soc", "label": "Report to SOC / IT via official channel; do not click"},
                        {"id": "forward_all", "label": "Forward to the entire crew base WhatsApp group"},
                    ],
                    "correct_id": "report_soc",
                    "points": 12,
                    "hint": "Assume hostile until verified with IT using a known-good number.",
                },
                {
                    "id": "phish-02",
                    "title": "Containment",
                    "narrative": (
                        "Two crew already clicked but did not enter passwords. Next priority?"
                    ),
                    "choices": [
                        {"id": "shame", "label": "Publicly name them in the shift brief"},
                        {"id": "isolate", "label": "Ask IT to isolate devices and rotate session tokens per playbook"},
                        {"id": "ignore_safe", "label": "Do nothing — no credentials entered means no risk"},
                    ],
                    "correct_id": "isolate",
                    "points": 14,
                    "hint": "Drive-by payloads can still drop malware without password entry.",
                },
                {
                    "id": "phish-03",
                    "title": "Comms to flying crew",
                    "narrative": "A flight is boarding. How do you warn crews without causing panic?",
                    "choices": [
                        {
                            "id": "all_caps_email",
                            "label": "Send ALL CAPS email to everyone with the malicious URL pasted",
                        },
                        {
                            "id": "approved_notice",
                            "label": "Use approved NOTAM-style bulletin without malicious artifacts",
                        },
                        {
                            "id": "stay_silent",
                            "label": "Stay silent until forensic images complete",
                        },
                    ],
                    "correct_id": "approved_notice",
                    "points": 12,
                    "hint": "Share indicators safely — never rebroadcast weaponized content.",
                },
            ],
            "escalation_rules": [],
        },
        {
            "title": "Encryptor-7 — ransomware on dispatch workstation cluster",
            "description": (
                "Dispatch thin clients show ransom notes mapped to shared NAS used for "
                "weight-and-balance PDFs. Practice isolation, backup validation, and "
                "continuity of dispatch under regulatory time pressure."
            ),
            "category": "ransomware",
            "threat_type": "ransomware",
            "difficulty": "intermediate",
            "estimated_time": 20,
            "points_possible": 110,
            "passing_score": 74,
            "tags": ["ransomware", "dispatch", "BCP"],
            "is_featured": True,
            "learning_objectives": [
                "Segment infected VLANs without killing safety-critical SCADA",
                "Validate offline backups before any payment discussion",
                "Maintain regulated recordkeeping during failover",
            ],
            "initial_state": {
                "affected": "Dispatch cluster B + NAS /shared/wb",
                "backup_status": "Last immutable snapshot 11 minutes ago",
                "reg_clock": "WB package due for SKY119 in 38 minutes",
            },
            "step_specs": [
                {
                    "id": "rw-01",
                    "title": "First response",
                    "narrative": "Encrypted files are spreading. What is the first technical move?",
                    "choices": [
                        {"id": "pay_fast", "label": "Prepare Bitcoin wallet immediately"},
                        {"id": "segment", "label": "Isolate affected VLANs and preserve firewall logs"},
                        {"id": "reboot_all", "label": "Mass reboot every workstation company-wide"},
                    ],
                    "correct_id": "segment",
                    "points": 16,
                    "hint": "Stop lateral movement before recovery chatter.",
                },
                {
                    "id": "rw-02",
                    "title": "Forensics vs recovery",
                    "narrative": "Legal asks to image disks; ops needs WB package in 30 minutes.",
                    "choices": [
                        {"id": "skip_image", "label": "Skip imaging — recovery is more important"},
                        {
                            "id": "parallel",
                            "label": "Parallelize: SOC images representative hosts while ops fails "
                            "over to DR package build path",
                        },
                        {"id": "wait_fbi", "label": "Wait for external agency before any restore"},
                    ],
                    "correct_id": "parallel",
                    "points": 18,
                    "hint": "Balance evidence preservation with operational continuity.",
                },
                {
                    "id": "rw-03",
                    "title": "Restore validation",
                    "narrative": "Immutable backup snapshot is clean. What before reconnecting shares?",
                    "choices": [
                        {"id": "restore_prod", "label": "Restore directly into production share immediately"},
                        {
                            "id": "staged",
                            "label": "Restore to staged environment; AV + integrity scan before cutover",
                        },
                        {"id": "trust_crypto", "label": "Trust ransomware note that decryptor will be sent"},
                    ],
                    "correct_id": "staged",
                    "points": 17,
                    "hint": "Assume backups could be the next target if exposed early.",
                },
                {
                    "id": "rw-04",
                    "title": "Regulatory notification",
                    "narrative": "Customer PII lived on the NAS. What is appropriate?",
                    "choices": [
                        {"id": "hide", "label": "No breach — ransomware only affects availability"},
                        {"id": "assess_notify", "label": "Trigger privacy impact assessment and notify per counsel + law"},
                        {"id": "tweet", "label": "Tweet status before internal alignment"},
                    ],
                    "correct_id": "assess_notify",
                    "points": 14,
                    "hint": "Availability attacks can still involve confidentiality issues.",
                },
            ],
            "escalation_rules": [
                {
                    "trigger": "wrong_action",
                    "phase": "containment",
                    "consequence": "Lateral movement to flight planning VLAN",
                    "severity_increase": 3,
                },
            ],
        },
        {
            "title": "Ghost cluster — correlated ADS-B anomalies near Class B",
            "description": (
                "ASDEX and fusion tracks show a formation of aircraft IDs that never "
                "correlate with primary radar or pilot readbacks. Decide how to validate "
                "sensor feeds, coordinate with cyber watch, and keep the sector safe."
            ),
            "category": "data_integrity",
            "threat_type": "data_corruption",
            "difficulty": "advanced",
            "estimated_time": 18,
            "points_possible": 115,
            "passing_score": 76,
            "tags": ["ADS-B", "ASD-E", "sensor_fusion"],
            "is_featured": False,
            "learning_objectives": [
                "Differentiate sensor faults from data injection",
                "Coordinate with NMCC / SOC for correlated ground anomalies",
                "Apply traffic management mitigations without over-reacting",
            ],
            "initial_state": {
                "facility": "TRACON fusion node 12",
                "symptom": "Six Mode S IDs coast-in with identical groundspeed deltas",
                "primary_radar": "No skin paint correlation",
            },
            "step_specs": [
                {
                    "id": "adsb-01",
                    "title": "Triage",
                    "narrative": "Which source do you trust first to keep separation?",
                    "choices": [
                        {"id": "adsb_only", "label": "Trust ADS-B because it is newer technology"},
                        {"id": "primary_verify", "label": "Weight primary / secondary radar and pilot reports over "
                            "uncorroborated ADS-B tracks"},
                        {"id": "stop_sector", "label": "Close the sector immediately with no handoff"},
                    ],
                    "correct_id": "primary_verify",
                    "points": 22,
                    "hint": "Treat uncorroborated datalink as advisory until verified.",
                },
                {
                    "id": "adsb-02",
                    "title": "Cyber coordination",
                    "narrative": "IT sees syslog spikes on the FDP feed server. Next?",
                    "choices": [
                        {"id": "ignore_it", "label": "Tell IT to wait until the rush ends"},
                        {
                            "id": "joint_bridge",
                            "label": "Open joint ATC–SOC bridge and snapshot configs per IR plan",
                        },
                        {"id": "reboot_fdp", "label": "Reboot FDP servers during peak traffic"},
                    ],
                    "correct_id": "joint_bridge",
                    "points": 20,
                    "hint": "Correlated IT + ATC anomalies often indicate injection vs random fault.",
                },
                {
                    "id": "adsb-03",
                    "title": "Traffic management",
                    "narrative": "Controllers need a rule until root cause is known.",
                    "choices": [
                        {
                            "id": "mitigation",
                            "label": "Issue TM mitigation: increase separation buffers for ADS-B-only targets",
                        },
                        {"id": "business_usual", "label": "Resume normal minima — saves delay costs"},
                        {"id": "vector_all", "label": "Vector every aircraft in the sector to holding indefinitely"},
                    ],
                    "correct_id": "mitigation",
                    "points": 18,
                    "hint": "Proportional mitigations beat paralysis or denial.",
                },
            ],
            "escalation_rules": [],
        },
        {
            "title": "ACARS uplink spoof — MITM against turnaround package",
            "description": (
                "Maintenance receives an ACARS uplink that alters turnaround fuel figures "
                "minutes before push. Validate message authenticity, coordinate with "
                "maintenance control, and decide on dispatch release."
            ),
            "category": "communication",
            "threat_type": "man_in_middle",
            "difficulty": "expert",
            "estimated_time": 17,
            "points_possible": 125,
            "passing_score": 78,
            "tags": ["ACARS", "MITM", "dispatch"],
            "is_featured": False,
            "learning_objectives": [
                "Authenticate datalink messages with secondary channels",
                "Invoke MEL / dispatch coordination when data integrity is suspect",
                "Preserve message logs for airline CERT",
            ],
            "initial_state": {
                "tail": "N453SK",
                "gate": "C24",
                "message": "Uplink revises zero-fuel weight downward 2400 lb",
                "checksum_note": "MU label format differs from last 200 legs",
            },
            "step_specs": [
                {
                    "id": "acars-01",
                    "title": "Verification",
                    "narrative": "Maintenance control can be reached on sat phone and VHF. First action?",
                    "choices": [
                        {"id": "accept_uplink", "label": "Accept uplink — faster turnaround"},
                        {
                            "id": "voice_verify",
                            "label": "Voice-verify with maintenance control and compare loadsheet hash",
                        },
                        {"id": "guess_fuel", "label": "Estimate fuel manually and sign release yourself"},
                    ],
                    "correct_id": "voice_verify",
                    "points": 24,
                    "hint": "Never single-source safety-critical weights from datalink alone.",
                },
                {
                    "id": "acars-02",
                    "title": "Data handling",
                    "narrative": "IT confirms suspicious VPN sessions from vendor subnet. Next?",
                    "choices": [
                        {"id": "quarantine_logs", "label": "Preserve ACARS gateway logs and quarantine signing keys"},
                        {"id": "delete_logs", "label": "Delete logs to reduce storage costs"},
                        {"id": "public_disclosure", "label": "Email full PCAP to all stations"},
                    ],
                    "correct_id": "quarantine_logs",
                    "points": 22,
                    "hint": "Protect signing material and evidence simultaneously.",
                },
                {
                    "id": "acars-03",
                    "title": "Release decision",
                    "narrative": "Verified weights differ from spoofed uplink. Who has authority to delay?",
                    "choices": [
                        {"id": "captain_delay", "label": "Captain delays until consistent paperwork exists"},
                        {"id": "ignore_discrepancy", "label": "Dispatch overrides on phone verbally"},
                        {"id": "push_quiet", "label": "Push on time and fix paperwork in the air"},
                    ],
                    "correct_id": "captain_delay",
                    "points": 20,
                    "hint": "When integrity fails, conservative grounding beats schedule pressure.",
                },
            ],
            "escalation_rules": [],
        },
    ]


def _course_blueprints(scenarios_by_title):
    """Return course definitions referencing scenario titles."""
    s = scenarios_by_title
    return [
        {
            "title": "Flight Operations Cyber Defense — certification track",
            "description": (
                "ICAO-aligned progression from GNSS integrity through comm jamming, "
                "with policy readings and graded mission simulations."
            ),
            "threat_focus": "Navigation & communication integrity",
            "difficulty": 2,
            "estimated_hours": 6.5,
            "passing_threshold": 72.0,
            "modules": [
                (
                    "reading",
                    "GNSS threats in metro airspace",
                    "Regulatory context for GNSS interference and spoofing.",
                    "# GNSS in the terminal\n\nStudy AC guidance on cross-checking "
                    "FMS position, ATC coordination, and post-event evidence handling.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: KEWR GNSS position split",
                    "Apply crew CRM and nav authentication under time pressure.",
                    "",
                    s["KEWR traffic area — GNSS position split (Lost Lake 453)"],
                ),
                (
                    "reading",
                    "VHF spectrum discipline",
                    "Guard misuse, jamming indicators, and verifying ATC authenticity.",
                    "# Communications\n\nReview company comm SOP for suspected malicious "
                    "transmissions and passenger-facing spoof attempts.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: COM interference handoff",
                    "Authenticate ATC and coordinate cabin response.",
                    "",
                    s["Guard frequency flood — COM interference during sector handoff"],
                ),
                (
                    "reading",
                    "Evidence and reporting",
                    "Chain of custody and SOC routing after cyber-physical incidents.",
                    "# After landing\n\nUnderstand what to preserve and who to notify first.\n",
                    None,
                ),
            ],
        },
        {
            "title": "SOC & enterprise resilience — phishing to ransomware",
            "description": (
                "Ground-focused track for security champions: phishing triage through "
                "ransomware containment with realistic policy tradeoffs."
            ),
            "threat_focus": "Enterprise cyber (email + ransomware)",
            "difficulty": 2,
            "estimated_hours": 4.0,
            "passing_threshold": 70.0,
            "modules": [
                (
                    "reading",
                    "Human factors in phishing response",
                    "Why rushed operational deadlines increase click risk.",
                    "# Phishing\n\nStudy reporting paths and safe communication to flying crew.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: FAKEX Maintenance phishing",
                    "Contain a credential phishing wave targeting ops.",
                    "",
                    s["FAKEX Maintenance — credential phishing to flight operations"],
                ),
                (
                    "reading",
                    "Ransomware playbooks",
                    "Segmentation, backups, and regulatory overlays.",
                    "# Ransomware\n\nImmutable backups, staged restore, and legal notification triggers.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: Encryptor-7 dispatch cluster",
                    "Practice isolation, restore validation, and notification.",
                    "",
                    s["Encryptor-7 — ransomware on dispatch workstation cluster"],
                ),
            ],
        },
        {
            "title": "Advanced ATM datalink integrity",
            "description": (
                "For experienced controllers and cyber liaisons: ADS-B injection patterns "
                "and ACARS integrity failures with joint SOC bridges."
            ),
            "threat_focus": "ATM sensor fusion & datalink",
            "difficulty": 4,
            "estimated_hours": 3.5,
            "passing_threshold": 75.0,
            "modules": [
                (
                    "reading",
                    "Fusion architecture primer",
                    "How ASD-E weights ADS-B vs radar vs pilot reports.",
                    "# Fusion\n\nKey failure modes and why injection differs from drop-outs.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: Ghost ADS-B cluster",
                    "Mitigate uncorroborated tracks with SOC coordination.",
                    "",
                    s["Ghost cluster — correlated ADS-B anomalies near Class B"],
                ),
                (
                    "reading",
                    "ACARS security model",
                    "Authenticators, MU labels, and turnaround workflows.",
                    "# ACARS\n\nUnderstand why voice verify still matters.\n",
                    None,
                ),
                (
                    "simulation",
                    "Mission: ACARS uplink spoof",
                    "Authenticate datalink and protect dispatch release.",
                    "",
                    s["ACARS uplink spoof — MITM against turnaround package"],
                ),
            ],
        },
    ]


class Command(BaseCommand):
    help = (
        "Delete all courses and scenarios (and incident runs), then seed realistic "
        "aviation cyber scenarios and structured courses."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-wipe",
            action="store_true",
            help="Do not delete existing data (creates new rows; re-run may fail on unique fields)",
        )
        parser.add_argument(
            "--no-enroll",
            action="store_true",
            help="Skip enrolling demo.trainee in all seeded courses",
        )
        parser.add_argument(
            "--password",
            default="DemoSeed123!",
            help="Password for demo users when they are created",
        )

    def handle(self, *args, **options):
        password = options["password"]
        with transaction.atomic():
            if not options["no_wipe"]:
                ir_count = IncidentRun.objects.count()
                c_count = Course.objects.count()
                s_count = Scenario.objects.count()
                IncidentRun.objects.all().delete()
                Course.objects.all().delete()
                Scenario.objects.all().delete()
                self.stdout.write(
                    self.style.WARNING(
                        f"Wiped: {ir_count} incident run(s), {c_count} course(s), "
                        f"{s_count} scenario(s) (cascaded sessions, events, etc.)."
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        "--no-wipe: keeping existing rows (still creating new catalog rows)."
                    )
                )

            supervisor = self._get_or_create_user(
                f"demo.supervisor@{DEMO_DOMAIN}",
                "demo_supervisor",
                "supervisor",
                password,
            )
            trainee = self._get_or_create_user(
                f"demo.trainee@{DEMO_DOMAIN}",
                "demo_trainee",
                "trainee",
                password,
            )

            scenarios_by_title = {}
            created_courses = []
            for spec in _scenario_specs():
                steps, graph, hints, correct_actions = _step_bundle(spec["step_specs"])
                scenario = Scenario.objects.create(
                    title=spec["title"],
                    description=spec["description"],
                    category=spec["category"],
                    threat_type=spec["threat_type"],
                    difficulty=spec["difficulty"],
                    initial_state=spec["initial_state"],
                    steps=steps,
                    correct_actions=correct_actions,
                    hints=hints,
                    learning_objectives=spec["learning_objectives"],
                    graph=graph,
                    escalation_rules=spec.get("escalation_rules", []),
                    estimated_time=spec["estimated_time"],
                    points_possible=spec["points_possible"],
                    passing_score=spec["passing_score"],
                    max_attempts=5,
                    tags=spec.get("tags", []),
                    is_active=True,
                    is_featured=spec.get("is_featured", False),
                    created_by=supervisor,
                )
                scenarios_by_title[scenario.title] = scenario
                self.stdout.write(self.style.SUCCESS(f"Scenario: {scenario.title}"))

            for bp in _course_blueprints(scenarios_by_title):
                course = Course.objects.create(
                    title=bp["title"],
                    description=bp["description"],
                    threat_focus=bp["threat_focus"],
                    difficulty=bp["difficulty"],
                    created_by=supervisor,
                    is_published=True,
                    estimated_hours=bp["estimated_hours"],
                    passing_threshold=bp["passing_threshold"],
                )
                for pos, (mtype, title, desc, body, scen) in enumerate(bp["modules"]):
                    CourseModule.objects.create(
                        course=course,
                        position=pos,
                        title=title,
                        description=desc,
                        module_type=mtype,
                        content_body=body if mtype == "reading" else "",
                        scenario=scen if mtype == "simulation" else None,
                        minimum_passing_score=bp["passing_threshold"],
                        max_simulation_attempts=5,
                    )
                self.stdout.write(self.style.SUCCESS(f"Course: {course.title} ({course.modules.count()} modules)"))
                created_courses.append(course)

            if not options["no_enroll"]:
                svc = CourseService()
                for course in created_courses:
                    try:
                        svc.enroll(course.id, trainee)
                        self.stdout.write(
                            self.style.NOTICE(f"Enrolled {trainee.email} -> {course.title}")
                        )
                    except ValueError as e:
                        self.stdout.write(self.style.WARNING(f"Skip enroll {course.title}: {e}"))

        self.stdout.write(self.style.SUCCESS("\nseed_real_world complete."))
        self.stdout.write(f"Scenarios: {Scenario.objects.count()} | Courses: {Course.objects.count()}")
        self.stdout.write(
            "Incident missions: POST /api/simulations/incidents/ with a scenario_id from GET scenarios list.\n"
            "Courses: use returned course UUIDs for /api/simulations/courses/.../my-progress/\n"
        )

    def _get_or_create_user(self, email, username, role, password):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "role": role,
                "first_name": "Demo",
                "last_name": role.replace("_", " ").title(),
                "status": "active",
                "email_verified": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.NOTICE(f"Created user {email}"))
        else:
            user.role = role
            user.status = "active"
            user.save()
        return user
