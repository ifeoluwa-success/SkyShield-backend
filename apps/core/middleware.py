import time
import json
import logging
import traceback
from django.utils import timezone
from django.db import connection
from .models import APILog, ErrorLog, AuditLog

logger = logging.getLogger(__name__)

class RequestLogMiddleware:
    """Middleware to log all requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Start timer
        start_time = time.time()
        
        # Store request body for logging
        request_body = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                request_body = json.loads(request.body) if request.body else {}
            except:
                request_body = {'error': 'Could not parse JSON'}
        
        # Process request
        response = self.get_response(request)
        
        # Calculate duration
        duration = (time.time() - start_time) * 1000  # in milliseconds
        
        # Log API request if it's an API endpoint
        if request.path.startswith('/api/'):
            try:
                response_body = None
                if hasattr(response, 'data'):
                    response_body = response.data
                elif hasattr(response, 'content') and response['content-type'] == 'application/json':
                    try:
                        response_body = json.loads(response.content)
                    except:
                        response_body = {'error': 'Could not parse response'}
                
                APILog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    path=request.path,
                    method=request.method,
                    query_params=dict(request.GET.items()),
                    request_body=request_body,
                    response_status=response.status_code,
                    response_body=response_body,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    execution_time=duration
                )
            except Exception as e:
                logger.error(f"Error logging API request: {e}")
        
        # Add timing header in debug mode
        if connection.settings_dict.get('DEBUG'):
            response['X-Request-Time'] = f'{duration:.2f}ms'
        
        return response


class AuditLogMiddleware:
    """Middleware to log important actions"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Log login/logout actions
        if request.path.startswith('/api/auth/'):
            if request.path.endswith('/login/') and request.method == 'POST' and response.status_code == 200:
                self.create_audit_log(request, 'LOGIN', 'auth', 'User', request.user)
            elif request.path.endswith('/logout/') and request.method == 'POST' and response.status_code == 200:
                self.create_audit_log(request, 'LOGOUT', 'auth', 'User', request.user)
        
        return response
    
    def create_audit_log(self, request, action, app_name, model_name, obj=None):
        try:
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action=action,
                app_name=app_name,
                model_name=model_name,
                object_id=str(obj.id) if obj else '',
                object_repr=str(obj) if obj else '',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")


class ExceptionLogMiddleware:
    """Middleware to log exceptions"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        try:
            ErrorLog.objects.create(
                level='error',
                message=str(exception),
                traceback=traceback.format_exc(),
                url=request.path,
                method=request.method,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                data={
                    'query_params': dict(request.GET.items()),
                    'post_data': dict(request.POST.items()) if request.method == 'POST' else {}
                }
            )
        except:
            pass