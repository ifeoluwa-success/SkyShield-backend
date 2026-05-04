from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


# ==============================================================================
# CONTENT CATEGORY
# ==============================================================================

class ContentCategory(models.Model):
    """
    Hierarchical category system for learning materials.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'content_categories'
        ordering = ['order', 'name']
        verbose_name = 'Content Category'
        verbose_name_plural = 'Content Categories'

    def __str__(self):
        return self.name

    def get_material_count(self):
        return self.materials.filter(is_published=True).count()


# ==============================================================================
# LEARNING MATERIAL
# ==============================================================================

class LearningMaterial(models.Model):
    """
    Core content item — articles, videos, documents, etc.
    """
    MATERIAL_TYPE_CHOICES = (
        ('article', 'Article'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('quiz', 'Quiz'),
        ('simulation', 'Simulation'),
        ('audio', 'Audio'),
        ('presentation', 'Presentation'),
        ('link', 'External Link'),
        ('other', 'Other'),
    )

    DIFFICULTY_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=280)
    description = models.TextField(blank=True)
    content = models.TextField(blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='authored_materials'
    )
    category = models.ForeignKey(
        ContentCategory,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='materials'
    )

    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE_CHOICES, default='article')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    tags = models.JSONField(default=list, blank=True)

    # Media / files
    file = models.FileField(upload_to='learning_materials/', null=True, blank=True)
    video_url = models.URLField(blank=True)
    external_url = models.URLField(blank=True)
    featured_image = models.ImageField(upload_to='material_images/', null=True, blank=True)
    estimated_read_time = models.PositiveIntegerField(default=0, help_text='Minutes')

    # Publishing
    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    # Counters (denormalized)
    views_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0)
    shares_count = models.PositiveIntegerField(default=0)
    average_rating = models.FloatField(default=0.0)
    ratings_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_materials'
        indexes = [
            models.Index(fields=['category', 'is_published']),
            models.Index(fields=['material_type', 'difficulty']),
            models.Index(fields=['-created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Learning Material'
        verbose_name_plural = 'Learning Materials'

    def __str__(self):
        return self.title


# ==============================================================================
# MATERIAL INTERACTIONS
# ==============================================================================

class MaterialProgress(models.Model):
    """Tracks a user's reading/viewing progress on a material."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='material_progress'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='user_progress'
    )
    progress_percentage = models.FloatField(default=0.0)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'material_progress'
        unique_together = ['user', 'material']
        verbose_name = 'Material Progress'
        verbose_name_plural = 'Material Progress Records'

    def __str__(self):
        return f"{self.user.email} - {self.material.title} ({self.progress_percentage:.0f}%)"


class MaterialBookmark(models.Model):
    """A user bookmarking a material for later."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='bookmarks'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'material_bookmarks'
        unique_together = ['user', 'material']
        verbose_name = 'Material Bookmark'
        verbose_name_plural = 'Material Bookmarks'

    def __str__(self):
        return f"{self.user.email} → {self.material.title}"


class MaterialLike(models.Model):
    """A user liking a material."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='material_likes'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'material_likes'
        unique_together = ['user', 'material']
        verbose_name = 'Material Like'
        verbose_name_plural = 'Material Likes'

    def __str__(self):
        return f"{self.user.email} liked {self.material.title}"


class MaterialComment(models.Model):
    """A comment left by a user on a material."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='material_comments'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='comments'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies'
    )
    content = models.TextField()
    likes_count = models.PositiveIntegerField(default=0)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'material_comments'
        ordering = ['-created_at']
        verbose_name = 'Material Comment'
        verbose_name_plural = 'Material Comments'

    def __str__(self):
        return f"{self.user.email} on {self.material.title}"


class MaterialRating(models.Model):
    """A star rating (1-5) and optional review for a material."""
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='material_ratings'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='ratings'
    )
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    review = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'material_ratings'
        unique_together = ['user', 'material']
        verbose_name = 'Material Rating'
        verbose_name_plural = 'Material Ratings'

    def __str__(self):
        return f"{self.user.email} rated {self.material.title}: {self.rating}★"


class MaterialView(models.Model):
    """Logs each view event for a material (anonymous or authenticated)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='material_views'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='views'
    )
    viewed_at = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'material_views'
        ordering = ['-viewed_at']
        verbose_name = 'Material View'
        verbose_name_plural = 'Material Views'

    def __str__(self):
        who = self.user.email if self.user else 'Anonymous'
        return f"{who} viewed {self.material.title}"


