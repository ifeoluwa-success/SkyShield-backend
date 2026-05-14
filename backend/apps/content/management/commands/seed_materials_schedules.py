"""
Seed realistic learning library content (categories, materials, path, glossary, FAQ)
plus meeting schedules and tutor teaching sessions.

Usage:
  python manage.py seed_materials_schedules
  python manage.py seed_materials_schedules --purge   # remove prior [SEED] rows then reseed
  python manage.py seed_materials_schedules --password DemoSeed123!

Creates/uses demo users (same convention as seed_demo):
  demo.supervisor@skyshield.demo  — host, tutor profile, material author
  demo.trainee@skyshield.demo     — invited to sample meetings
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.content.models import (
    ContentCategory,
    FAQ,
    GlossaryTerm,
    LearningMaterial,
    LearningPath,
    PathEnrollment,
)
from apps.meetings.models import Meeting, MeetingParticipant
from apps.tutor.models import TeachingMaterial, TeachingSession, TutorProfile

User = get_user_model()
logger = logging.getLogger(__name__)

SEED_PREFIX = "[SEED]"
DEMO_DOMAIN = "skyshield.demo"


def _slug(base, idx):
    root = slugify(base)[:200] or "material"
    cand = f"{root}-{idx}"
    step = idx
    while LearningMaterial.objects.filter(slug=cand).exists():
        step += 1
        cand = f"{root}-{step}"
    return cand


class Command(BaseCommand):
    help = "Seed [SEED] learning materials, glossary, FAQ, learning path, meetings, and tutor schedules."

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge",
            action="store_true",
            help=f'Delete existing rows tagged with title/question/term starting "{SEED_PREFIX}"',
        )
        parser.add_argument(
            "--password",
            default="DemoSeed123!",
            help="Password when creating missing demo users",
        )

    def handle(self, *args, **options):
        password = options["password"]
        with transaction.atomic():
            if options["purge"]:
                self._purge()
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

            cats = self._seed_categories()
            materials = self._seed_materials(supervisor, cats)
            self._seed_glossary_faq(cats)
            self._seed_learning_path(supervisor, cats, materials)
            tutor = self._ensure_tutor_profile(supervisor)
            t_mats = self._seed_teaching_materials(tutor)
            self._seed_teaching_sessions(tutor, t_mats)
            self._seed_meetings(supervisor, trainee, tutor)

        self.stdout.write(self.style.SUCCESS("seed_materials_schedules finished."))

    def _purge(self):
        PathEnrollment.objects.filter(path__title__startswith=SEED_PREFIX).delete()
        LearningPath.objects.filter(title__startswith=SEED_PREFIX).delete()
        LearningMaterial.objects.filter(title__startswith=SEED_PREFIX).delete()
        FAQ.objects.filter(question__startswith=SEED_PREFIX).delete()
        GlossaryTerm.objects.filter(term__startswith=SEED_PREFIX).delete()
        ContentCategory.objects.filter(name__startswith=SEED_PREFIX).delete()

        for ts in TeachingSession.objects.filter(title__startswith=SEED_PREFIX).select_related(
            "internal_meeting"
        ):
            if ts.internal_meeting_id:
                m = ts.internal_meeting
                ts.internal_meeting = None
                ts.save(update_fields=["internal_meeting"])
                MeetingParticipant.objects.filter(meeting=m).delete()
                m.delete()
            ts.delete()
        TeachingMaterial.objects.filter(title__startswith=SEED_PREFIX).delete()

        for m in Meeting.objects.filter(title__startswith=SEED_PREFIX):
            MeetingParticipant.objects.filter(meeting=m).delete()
            m.delete()

        self.stdout.write(self.style.WARNING("Purge: removed prior [SEED] content and schedules."))

    def _get_or_create_user(self, email, username, role, password):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "role": role,
                "first_name": "Demo",
                "last_name": role.title(),
                "status": "active",
                "email_verified": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.NOTICE(f"Created {email}"))
        else:
            user.role = role
            user.status = "active"
            user.save()
        return user

    def _seed_categories(self):
        """Top-level categories for aviation cyber content."""
        specs = [
            ("GNSS & PNT Resilience", "gnss-pnt-resilience", "Spoofing, jamming, and integrity for GNSS users."),
            ("ATM & datalink security", "atm-datalink-security", "ADS-B, ACARS, SWIM, and fusion integrity."),
            ("SOC & enterprise IR", "soc-enterprise-ir", "Phishing, ransomware, and continuity for flight ops IT."),
            ("Human factors & CRM", "human-factors-crm", "Crew coordination under cyber-physical ambiguity."),
        ]
        out = []
        for order, (name, slug, desc) in enumerate(specs):
            cat, _ = ContentCategory.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": f"{SEED_PREFIX} {name}",
                    "description": desc,
                    "icon": "shield",
                    "order": order,
                    "is_active": True,
                },
            )
            out.append(cat)
        return out

    def _seed_materials(self, author, categories):
        """Published learning materials with realistic markdown bodies."""
        specs = [
            {
                "title": f"{SEED_PREFIX} GNSS integrity indicators in Part 121 ops",
                "cat": 0,
                "mtype": "article",
                "diff": "intermediate",
                "minutes": 18,
                "tags": ["GNSS", "Part121", "ICAO", "skyshield_seed"],
                "body": """# GNSS integrity in airline operations

