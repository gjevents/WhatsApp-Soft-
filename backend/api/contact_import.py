import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedPhone:
    raw: str
    normalized: str | None
    reason: str = ""


class IndiaPhoneRules:
    """India-specific rules behind a small interface that can be extended later."""

    country_code = "91"

    def normalize(self, raw: str) -> ParsedPhone:
        value = str(raw).strip()
        digits = re.sub(r"\D", "", value)
        if len(digits) == 12 and digits.startswith(self.country_code):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if len(digits) != 10:
            return ParsedPhone(value, None, "Must contain a 10-digit Indian mobile number")
        if digits[0] not in "6789":
            return ParsedPhone(value, None, "Indian mobile numbers must start with 6, 7, 8, or 9")
        return ParsedPhone(value, f"{self.country_code}{digits}")


PHONE_CANDIDATE = re.compile(r"(?<!\d)(?:\+?91[\s.-]*)?[6-9]\d(?:[\s.-]*\d){8}(?!\d)")


def parse_pasted_contacts(text: str, rules=None):
    rules = rules or IndiaPhoneRules()
    parsed = []
    matched_spans = []
    for match in PHONE_CANDIDATE.finditer(text or ""):
        parsed.append(rules.normalize(match.group(0)))
        matched_spans.append(match.span())

    # Tokens containing digits which were not part of a valid-looking candidate
    # are retained as invalids so users can see what was rejected.
    remainder = list(text or "")
    for start, end in matched_spans:
        remainder[start:end] = " " * (end - start)
    for token in re.split(r"[,;\t\n]+|\s{2,}", "".join(remainder)):
        token = token.strip()
        if token and any(ch.isdigit() for ch in token):
            parsed.append(rules.normalize(token))
    return parsed


def normalize_phone(raw):
    return IndiaPhoneRules().normalize(str(raw)).normalized
