# deep_swagger_debug.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet
import inspect
import traceback

def debug_swagger_generation():
    """Try to generate swagger and catch the exact error location"""
    from drf_yasg.generators import OpenAPISchemaGenerator
    from drf_yasg import openapi
    from django.test import RequestFactory
    
    factory = RequestFactory()
    request = factory.get('/')
    
    generator = OpenAPISchemaGenerator(
        info=openapi.Info(
            title="API",
            default_version='v1',
        ),
        patterns=get_resolver().url_patterns,
    )
    
    try:
        schema = generator.get_schema(request=request, public=True)
        print("✅ Swagger generation successful!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        return False

def find_all_views():
    """Find all views and their decorators"""
    resolver = get_resolver()
    
    def collect_views(urlpatterns, prefix='', views_list=None):
        if views_list is None:
            views_list = []
        
        for pattern in urlpatterns:
            if isinstance(pattern, URLResolver):
                collect_views(pattern.url_patterns, prefix + str(pattern.pattern), views_list)
            elif isinstance(pattern, URLPattern):
                if pattern.callback:
                    views_list.append({
                        'pattern': prefix + str(pattern.pattern),
                        'callback': pattern.callback,
                        'name': pattern.name
                    })
        return views_list
    
    return collect_views(resolver.url_patterns)

def inspect_view_details(view_info):
    """Detailed inspection of a view"""
    callback = view_info['callback']
    issues = []
    
    # Handle ViewSet
    if hasattr(callback, 'cls') and hasattr(callback, 'actions'):
        view_class = callback.cls
        actions = callback.actions
        
        for method, action_name in actions.items():
            if hasattr(view_class, action_name):
                action_method = getattr(view_class, action_name)
                
                # Check method signature and decorators
                print(f"\n📌 Checking: {view_class.__name__}.{action_name} [{method.upper()}]")
                print(f"   URL: {view_info['pattern']}")
                
                # Check for swagger_auto_schema
                if hasattr(action_method, '_swagger_auto_schema'):
                    schema = action_method._swagger_auto_schema
                    print(f"   Has swagger_auto_schema: YES")
                    
                    if 'manual_parameters' in schema:
                        print(f"   manual_parameters: {len(schema['manual_parameters'])} parameters")
                    if 'request_body' in schema:
                        print(f"   request_body: YES")
                    
                    # Check for conflict
                    if 'manual_parameters' in schema and schema['manual_parameters'] and 'request_body' in schema and schema['request_body']:
                        issues.append({
                            'view': f"{view_class.__module__}.{view_class.__name__}.{action_name}",
                            'method': method,
                            'url': view_info['pattern']
                        })
    
    # Handle regular APIView
    elif hasattr(callback, 'view_class'):
        view_class = callback.view_class
        
        for method in ['get', 'post', 'put', 'patch', 'delete']:
            if hasattr(view_class, method):
                view_method = getattr(view_class, method)
                
                print(f"\n📌 Checking: {view_class.__name__}.{method} [{method.upper()}]")
                print(f"   URL: {view_info['pattern']}")
                
                if hasattr(view_method, '_swagger_auto_schema'):
                    schema = view_method._swagger_auto_schema
                    print(f"   Has swagger_auto_schema: YES")
                    
                    if 'manual_parameters' in schema:
                        print(f"   manual_parameters: {len(schema['manual_parameters'])} parameters")
                    if 'request_body' in schema:
                        print(f"   request_body: YES")
                    
                    # Check for conflict
                    if 'manual_parameters' in schema and schema['manual_parameters'] and 'request_body' in schema and schema['request_body']:
                        issues.append({
                            'view': f"{view_class.__module__}.{view_class.__name__}.{method}",
                            'method': method,
                            'url': view_info['pattern']
                        })
    
    return issues

def main():
    print("🔍 Deep Swagger Debug Mode\n")
    
    # First try to generate swagger
    print("Attempting swagger generation...")
    success = debug_swagger_generation()
    print()
    
    if not success:
        print("\n🔍 Scanning all views for potential issues...")
        all_views = find_all_views()
        
        all_issues = []
        for view_info in all_views:
            issues = inspect_view_details(view_info)
            all_issues.extend(issues)
        
        if all_issues:
            print("\n❌ Found views with potential issues:")
            for issue in all_issues:
                print(f"\n   View: {issue['view']}")
                print(f"   Method: {issue['method'].upper()}")
                print(f"   URL: {issue['url']}")
        else:
            print("\n✅ No views found with both manual_parameters and request_body")
            
            # Check for any views without parser_classes
            print("\n🔍 Checking for views without parser_classes...")
            from django.apps import apps
            import inspect
            
            for app_config in apps.get_app_configs():
                try:
                    views_module = __import__(f"{app_config.name}.views", fromlist=['*'])
                    for name, obj in inspect.getmembers(views_module):
                        if inspect.isclass(obj) and issubclass(obj, APIView):
                            if not hasattr(obj, 'parser_classes') or not obj.parser_classes:
                                print(f"⚠️  {app_config.name}.views.{name} has no parser_classes")
                except ImportError:
                    continue

if __name__ == '__main__':
    main()