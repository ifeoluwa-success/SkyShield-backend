from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """Allow access only to admin users"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsSupervisorOrAdmin(permissions.BasePermission):
    """Allow access to supervisors and admins"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role in ['supervisor', 'admin']


class IsTrainee(permissions.BasePermission):
    """Allow access only to trainees"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'trainee'


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow edit only to owners"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if object has user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsOwner(permissions.BasePermission):
    """Allow access only to owners"""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False