## Why it matters
GNSS is a primary navigation input but is **spoofable** and **jamable**. Crews must treat position disagreement as a potential cyber or RF environment issue—not only a sensor fault.

## Crew actions
1. Cross-check FMS position against raw GPS, VOR/DME, and ATC radar cues when available.
2. Use plain-language phraseology when reporting uncertain navigation integrity.
3. After landing, preserve EFB / avionics data per company **chain-of-custody** for SOC and safety investigations.

## Further reading
See ICAO Doc 10071 and your operator's abnormal checklist for unreliable GNSS.
""",
            },
            {
                "title": f"{SEED_PREFIX} VHF guard misuse and malicious overlays",
                "cat": 0,
                "mtype": "article",
                "diff": "beginner",
                "minutes": 12,
                "tags": ["VHF", "121.5", "COM", "skyshield_seed"],
                "body": """# Guard frequency discipline

Malicious actors may **flood 121.5** or overlay plausible ATC clearances on company discrete frequencies.

## Verification habit
When a clearance is safety-critical, **verify on a known-good path** (previous sector frequency, SATVOICE, or company ops) before maneuvering.

## Cabin coordination
Unauthorized PA-like instructions should be **disregarded** after flight-deck confirmation via interphone.
""",
            },
            {
                "title": f"{SEED_PREFIX} ADS-B injection and fusion triage (ATC / NMCC)",
                "cat": 1,
                "mtype": "document",
                "diff": "advanced",
                "minutes": 25,
                "tags": ["ADS-B", "ASD-E", "fusion", "skyshield_seed"],
                "body": """# Sensor fusion under datalink suspicion

## Principle
Treat **uncorroborated ADS-B tracks** as advisory until primary/secondary radar or pilot reports align.

## Joint bridge
When IT logs correlate with scope anomalies, open a **joint ATC–SOC bridge** and snapshot configs per IR plan.

## Mitigation
Increase separation buffers for ADS-B-only targets until root cause is known.
""",
            },
            {
                "title": f"{SEED_PREFIX} Ransomware on dispatch clusters - playbook outline",
                "cat": 2,
                "mtype": "document",
                "diff": "intermediate",
                "minutes": 20,
                "tags": ["ransomware", "BCP", "dispatch", "skyshield_seed"],
                "body": """# Ransomware response (availability + confidentiality)

1. **Segment** affected VLANs; preserve firewall and host logs.
2. **Restore** from immutable snapshots into a **staged** environment; scan before cutover.
3. **Notify** privacy/legal when regulated passenger or crew PII may have been exposed.

