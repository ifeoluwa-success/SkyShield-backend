from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Meeting, MeetingParticipant
from apps.users.models import UserActivity, UserNotification
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Meeting)
def meeting_created_handler(sender, instance, created, **kwargs):
    """Handle meeting creation events"""
    if created:
        logger.info(f"Meeting created: {instance.title} by {instance.host.email}")
        
        # Create notification for host
        UserNotification.objects.create(
            user=instance.host,
            type='success',
            title='Meeting Created',
            message=f'Your meeting "{instance.title}" has been scheduled for {instance.scheduled_start.strftime("%B %d, %Y at %I:%M %p")}',
            link=f'/meetings/{instance.id}'
        )


@receiver(post_save, sender=MeetingParticipant)
def participant_joined_handler(sender, instance, created, **kwargs):
    """Handle participant join events"""
    if created or (instance.status == 'connected' and not instance.joined_at):
        logger.info(f"Participant {instance.user.email} joined meeting {instance.meeting.title}")
        
        # Create activity log
        UserActivity.objects.create(
            user=instance.user,
            activity_type='meeting_joined',
            metadata={
                'meeting_id': str(instance.meeting.id),
                'meeting_title': instance.meeting.title,
                'role': instance.role
            }
        )


@receiver(pre_delete, sender=Meeting)
def meeting_deleted_handler(sender, instance, **kwargs):
    """Handle meeting deletion"""
    logger.info(f"Meeting deleted: {instance.title}")
    
    # Notify participants about cancellation
    for participant in instance.participants.filter(is_active=True):
        UserNotification.objects.create(
            user=participant.user,
            type='warning',
            title='Meeting Cancelled',
            message=f'The meeting "{instance.title}" scheduled for {instance.scheduled_start.strftime("%B %d, %Y at %I:%M %p")} has been cancelled.',
            link='/meetings'
        )