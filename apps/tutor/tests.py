from apps.tutor.models import TutorProfile
from apps.users.models import User
user = User.objects.get(email='your_tutor_email@example.com')
tutor = TutorProfile.objects.get(user=user)
tutor.specialization = ['Cybersecurity', 'Aviation Security']
tutor.save()