class MaterialDownload(models.Model):
    """Logs each download event for a material."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='material_downloads'
    )
    material = models.ForeignKey(
        LearningMaterial, on_delete=models.CASCADE, related_name='downloads'
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'material_downloads'
        ordering = ['-downloaded_at']
        verbose_name = 'Material Download'
        verbose_name_plural = 'Material Downloads'

    def __str__(self):
        who = self.user.email if self.user else 'Anonymous'
        return f"{who} downloaded {self.material.title}"


# ==============================================================================
# LEARNING PATH
# ==============================================================================

class LearningPath(models.Model):
    """An ordered collection of learning materials forming a curriculum."""
    DIFFICULTY_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=280)
    description = models.TextField(blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='authored_paths'
    )
    category = models.ForeignKey(
        ContentCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='learning_paths'
    )
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    tags = models.JSONField(default=list, blank=True)

    materials = models.ManyToManyField(LearningMaterial, blank=True, related_name='learning_paths')
    estimated_duration = models.PositiveIntegerField(default=0, help_text='Minutes')
    thumbnail = models.ImageField(upload_to='path_thumbnails/', null=True, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)

    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    enrolled_count = models.PositiveIntegerField(default=0)
    completion_rate = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_paths'
        ordering = ['-created_at']
        verbose_name = 'Learning Path'
        verbose_name_plural = 'Learning Paths'

    def __str__(self):
        return self.title

    def get_material_count(self):
        return self.materials.count()


class PathEnrollment(models.Model):
    """Records a user's enrolment in a learning path."""
    STATUS_CHOICES = (
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='path_enrollments'
    )
    path = models.ForeignKey(
        LearningPath, on_delete=models.CASCADE, related_name='enrollments'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed = models.DateTimeField(auto_now=True)
    completed_materials = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'path_enrollments'
        unique_together = ['user', 'path']
        verbose_name = 'Path Enrollment'
        verbose_name_plural = 'Path Enrollments'

    def __str__(self):
        return f"{self.user.email} → {self.path.title} ({self.status})"

    def calculate_progress(self):
        total = self.path.materials.count()
        if total == 0:
            return 0.0
        completed = len(self.completed_materials) if self.completed_materials else 0
        return (completed / total) * 100


# ==============================================================================
# GLOSSARY
# ==============================================================================

class GlossaryTerm(models.Model):
    """A cybersecurity / domain glossary entry."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    term = models.CharField(max_length=200, unique=True)
    abbreviation = models.CharField(max_length=50, blank=True)
    definition = models.TextField()
    category = models.ForeignKey(
        ContentCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='glossary_terms'
    )
    related_terms = models.ManyToManyField('self', blank=True, symmetrical=True)
    references = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'glossary_terms'
        ordering = ['term']
        verbose_name = 'Glossary Term'
        verbose_name_plural = 'Glossary Terms'

    def __str__(self):
        return self.term


# ==============================================================================
# FAQ
# ==============================================================================

class FAQ(models.Model):
    """Frequently asked questions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    answer = models.TextField()
    category = models.ForeignKey(
        ContentCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='faqs'
    )
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faqs'
        ordering = ['order', 'created_at']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question[:80]


# ==============================================================================
# ANNOUNCEMENTS
# ==============================================================================

class Announcement(models.Model):
    """Platform-wide or role-targeted announcements."""
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')

    target_roles = models.JSONField(default=list, blank=True)
    target_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='targeted_announcements'
    )

    publish_from = models.DateTimeField(default=timezone.now)
    publish_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_announcements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-publish_from']
        verbose_name = 'Announcement'
        verbose_name_plural = 'Announcements'

    def __str__(self):
        return self.title


class AnnouncementRead(models.Model):
    """Tracks which users have read a given announcement."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='announcement_reads'
    )
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name='reads'
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_reads'
        unique_together = ['user', 'announcement']
        verbose_name = 'Announcement Read'
        verbose_name_plural = 'Announcement Reads'

    def __str__(self):
        return f"{self.user.email} read '{self.announcement.title}'"