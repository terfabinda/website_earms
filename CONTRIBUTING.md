## Contributing to ERMS
Thank you for your interest in contributing to the Electronic Research Management System (ERMS)! As an institutional platform, we maintain strict code quality, security protocols, and compliance standards to ensure stability across all university campuses.
By contributing to this project, you agree to abide by our repository terms and development workflows.

------------------------------

## 📑 Table of Contents

* Code of Conduct
* Getting Started
* Branching & Git Workflow
* Coding Standards & Style Guidelines
* Testing Requirements
* Pull Request Checklist

------------------------------
## 🤝 Code of Conduct
This project is governed by our Institutional Open Source Code of Conduct. We expect all contributors to maintain professional, inclusive, and constructive communication at all times. Academic integrity and security-first mindsets are mandatory.
------------------------------
## 🚀 Getting Started

   1. Find an Issue: Browse the GitHub issue tracker for open tasks. If you want to propose a new feature, open an issue detailing the request before writing any code.
   2. Fork and Clone: Fork the repository to your institutional account and clone it locally:
   
   git clone https://github.com
   
   3. Setup Environment: Follow the instructions in the README.md to set up your local Docker containers and install local React/Node node modules.

------------------------------
## 🌿 Branching & Git Workflow
We use a modified Gitflow workflow. All development must occur on feature branches branched off the main or develop branch.
## Branch Naming Conventions

* Features: feature/issue-#-short-description (e.g., feature/102-oauth2-logout)
* Bug Fixes: bugfix/issue-#-short-description (e.g., bugfix/45-sidebar-mobile-glitch)
* Documentation: docs/short-description (e.g., docs/update-api-endpoints)

## Commit Message Format
We enforce Conventional Commits to keep history clean and automate changelog generation:

<type>(<scope>): <short description>

[Optional body detailing the 'why' behind the change]
[Optional footer referencing the issue number, e.g., Closes #102]

Allowed Types:

* feat: A new feature for the user or system
* fix: A bug fix
* docs: Documentation changes only
* style: Formatting, missing semi-colons, etc. (no production code changes)
* refactor: A code change that neither fixes a bug nor adds a feature
* test: Adding missing tests or correcting existing tests

------------------------------
## 🎨 Coding Standards & Style Guidelines## Frontend (React & Tailwind)

* Architecture: Use functional components with hooks exclusively. Avoid legacy class components.
* Accessibility (a11y): All markup must be WCAG 2.1 AA compliant. Use proper semantic HTML (<main>, <nav>, <button>) and correct aria-* tags.
* Styling: Use explicit utility classes from Tailwind CSS. Avoid writing inline CSS or custom CSS sheets unless strictly necessary for third-party libraries.

## Backend (Microservices)

* State: Microservices must remain completely stateless. Store all persistent data in the database matrices or distributed caches (Redis).
* Security: Never hardcode database strings, OAuth client secrets, or keys. Always load values strictly through environment configurations (process.env).

------------------------------
## 🧪 Testing Requirements
We maintain a strict 80% code coverage minimum rule. Pull requests dropping below this metric will fail automated CI/CD pipeline checks.

* Unit Tests: Run unit evaluations locally before pushing code:

npm run test


* Integration Tests: Ensure API route validations and database connections work within your local Docker sandbox environment.
* Linting & Formatting: We use ESLint and Prettier to keep formatting universal. Run formatting checks using:

npm run lint

------------------------------
## 📋 Pull Request Checklist
Before opening your pull request, double-check that your branch complies with the following requirements:

* Branch is up to date with the upstream develop or main branch.
* All unit tests pass locally and coverage standards are maintained.
* The project builds successfully without generating environment console warnings.
* Sensitive files containing security configurations (.env, local certificates) have been filtered out completely via .gitignore.
* The PR description concisely outlines what changed, why it was changed, and references the appropriate tracking issue (e.g., Closes #12).

