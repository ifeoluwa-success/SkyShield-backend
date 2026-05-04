# config/spectacular_hooks.py

def deduplicate_operation_ids(result, generator, request, public):
    """
    Custom hook to handle operation ID deduplication.
    This is automatically handled by drf-spectacular, so this hook is optional.
    """
    return result