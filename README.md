# AI Code Review

A web application that uses Ollama's generate API to analyze code from GitHub and GitLab commits. The application provides detailed code analysis, including security vulnerabilities, code quality issues, and suggestions for improvements.

## Features

- Support for both GitHub and GitLab repositories
- Code analysis using Ollama's generate API
- Detailed analysis including:
  - Security vulnerabilities
  - Code quality issues
  - Simplification suggestions
  - Best practices violations
- Side-by-side code comparison
- Ability to apply suggested fixes
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed and running locally
- GitLab access token (for GitLab repositories)
- GitHub access token (optional, for private repositories)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aireview
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
```

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Select the platform (GitHub or GitLab)
3. Enter the project details:
   - For GitHub: owner/repo format
   - For GitLab: project path
4. Enter the commit SHA you want to analyze
5. Select the Ollama model to use
6. Enter your access token if required
7. Click "Analyze Code" to start the analysis
8. Review the results and apply suggested fixes if desired

## Ollama Models

The application works with any Ollama model that can understand and analyze code. Recommended models include:
- codellama
- mistral
- llama2

Make sure you have the desired model pulled in Ollama before using it.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 