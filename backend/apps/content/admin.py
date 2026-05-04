from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    ContentCategory, LearningMaterial, MaterialProgress, MaterialBookmark,
    MaterialComment, MaterialRating, MaterialView, MaterialDownload,
    MaterialLike, LearningPath, PathEnrollment, GlossaryTerm,
    FAQ, Announcement, AnnouncementRead
)


@admin.register(ContentCategory)
class ContentCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'order', 'material_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['order', 'is_active']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'slug', 'description', 'icon', 'parent')
        }),
        ('Settings', {
            'fields': ('order', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def material_count(self, obj):
        count = obj.get_material_count()
        url = reverse('admin:content_learningmaterial_changelist') + f'?category__id__exact={obj.id}'
        return format_html('<a href="{}">{}</a>', url, count)
    material_count.short_description = 'Materials'


@admin.register(LearningMaterial)
class LearningMaterialAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'material_type', 'category', 'difficulty',
        'author_link', 'views_count', 'average_rating', 'is_published_badge',
        'created_at'
    ]
    list_filter = ['material_type', 'difficulty', 'is_published', 'is_featured', 'category']
    search_fields = ['title', 'description', 'content', 'author__email', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = [
        'id', 'views_count', 'downloads_count', 'likes_count',
        'shares_count', 'average_rating', 'ratings_count', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    actions = ['publish_materials', 'unpublish_materials', 'feature_materials']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'slug', 'description', 'author')
        }),
        ('Classification', {
            'fields': ('material_type', 'category', 'difficulty', 'tags')
        }),
        ('Content', {
            'fields': ('content', 'file', 'video_url', 'external_url', 'featured_image', 'estimated_read_time')
        }),
        ('Status', {
            'fields': ('is_published', 'is_featured', 'published_at')
        }),
        ('Statistics', {
            'fields': ('views_count', 'downloads_count', 'likes_count', 'shares_count',
                      'average_rating', 'ratings_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def author_link(self, obj):
        if obj.author:
            url = reverse('admin:users_user_change', args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.email)
        return '-'
    author_link.short_description = 'Author'
    
    def is_published_badge(self, obj):
        if obj.is_published:
            return format_html('<span style="color:green;font-weight:bold;">✓ Published</span>')
        return format_html('<span style="color:orange;">✗ Draft</span>')
    is_published_badge.short_description = 'Status'
    
    def publish_materials(self, request, queryset):
        updated = queryset.update(
            is_published=True,
            published_at=timezone.now()
        )
        self.message_user(request, f'{updated} materials published.')
    publish_materials.short_description = "Publish selected materials"
    
    def unpublish_materials(self, request, queryset):
        updated = queryset.update(is_published=False, published_at=None)
        self.message_user(request, f'{updated} materials unpublished.')
    unpublish_materials.short_description = "Unpublish selected materials"
    
    def feature_materials(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} materials featured.')
    feature_materials.short_description = "Feature selected materials"


@admin.register(MaterialProgress)
class MaterialProgressAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'material_link', 'progress_percentage', 'completed_badge', 'last_accessed']
    list_filter = ['completed', 'last_accessed']
    search_fields = ['user__email', 'user__username', 'material__title']
    readonly_fields = ['started_at', 'completed_at', 'last_accessed']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'
    
    def completed_badge(self, obj):
        if obj.completed:
            return format_html('<span style="color:green;">✓ Completed</span>')
        return format_html('<span style="color:orange;">⟳ In Progress</span>')
    completed_badge.short_description = 'Status'


@admin.register(MaterialBookmark)
class MaterialBookmarkAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'material_link', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'user__username', 'material__title']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'


@admin.register(MaterialLike)
class MaterialLikeAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'material_link', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'user__username', 'material__title']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'


@admin.register(MaterialComment)
class MaterialCommentAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'material_link', 'content_short', 'likes_count', 'created_at']
    list_filter = ['is_edited', 'is_deleted', 'created_at']
    search_fields = ['user__email', 'user__username', 'content', 'material__title']
    actions = ['soft_delete', 'restore']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = 'Comment'
    
    def soft_delete(self, request, queryset):
        updated = queryset.update(is_deleted=True)
        self.message_user(request, f'{updated} comments soft deleted.')
    soft_delete.short_description = "Soft delete selected comments"
    
    def restore(self, request, queryset):
        updated = queryset.update(is_deleted=False)
        self.message_user(request, f'{updated} comments restored.')
    restore.short_description = "Restore selected comments"


