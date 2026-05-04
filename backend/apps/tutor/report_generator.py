import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from django.utils import timezone
from django.db.models import Avg
from .models import TutorProfile, StudentProgress, Exercise, ExerciseAttempt, TeachingMaterial


def generate_student_performance_report(tutor, date_range=None, request=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=24,
        textColor=colors.HexColor('#1e293b'), alignment=TA_CENTER, spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=16,
        textColor=colors.HexColor('#3b82f6'), spaceAfter=12
    )
    normal_style = styles['Normal']

    story = []
    story.append(Paragraph("Student Performance Report", title_style))
    story.append(Paragraph(f"Generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
    story.append(Spacer(1, 0.2 * inch))

    students = StudentProgress.objects.filter(tutor=tutor).select_related('student')

    if date_range and date_range.get('start') and date_range.get('end'):
        story.append(Paragraph(f"Period: {date_range['start']} to {date_range['end']}", normal_style))
        story.append(Spacer(1, 0.2 * inch))

    total_students = students.count()
    avg_score = students.aggregate(Avg('average_score'))['average_score__avg'] or 0
    total_completed = sum(len(s.completed_materials or []) + len(s.completed_exercises or []) for s in students)

    story.append(Paragraph("Summary Statistics", heading_style))
    summary_data = [
        ["Total Students", str(total_students)],
        ["Average Score", f"{avg_score:.1f}%"],
        ["Total Completed Items", str(total_completed)],
    ]
    summary_table = Table(summary_data, colWidths=[2.5 * inch, 2.5 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph("Student Details", heading_style))
    student_data = [["Student Name", "Completed Materials", "Completed Exercises", "Avg Score", "Last Active"]]
    for s in students:
        student_data.append([
            s.student.get_full_name() or s.student.username,
            str(len(s.completed_materials or [])),
            str(len(s.completed_exercises or [])),
            f"{s.average_score:.1f}%",
            s.last_activity.strftime('%Y-%m-%d') if s.last_activity else 'N/A'
        ])

    student_table = Table(student_data, colWidths=[1.8 * inch, 1.2 * inch, 1.2 * inch, 1 * inch, 1.2 * inch])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(student_table)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_exercise_analytics_report(tutor, date_range=None, request=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=24,
        textColor=colors.HexColor('#1e293b'), alignment=TA_CENTER, spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=16,
        textColor=colors.HexColor('#8b5cf6'), spaceAfter=12
    )
    normal_style = styles['Normal']

    story = []
    story.append(Paragraph("Exercise Analytics Report", title_style))
    story.append(Paragraph(f"Generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
    story.append(Spacer(1, 0.2 * inch))

    exercises = Exercise.objects.filter(tutor=tutor, is_published=True)

    if date_range and date_range.get('start') and date_range.get('end'):
        story.append(Paragraph(f"Period: {date_range['start']} to {date_range['end']}", normal_style))
        story.append(Spacer(1, 0.2 * inch))

    total_exercises = exercises.count()
    total_attempts = ExerciseAttempt.objects.filter(exercise__tutor=tutor).count()
    avg_score_all = ExerciseAttempt.objects.filter(exercise__tutor=tutor).aggregate(Avg('score'))['score__avg'] or 0

    story.append(Paragraph("Summary", heading_style))
    summary_data = [
        ["Total Exercises", str(total_exercises)],
        ["Total Attempts", str(total_attempts)],
        ["Average Score Across All Attempts", f"{avg_score_all:.1f}%"],
    ]
    summary_table = Table(summary_data, colWidths=[2.5 * inch, 2.5 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph("Exercise Performance", heading_style))
    exercise_data = [["Title", "Type", "Questions", "Attempts", "Avg Score", "Pass Rate"]]
    for ex in exercises:
        attempts = ExerciseAttempt.objects.filter(exercise=ex)
        avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0
        pass_count = attempts.filter(passed=True).count()
        pass_rate = (pass_count / attempts.count() * 100) if attempts.count() > 0 else 0
        exercise_data.append([
            ex.title,
            ex.get_exercise_type_display(),
            str(len(ex.questions or [])),
            str(attempts.count()),
            f"{avg_score:.1f}%",
            f"{pass_rate:.1f}%"
        ])

    exercise_table = Table(exercise_data, colWidths=[1.5 * inch, 1.2 * inch, 0.8 * inch, 0.8 * inch, 1 * inch, 1 * inch])
    exercise_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(exercise_table)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_quarterly_review_report(tutor, date_range=None, request=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=24,
        textColor=colors.HexColor('#1e293b'), alignment=TA_CENTER, spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=16,
        textColor=colors.HexColor('#10b981'), spaceAfter=12
    )
    normal_style = styles['Normal']

    story = []
    story.append(Paragraph("Quarterly Review Report", title_style))
    story.append(Paragraph(f"Generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
    story.append(Spacer(1, 0.2 * inch))

    if date_range and date_range.get('start'):
        start_date = datetime.fromisoformat(date_range['start'])
        end_date = datetime.fromisoformat(date_range['end']) if date_range.get('end') else timezone.now()
    else:
        today = timezone.now()
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        start_date = datetime(today.year, quarter_month, 1)
        if quarter_month + 3 > 12:
            end_date = datetime(today.year + 1, 1, 1)
        else:
            end_date = datetime(today.year, quarter_month + 3, 1)

    story.append(Paragraph(f"Period: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}", normal_style))
    story.append(Spacer(1, 0.3 * inch))

    students = StudentProgress.objects.filter(tutor=tutor)
    exercises = Exercise.objects.filter(tutor=tutor)
    materials = TeachingMaterial.objects.filter(tutor=tutor)

    story.append(Paragraph("Quarterly Summary", heading_style))
    summary_data = [
        ["New Students", str(students.count())],
        ["Exercises Created", str(exercises.count())],
        ["Materials Uploaded", str(materials.count())],
        ["Total Student Progress", f"{students.aggregate(Avg('average_score'))['average_score__avg'] or 0:.1f}%"]
    ]
    summary_table = Table(summary_data, colWidths=[2.5 * inch, 2.5 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]))
    story.append(summary_table)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_content_analysis_report(tutor, date_range=None, request=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'], fontSize=24,
        textColor=colors.HexColor('#1e293b'), alignment=TA_CENTER, spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'], fontSize=16,
        textColor=colors.HexColor('#f59e0b'), spaceAfter=12
    )
    normal_style = styles['Normal']

    story = []
    story.append(Paragraph("Content Analysis Report", title_style))
    story.append(Paragraph(f"Generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
    story.append(Spacer(1, 0.2 * inch))

    materials = TeachingMaterial.objects.filter(tutor=tutor)

    story.append(Paragraph("Teaching Materials Performance", heading_style))
    material_data = [["Title", "Type", "Difficulty", "Views", "Downloads", "Avg Rating"]]
    for m in materials:
        material_data.append([
            m.title,
            m.get_material_type_display(),
            m.get_difficulty_display(),
            str(m.views_count),
            str(m.downloads_count),
            f"{m.average_rating:.1f}" if m.average_rating else 'N/A'
        ])

    material_table = Table(material_data, colWidths=[1.5 * inch, 1 * inch, 0.8 * inch, 0.6 * inch, 0.8 * inch, 0.8 * inch])
    material_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(material_table)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_report(tutor, report_type, date_range=None, request=None):
    if report_type == 'student_performance':
        return generate_student_performance_report(tutor, date_range, request)
    elif report_type == 'exercise_analytics':
        return generate_exercise_analytics_report(tutor, date_range, request)
    elif report_type == 'quarterly_review':
        return generate_quarterly_review_report(tutor, date_range, request)
    elif report_type == 'content_analysis':
        return generate_content_analysis_report(tutor, date_range, request)
    else:
        raise ValueError(f"Unknown report type: {report_type}")