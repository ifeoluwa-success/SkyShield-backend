from drf_yasg import openapi

api_info = openapi.Info(
    title="SkyShield Edu API",
    default_version="v1",
    description="API for SkyShield Educational Platform",
    terms_of_service="https://www.skyshield.com/terms/",
    contact=openapi.Contact(email="contact@skyshield.com"),
    license=openapi.License(name="BSD License"),
)