from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


def validate_meeting_times(start_time, end_time):
    """Validate meeting start and end times"""
    if start_time >= end_time:
        raise ValidationError("End time must be after start time")
    
    if start_time < timezone.now():
        raise ValidationError("Cannot schedule meetings in the past")
    
    max_duration = timedelta(hours=settings.MEETING_SETTINGS.get('MAX_MEETING_DURATION_HOURS', 4))
    if end_time - start_time > max_duration:
        raise ValidationError(f"Meeting duration cannot exceed {max_duration.total_seconds() / 3600} hours")
    
    return True


def validate_meeting_code(code):
    """Validate meeting code format"""
    if not code or len(code) < 5:
        raise ValidationError("Meeting code must be at least 5 characters")
    
    if not code.isalnum():
        raise ValidationError("Meeting code must contain only letters and numbers")
    
    return True