@admin.register(MaterialRating)
class MaterialRatingAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'material_link', 'rating_stars', 'review_short', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__email', 'user__username', 'review', 'material__title']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'
    
    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        colors = ['red', 'orange', 'yellow', 'lightgreen', 'green']
        return format_html('<span style="color: {};">{}</span>', colors[obj.rating-1], stars)
    rating_stars.short_description = 'Rating'
    
    def review_short(self, obj):
        return obj.review[:50] + '...' if len(obj.review) > 50 else obj.review
    review_short.short_description = 'Review'


@admin.register(MaterialView)
class MaterialViewAdmin(admin.ModelAdmin):
    list_display = ['user_display', 'material_link', 'viewed_at', 'duration_display', 'ip_address']
    list_filter = ['viewed_at']
    search_fields = ['user__email', 'user__username', 'material__title', 'ip_address']
    readonly_fields = ['viewed_at']
    date_hierarchy = 'viewed_at'
    
    def user_display(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Anonymous'
    user_display.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'
    
    def duration_display(self, obj):
        if obj.duration_seconds:
            minutes = obj.duration_seconds // 60
            seconds = obj.duration_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return '-'
    duration_display.short_description = 'Duration'


@admin.register(MaterialDownload)
class MaterialDownloadAdmin(admin.ModelAdmin):
    list_display = ['user_display', 'material_link', 'downloaded_at', 'ip_address']
    list_filter = ['downloaded_at']
    search_fields = ['user__email', 'user__username', 'material__title', 'ip_address']
    date_hierarchy = 'downloaded_at'
    
    def user_display(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Anonymous'
    user_display.short_description = 'User'
    
    def material_link(self, obj):
        url = reverse('admin:content_learningmaterial_change', args=[obj.material.id])
        return format_html('<a href="{}">{}</a>', url, obj.material.title)
    material_link.short_description = 'Material'


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'category', 'difficulty', 'material_count',
        'enrolled_count', 'completion_rate', 'is_published_badge',
        'created_at'
    ]
    list_filter = ['difficulty', 'is_published', 'is_featured', 'category']
    search_fields = ['title', 'description', 'author__email']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['id', 'enrolled_count', 'completion_rate', 'created_at', 'updated_at']
    actions = ['publish_paths', 'unpublish_paths', 'feature_paths']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'slug', 'description', 'author')
        }),
        ('Classification', {
            'fields': ('category', 'difficulty', 'tags')
        }),
        ('Content', {
            'fields': ('materials', 'estimated_duration', 'thumbnail', 'prerequisites')
        }),
        ('Status', {
            'fields': ('is_published', 'is_featured')
        }),
        ('Statistics', {
            'fields': ('enrolled_count', 'completion_rate'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def material_count(self, obj):
        return obj.get_material_count()
    material_count.short_description = 'Materials'
    
    def is_published_badge(self, obj):
        if obj.is_published:
            return format_html('<span style="color:green;font-weight:bold;">✓ Published</span>')
        return format_html('<span style="color:orange;">✗ Draft</span>')
    is_published_badge.short_description = 'Status'
    
    def publish_paths(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(request, f'{updated} paths published.')
    publish_paths.short_description = "Publish selected paths"
    
    def unpublish_paths(self, request, queryset):
        updated = queryset.update(is_published=False)
        self.message_user(request, f'{updated} paths unpublished.')
    unpublish_paths.short_description = "Unpublish selected paths"
    
    def feature_paths(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} paths featured.')
    feature_paths.short_description = "Feature selected paths"


@admin.register(PathEnrollment)
class PathEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'path_link', 'status_badge', 'progress_percentage', 'started_at', 'completed_at']
    list_filter = ['status', 'started_at', 'completed_at']
    search_fields = ['user__email', 'user__username', 'path__title']
    readonly_fields = ['started_at', 'last_accessed']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def path_link(self, obj):
        url = reverse('admin:content_learningpath_change', args=[obj.path.id])
        return format_html('<a href="{}">{}</a>', url, obj.path.title)
    path_link.short_description = 'Path'
    
    def status_badge(self, obj):
        colors = {
            'enrolled': 'blue',
            'in_progress': 'orange',
            'completed': 'green',
            'dropped': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def progress_percentage(self, obj):
        return f"{obj.calculate_progress():.1f}%"
    progress_percentage.short_description = 'Progress'


@admin.register(GlossaryTerm)
class GlossaryTermAdmin(admin.ModelAdmin):
    list_display = ['term', 'abbreviation', 'category', 'created_at', 'updated_at']
    list_filter = ['category']
    search_fields = ['term', 'definition', 'abbreviation']
    fieldsets = (
        ('Term Information', {
            'fields': ('term', 'abbreviation', 'definition', 'category')
        }),
        ('Relations', {
            'fields': ('related_terms', 'references')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question_short', 'category', 'order', 'views_count', 'is_published', 'is_published_badge', 'created_at']
    list_filter = ['category', 'is_published']
    search_fields = ['question', 'answer']
    list_editable = ['order', 'is_published']
    
    fieldsets = (
        ('FAQ Information', {
            'fields': ('question', 'answer', 'category')
        }),
        ('Settings', {
            'fields': ('order', 'is_published')
        }),
        ('Statistics', {
            'fields': ('views_count',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['views_count', 'created_at', 'updated_at']
    
    def question_short(self, obj):
        return obj.question[:75] + '...' if len(obj.question) > 75 else obj.question
    question_short.short_description = 'Question'
    
    def is_published_badge(self, obj):
        if obj.is_published:
            return format_html('<span style="color:green;">✓ Published</span>')
        return format_html('<span style="color:red;">✗ Unpublished</span>')
    is_published_badge.short_description = 'Status'


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority_badge', 'publish_from', 'publish_until', 'is_active_badge', 'created_at']
    list_filter = ['priority', 'is_active', 'publish_from']
    search_fields = ['title', 'content', 'created_by__email']
    date_hierarchy = 'publish_from'
    actions = ['activate_announcements', 'deactivate_announcements']
    
    fieldsets = (
        ('Announcement Information', {
            'fields': ('title', 'content', 'priority')
        }),
        ('Targeting', {
            'fields': ('target_roles', 'target_users')
        }),
        ('Schedule', {
            'fields': ('publish_from', 'publish_until')
        }),
        ('Status', {
            'fields': ('is_active', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def priority_badge(self, obj):
        colors = {
            'low': 'blue',
            'medium': 'orange',
            'high': 'red',
            'urgent': 'darkred',
        }
        color = colors.get(obj.priority, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 10px;">{}</span>',
            color, obj.get_priority_display()
        )
    priority_badge.short_description = 'Priority'
    
    def is_active_badge(self, obj):
        now = timezone.now()
        if obj.is_active and obj.publish_from <= now and (not obj.publish_until or obj.publish_until >= now):
            return format_html('<span style="color:green;">✓ Active</span>')
        return format_html('<span style="color:gray;">✗ Inactive</span>')
    is_active_badge.short_description = 'Status'
    
    def activate_announcements(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} announcements activated.')
    activate_announcements.short_description = "Activate selected announcements"
    
    def deactivate_announcements(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} announcements deactivated.')
    deactivate_announcements.short_description = "Deactivate selected announcements"
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AnnouncementRead)
class AnnouncementReadAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'announcement_link', 'read_at']
    list_filter = ['read_at']
    search_fields = ['user__email', 'user__username', 'announcement__title']
    
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def announcement_link(self, obj):
        url = reverse('admin:content_announcement_change', args=[obj.announcement.id])
        return format_html('<a href="{}">{}</a>', url, obj.announcement.title)
    announcement_link.short_description = 'Announcement'