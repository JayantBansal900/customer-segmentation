"""Explicit local-service limits and development origins."""

from dataclasses import dataclass, field
import os
import ipaddress
import re
from pathlib import Path
from urllib.parse import urlsplit

MAX_K = 50
MAX_CANDIDATES = 10


@dataclass(frozen=True)
class Settings:
    """Trusted server settings; dataset paths are never accepted from clients."""

    repository_root: Path = field(default_factory=lambda: Path(__file__).resolve().parents[1])
    max_upload_bytes: int = 64 * 1024 * 1024
    multipart_overhead_bytes: int = 1024 * 1024
    max_xlsx_expanded_bytes: int = 512 * 1024 * 1024
    max_concurrent_analyses: int = 1
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")
    silhouette_sample_size: int = 1000

    def __post_init__(self) -> None:
        for name in ("max_upload_bytes", "multipart_overhead_bytes", "max_xlsx_expanded_bytes", "max_concurrent_analyses"):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise ValueError(f"{name} must be a positive integer")
        if not 2 <= self.silhouette_sample_size <= 1000:
            raise ValueError("silhouette_sample_size must be 2..1000")
        for origin in self.cors_origins:
            parsed = urlsplit(origin)
            host = parsed.hostname or ''
            try:
                address = ipaddress.ip_address(host)
                valid_host, local = True, address.is_loopback
            except ValueError:
                valid_host = len(host) <= 253 and all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in host.split('.'))
                local = host == 'localhost'
            if (not valid_host or parsed.scheme not in {'http', 'https'}
                    or (parsed.scheme == 'http' and not local)
                    or parsed.path or '?' in origin or '#' in origin
                    or parsed.username is not None or parsed.password is not None
                    or any(character.isspace() for character in origin)):
                raise ValueError('CORS origins must be explicit HTTPS origins (HTTP only on loopback), without paths, wildcards or credentials')
            _ = parsed.port  # Malformed ports fail startup.

    @property
    def example_dataset(self) -> Path:
        """Resolve the bundled workbook independently of working directory."""
        return self.repository_root / "Online Retail.xlsx"

    @property
    def max_request_bytes(self) -> int:
        """Entire streamed request budget, including multipart overhead."""
        return self.max_upload_bytes + self.multipart_overhead_bytes

    @classmethod
    def from_env(cls) -> "Settings":
        """Load optional SEGMENTIQ settings; invalid settings fail startup."""
        origins = os.getenv("SEGMENTIQ_CORS_ORIGINS")
        return cls(
            max_upload_bytes=int(os.getenv("SEGMENTIQ_MAX_UPLOAD_BYTES", str(64 * 1024 * 1024))),
            multipart_overhead_bytes=int(os.getenv("SEGMENTIQ_MULTIPART_OVERHEAD_BYTES", str(1024 * 1024))),
            max_xlsx_expanded_bytes=int(os.getenv("SEGMENTIQ_MAX_XLSX_EXPANDED_BYTES", str(512 * 1024 * 1024))),
            max_concurrent_analyses=int(os.getenv("SEGMENTIQ_MAX_CONCURRENT_ANALYSES", "1")),
            cors_origins=tuple(s.strip() for s in origins.split(",") if s.strip()) if origins is not None else cls().cors_origins,
        )
