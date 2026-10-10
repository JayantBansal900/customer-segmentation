"""Structured, inspectable errors at analysis boundaries."""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ValidationIssue:
    """A problem with optional column and one-based source row locations."""

    code: str
    message: str
    column: str | None = None
    rows: tuple[int, ...] = ()


class AnalysisValidationError(ValueError):
    """Invalid user input; issues can be serialized without parsing text."""

    def __init__(self, issues: list[ValidationIssue], *, stage: str, context: dict | None = None):
        self.issues = tuple(issues)
        self.stage = stage
        self.context = context or {}
        super().__init__("; ".join(issue.message for issue in issues))

    def to_dict(self) -> dict:
        """Return a JSON-compatible error payload."""
        return {"stage": self.stage, "issues": [asdict(i) for i in self.issues], "context": self.context}


def invalid(code: str, message: str, *, stage: str, context: dict | None = None) -> AnalysisValidationError:
    """Construct a single-issue validation error."""
    return AnalysisValidationError([ValidationIssue(code, message)], stage=stage, context=context)
