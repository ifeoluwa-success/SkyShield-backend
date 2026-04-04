# apps/analytics/signals.py
# Comment out everything for now - we'll add signals after migrations
# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from simulations.models import SimulationSession
# from .services import AdaptiveLearningService

# @receiver(post_save, sender=SimulationSession)
# def update_performance_on_completion(sender, instance, created, **kwargs):
#     if instance.status == 'completed' and not created:
#         AdaptiveLearningService.update_user_profile(instance.user, instance)