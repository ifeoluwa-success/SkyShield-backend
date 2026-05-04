from rest_framework import permissions


class IsMeetingHost(permissions.BasePermission):
    """Permission to only allow hosts of a meeting to edit it"""
    
    def has_object_permission(self, request, view, obj):
        return obj.host == request.user


class CanJoinMeeting(permissions.BasePermission):
    """Permission to check if user can join a meeting"""
    
    def has_object_permission(self, request, view, obj):
        # Admin can always join
        if request.user.role in ['admin', 'supervisor']:
            return True
        
        # Host can always join
        if obj.host == request.user:
            return True
        
        # Check if meeting is joinable
        if obj.status not in ['scheduled', 'live']:
            return False
        
        # Check if user is invited or meeting is public
        if obj.is_private:
            return obj.participants.filter(user=request.user).exists()
        
        return True


class IsParticipant(permissions.BasePermission):
    """Permission to check if user is a participant in the meeting"""
    
    def has_object_permission(self, request, view, obj):
        return obj.participants.filter(user=request.user, is_active=True).exists()