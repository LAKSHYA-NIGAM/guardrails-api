# Changelog

All notable changes to **guardrails-api** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Real-time PII anonymization for 15+ entity types
- Sliding-window rate limiter with configurable thresholds
- Audit logging middleware for all moderation decisions
- Jest test suite covering all guardrail validators

### Fixed
- Fixed regex pattern for email detection false positives

### Changed
- Switched content moderation to weighted severity scoring

---

## [1.0.0] - 2025-01-01

### Added
- Initial public release of guardrails-api.
- Core feature implementation.
- README and project documentation.
- GitHub Actions CI pipeline.

[Unreleased]: https://github.com/LAKSHYA-NIGAM/guardrails-api/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/LAKSHYA-NIGAM/guardrails-api/releases/tag/v1.0.0
