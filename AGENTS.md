# Frontend Agent Rules

- Keep the Vite development server running at all times while working unless the user explicitly asks to stop it.
- After any frontend change, smoke test the affected UI before reporting completion.
- For smoke tests, confirm the dev server is listening, open or refresh `http://localhost:5173/`, and exercise the changed route or flow. Broaden the test when touching routing, auth, backend API integration, or shared components.
- Keep using small, focused commits and push frequently because multiple developers may edit the same files during the sprint.