Avoid mass reboots before scope is understood.
""",
            },
            {
                "title": f"{SEED_PREFIX} Video: briefing room checklist (7 min)",
                "cat": 3,
                "mtype": "video",
                "diff": "beginner",
                "minutes": 7,
                "tags": ["CRM", "briefing", "skyshield_seed"],
                "body": "Companion notes: assign roles for nav-source cross-check and designate who speaks to SOC after suspected cyber events.",
                "video_url": "https://example.com/skyshield/briefing-checklist-placeholder",
            },
            {
                "title": f"{SEED_PREFIX} External: FAA ASIAS & safety sharing",
                "cat": 1,
                "mtype": "link",
                "diff": "beginner",
                "minutes": 5,
                "tags": ["FAA", "ASIAS", "skyshield_seed"],
                "body": "Use your organization’s approved browser profile when accessing external safety portals.",
                "external_url": "https://www.faa.gov/data_research/asias/",
            },
        ]
        created = []
        for idx, spec in enumerate(specs):
            cat = categories[spec["cat"]]
            title = spec["title"]
            mat, was_created = LearningMaterial.objects.update_or_create(
                title=title,
                defaults={
                    "slug": _slug(title, idx),
                    "description": (spec["body"][:220] + "…") if len(spec["body"]) > 220 else spec["body"],
                    "content": spec["body"],
                    "author": author,
                    "category": cat,
                    "material_type": spec["mtype"],
                    "difficulty": spec["diff"],
                    "tags": spec["tags"],
                    "estimated_read_time": spec["minutes"],
                    "is_published": True,
                    "is_featured": idx == 0,
                    "published_at": timezone.now(),
                    "video_url": spec.get("video_url", ""),
                    "external_url": spec.get("external_url", ""),
                },
            )
            created.append(mat)
            action = "Created" if was_created else "Updated"
            self.stdout.write(f"  {action} material: {mat.title}")
        return created

    def _seed_glossary_faq(self, categories):
        terms = [
            (
                f"{SEED_PREFIX} GNSS spoofing",
                "GNSS",
                "Broadcast-like transmission of false GNSS-like signals causing receivers to compute incorrect position/time.",
            ),
            (
                f"{SEED_PREFIX} ADS-B OUT",
                "ADS-B",
                "Automatic Dependent Surveillance–Broadcast transmitted from aircraft, used by ATC and other aircraft.",
            ),
            (
                f"{SEED_PREFIX} SWIM",
                "",
                "System Wide Information Management; FAA/ATM information-sharing architecture for NAS data.",
            ),
            (
                f"{SEED_PREFIX} ACARS",
                "",
                "Aircraft Communications Addressing and Reporting System; datalink between aircraft and ground systems.",
            ),
            (
                f"{SEED_PREFIX} SOC",
                "",
                "Security Operations Center coordinating detection, analysis, and response for cyber incidents.",
            ),
        ]
        for term, abbr, definition in terms:
            GlossaryTerm.objects.update_or_create(
                term=term,
                defaults={
                    "abbreviation": abbr,
                    "definition": definition,
                    "category": categories[1] if categories else None,
                    "references": [],
                },
            )

        faqs = [
            (
                f"{SEED_PREFIX} How do I report a suspected GPS spoofing event?",
                "Use your operator’s safety reporting channel and include timestamps, frequencies in use, "
                "screenshots if policy allows, and whether ATC was informed.",
            ),
            (
                f"{SEED_PREFIX} Where can I find the mission WebSocket URL?",
                "POST /api/simulations/incidents/ returns `ws_url` (e.g. `/ws/mission/<run_id>/`) after starting a mission.",
            ),
            (
                f"{SEED_PREFIX} What is the difference between SimulationSession and IncidentRun?",
                "SimulationSession powers classic step-by-step sessions and course checkpoints; IncidentRun powers "
                "multi-phase missions with orchestrator scoring and Channels updates.",
            ),
        ]
        for order, (q, a) in enumerate(faqs):
            FAQ.objects.update_or_create(
                question=q,
                defaults={
                    "answer": a,
                    "category": categories[2] if categories else None,
                    "order": order,
                    "is_published": True,
                },
            )

    def _seed_learning_path(self, author, categories, materials):
        path, _ = LearningPath.objects.update_or_create(
            title=f"{SEED_PREFIX} Aviation cyber fundamentals path",
            defaults={
                "slug": _slug(f"{SEED_PREFIX} aviation-cyber-fundamentals", 0),
                "description": "Ordered readings from GNSS awareness through SOC basics; pairs with simulation missions.",
                "author": author,
                "category": categories[0],
                "difficulty": "intermediate",
                "tags": ["path", "skyshield_seed"],
                "estimated_duration": sum(m.estimated_read_time for m in materials[:4]),
                "is_published": True,
                "is_featured": True,
            },
        )
        path.materials.set(materials[:4])
        self.stdout.write(self.style.SUCCESS(f"Learning path: {path.title}"))

    def _ensure_tutor_profile(self, user):
        profile, created = TutorProfile.objects.get_or_create(
            user=user,
            defaults={
                "specialization": ["Aviation cybersecurity", "Incident response", "Crew resource management"],
                "bio": "Demo instructor profile for seeded teaching sessions and materials.",
                "qualifications": ["MSc Cybersecurity", "ATP"],
                "experience_years": 12,
            },
        )
        if created:
            self.stdout.write(self.style.NOTICE("Created TutorProfile for demo supervisor"))
        return profile

    def _seed_teaching_materials(self, tutor):
        items = [
            (
                f"{SEED_PREFIX} Slide deck: threat taxonomy for flight ops",
                "document",
                "intermediate",
                {"sections": [{"title": "Introduction", "bullets": ["GNSS", "COM", "Enterprise"]}]},
            ),
            (
                f"{SEED_PREFIX} Exercise: phishing triage worksheet",
                "exercise",
                "beginner",
                {"tasks": ["Identify look-alike domains", "Route to SOC", "Avoid payload execution"]},
            ),
            (
                f"{SEED_PREFIX} Quiz: datalink authenticity",
                "quiz",
                "advanced",
                {"questions": 10, "topics": ["ACARS", "ADS-B", "voice verify"]},
            ),
        ]
        out = []
        for title, mtype, diff, content in items:
            tm, _ = TeachingMaterial.objects.update_or_create(
                title=title,
                tutor=tutor,
                defaults={
                    "description": "Seeded tutor material for schedules and classroom flows.",
                    "material_type": mtype,
                    "difficulty": diff,
                    "content": content,
                    "tags": ["seed", "aviation-cyber"],
                    "duration_minutes": 45 if mtype == "document" else 20,
                    "is_published": True,
                    "is_featured": mtype == "document",
                },
            )
            out.append(tm)
        return out

    def _seed_teaching_sessions(self, tutor, materials):
        now = timezone.now()
        sessions = [
            (
                f"{SEED_PREFIX} Live: GNSS workshop (Zoom)",
                "workshop",
                "zoom",
                now + timedelta(days=2, hours=15),
                now + timedelta(days=2, hours=17),
                "https://zoom.us/j/0000000000",
            ),
            (
                f"{SEED_PREFIX} Q&A: SOC handoff procedures",
                "qanda",
                "teams",
                now + timedelta(days=5, hours=18),
                now + timedelta(days=5, hours=19),
                "https://teams.microsoft.com/l/meetup-join/placeholder",
            ),
            (
                f"{SEED_PREFIX} Internal: weekly sim debrief room",
                "live",
                "internal",
                now + timedelta(days=7, hours=14),
                now + timedelta(days=7, hours=15),
                "",
            ),
            (
                f"{SEED_PREFIX} Recorded: datalink integrity recap",
                "recorded",
                "custom",
                now + timedelta(days=-1, hours=10),
                now + timedelta(days=-1, hours=11),
                "https://training.skyshield.example/recordings/datalink-recap",
            ),
        ]
        for title, stype, platform, start, end, link in sessions:
            ts, _ = TeachingSession.objects.update_or_create(
                tutor=tutor,
                title=title,
                defaults={
                    "description": "Seeded schedule for calendar / tutor views.",
                    "session_type": stype,
                    "platform": platform,
                    "start_time": start,
                    "end_time": end,
                    "timezone": "UTC",
                    "meeting_link": link,
                    "max_attendees": 40,
                    "is_cancelled": False,
                },
            )
            if materials:
                ts.materials.set(materials[:2])
            if platform == "internal" and not ts.internal_meeting_id:
                try:
                    ts.create_internal_meeting()
                except Exception as exc:
                    logger.warning("create_internal_meeting failed for %s: %s", title, exc)
            self.stdout.write(f"  TeachingSession: {ts.title}")

    def _seed_meetings(self, host, trainee, tutor_profile):
        """Standalone video-room schedules (in addition to any internal sessions above)."""
        now = timezone.now()
        rows = [
            (
                f"{SEED_PREFIX} Monday safety sync",
                "briefing on recent ASIAS trends and cyber near-misses",
                now + timedelta(days=1, hours=9),
                now + timedelta(days=1, hours=9, minutes=45),
                "group",
            ),
            (
                f"{SEED_PREFIX} Thursday sim cohort debrief",
                "open discussion after mission runs; bring event IDs",
                now + timedelta(days=4, hours=16),
                now + timedelta(days=4, hours=17),
                "workshop",
            ),
            (
                f"{SEED_PREFIX} Office hours - instructor drop-in",
                "Ask questions on missions, materials, or certificates",
                now + timedelta(days=6, hours=12),
                now + timedelta(days=6, hours=13),
                "one_on_one",
            ),
        ]
        for title, desc, start, end, mtype in rows:
            meeting, _ = Meeting.objects.update_or_create(
                title=title,
                host=host,
                defaults={
                    "description": desc,
                    "scheduled_start": start,
                    "scheduled_end": end,
                    "tutor_profile": tutor_profile,
                    "meeting_type": mtype,
                    "status": "scheduled",
                    "max_participants": 30,
                    "allow_recording": True,
                    "allow_chat": True,
                    "allow_screen_share": True,
                },
            )

            MeetingParticipant.objects.get_or_create(
                meeting=meeting,
                user=host,
                defaults={
                    "role": "host",
                    "status": "invited",
                    "invited_at": timezone.now(),
                },
            )
            MeetingParticipant.objects.get_or_create(
                meeting=meeting,
                user=trainee,
                defaults={
                    "role": "participant",
                    "status": "invited",
                    "invited_at": timezone.now(),
                },
            )
            self.stdout.write(f"  Meeting: {meeting.title} ({meeting.meeting_code})")
