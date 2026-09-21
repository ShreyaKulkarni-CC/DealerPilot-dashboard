"""
Rapid Recon connector.

STATUS: intentionally stubbed further than the vAuto connector. The history
doc confirms Rapid Recon "API access" exists, but everything actually run so
far against Rapid Recon in this project (the recon/vendor-audit reports) went
through a browser session, not a REST API. Before writing any client code
here we need to confirm (task #3):
  1. Whether there is in fact a documented REST/SOAP API distinct from the
     browser-automation path, with its own credentials.
  2. If so: auth method (the API Credentials screen suggests client_credentials
     the same as vAuto, but that's the *platform's* pattern, not confirmed
     specifically for Rapid Recon yet), token/base URLs, and resource paths
     for recon status / work items.

Nothing below is called by the app yet.
"""

from app.config import Settings


class RapidReconNotConfiguredError(RuntimeError):
    pass


class RapidReconClient:
    def __init__(self, settings: Settings):
        if not settings.rapidrecon_configured():
            raise RapidReconNotConfiguredError(
                "Rapid Recon API access is not yet confirmed/configured. See docs/INTEGRATION_TODO.md."
            )
        self._settings = settings
        # OAuth client + request methods to be added once auth pattern is confirmed.
