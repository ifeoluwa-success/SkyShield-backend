import warnings

from ..exceptions import AnymailDeprecationWarning
from .amazon_ses import EmailBackend as AmazonSESV2EmailBackend


class EmailBackend(AmazonSESV2EmailBackend):
    def __init__(self, **kwargs):
        warnings.warn(
            "Anymail now uses Amazon SES v2 by default. Please change"
            " 'amazon_sesv2' to 'amazon_ses' in your EMAIL_BACKEND setting.",
            AnymailDeprecationWarning,
        )
        super().__init__(**kwargs)
