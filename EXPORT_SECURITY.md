# CSV export security

Customer exports (filtered Segments and all-customer Insights) and segment profile exports share `frontend/src/utils/csv.ts`. Formula-like **string** values get a visible `[text] ` prefix before standard CSV quoting/quote doubling. Detection checks `= + - @` after a detection-only NFKC normalization and removal of leading Unicode whitespace, control/format characters and quotes. The original string is retained after the marker. Numeric API values, including negative PCA coordinates, are unchanged.

Quoting alone does not prevent spreadsheet formula interpretation. The visible ASCII marker puts `[` at the decoded cell start and survives ordinary trimming and CSV parse/reserialization without relying on application-specific apostrophe/tab behavior. This changes the downloadable representation of risky IDs and other text. JSON and the customer explorer retain authoritative identifiers; never blindly remove markers from arbitrary data. Leading-zero IDs still require importing the column as text.

Tests decode real CSV with PapaParse, check field boundaries and the effective cell start, and serialize/reparse the decoded cells. They cover 19 threat inputs, every exported customer text field, profile text, and unchanged negative numeric coordinates. Native Excel/LibreOffice automation was not performed. CSV cannot guarantee fidelity and safety across every spreadsheet import/transformation; explicitly converting a protected cell back to a formula defeats this policy. Use API JSON for exact machine-readable identifiers.

Policy reference: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).
