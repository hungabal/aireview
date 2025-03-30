const axios = require('axios');

async function analyzeCode(code, model) {
    if (!code || !model) {
        throw new Error('Code and model are required parameters');
    }

    try {
        // Check if Ollama is running
        const healthCheck = await axios.get('http://localhost:11434/api/tags')
            .catch(() => {
                throw new Error('Ollama service is not running. Please start Ollama first.');
            });

        // A prompt that strongly emphasizes returning pure JSON
        const prompt = `Te egy kifinomult kódelemző eszköz vagy. A következő kód analízisére kérnek:

\`\`\`
${code}
\`\`\`

FELADAT: Elemezd a kódot és azonosítsd a problémákat, majd adj javaslatokat a javításra.

FONTOS: Válaszod KIZÁRÓLAG a lenti JSON formátumban add meg, minden egyéb szöveg vagy magyarázat nélkül.
NE használj Markdown formázást (pl. \`\`\`json), csak tiszta JSON-t adj válaszul.

{
    "security_issues": [
        {
            "question": "Milyen biztonsági sebezhetőségek vannak jelen a kódban?",
            "answer": "Itt részletezd a biztonsági problémákat."
        }
    ],
    "quality_issues": [
        {
            "question": "Milyen kódminőségi problémák vannak jelen?",
            "answer": "Itt részletezd a kódminőségi problémákat."
        }
    ],
    "simplification_suggestions": [
        {
            "question": "Hogyan egyszerűsíthető ez a kód?",
            "answer": "Itt részletezd az egyszerűsítési javaslatokat."
        }
    ],
    "best_practices_violations": [
        {
            "question": "Mely legjobb gyakorlatokat sérti ez a kód?",
            "answer": "Itt részletezd a legjobb gyakorlatok megsértését."
        }
    ],
    "fixed_code": "Ez a javított kódot tartalmazó mező. Ide másold be a javított kódot."
}

INSTRUKCIÓK:
1. KIZÁRÓLAG a fenti JSON struktúrában válaszolj, semmi más szöveget ne adj hozzá
2. Válaszod csak a tiszta JSON objektum legyen
3. Használj részletes magyarázatokat az "answer" mezőkben
4. A "fixed_code" mezőbe az eredeti kód javított verzióját add meg`;

        console.log("Sending prompt to Ollama...");
        
        const response = await axios.post('http://localhost:11434/api/generate', {
            model: model,
            prompt: prompt,
            stream: false
        });

        if (!response.data || !response.data.response) {
            throw new Error('Invalid response from Ollama');
        }

        try {
            // Logging the whole response for debugging
            console.log("Received response from Ollama");
            
            // Extract valid JSON from the response
            const responseText = response.data.response;
            
            // Try to extract JSON from the response
            let jsonText = extractJsonFromText(responseText);
            
            // Try to parse the extracted JSON
            const analysis = JSON.parse(jsonText);
            
            // Validate the analysis object
            return ensureValidAnalysis(analysis, code);
        } catch (parseError) {
            // If JSON parsing fails, return a structured error response
            console.error('Failed to parse Ollama response:', parseError);
            console.log('Raw response:', response.data.response);
            return createDefaultErrorResponse(code);
        }
    } catch (error) {
        console.error('Error in code analysis:', error);
        throw new Error(error.message || 'Failed to analyze code. Please check if Ollama is running and try again.');
    }
}

// Function to extract JSON from text with multiple fallback methods
function extractJsonFromText(text) {
    // First attempt: Find the first { and last }
    if (text.includes('{') && text.includes('}')) {
        try {
            const startIdx = text.indexOf('{');
            const endIdx = text.lastIndexOf('}') + 1;
            if (startIdx >= 0 && endIdx > startIdx) {
                const potentialJson = text.substring(startIdx, endIdx);
                // Validate that this is parseable
                JSON.parse(potentialJson);
                return potentialJson;
            }
        } catch (e) {
            console.log("First extraction method failed:", e);
        }
    }
    
    // Second attempt: Try to find JSON between code fences
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[1]) {
        try {
            const potentialJson = match[1];
            // Validate that this is parseable
            JSON.parse(potentialJson);
            return potentialJson;
        } catch (e) {
            console.log("Second extraction method failed:", e);
        }
    }
    
    // If all else fails, return the original text
    return text;
}

// Helper function to validate and ensure a complete analysis object
function ensureValidAnalysis(analysis, originalCode) {
    // Default template for issues
    const defaultIssue = {
        question: "Milyen problémák vannak a kódban?", 
        answer: "Nincs részletes válasz ebben a kategóriában."
    };
    
    // Ensure all required keys are present with at least empty arrays
    if (!analysis.security_issues || !Array.isArray(analysis.security_issues) || analysis.security_issues.length === 0) {
        analysis.security_issues = [{ 
            question: "Milyen biztonsági sebezhetőségek vannak jelen a kódban?", 
            answer: "Nem találtam biztonsági sebezhetőségeket a kódban."
        }];
    }
    
    if (!analysis.quality_issues || !Array.isArray(analysis.quality_issues) || analysis.quality_issues.length === 0) {
        analysis.quality_issues = [{ 
            question: "Milyen kódminőségi problémák vannak jelen?", 
            answer: "Nem találtam kódminőségi problémákat."
        }];
    }
    
    if (!analysis.simplification_suggestions || !Array.isArray(analysis.simplification_suggestions) || analysis.simplification_suggestions.length === 0) {
        analysis.simplification_suggestions = [{ 
            question: "Hogyan egyszerűsíthető ez a kód?", 
            answer: "Nincs javaslatom a kód egyszerűsítésére."
        }];
    }
    
    if (!analysis.best_practices_violations || !Array.isArray(analysis.best_practices_violations) || analysis.best_practices_violations.length === 0) {
        analysis.best_practices_violations = [{ 
            question: "Mely legjobb gyakorlatokat sérti ez a kód?", 
            answer: "A kód nem sérti a legjobb gyakorlatokat."
        }];
    }
    
    // Make sure all issues have the right structure
    const ensureIssueStructure = (issue) => {
        if (typeof issue === 'string') {
            return {
                question: defaultIssue.question,
                answer: issue
            };
        } else if (!issue.question || !issue.answer) {
            return {
                question: issue.question || defaultIssue.question,
                answer: issue.answer || defaultIssue.answer
            };
        }
        return issue;
    };
    
    // Apply structure fix to all issue arrays
    analysis.security_issues = analysis.security_issues.map(ensureIssueStructure);
    analysis.quality_issues = analysis.quality_issues.map(ensureIssueStructure);
    analysis.simplification_suggestions = analysis.simplification_suggestions.map(ensureIssueStructure);
    analysis.best_practices_violations = analysis.best_practices_violations.map(ensureIssueStructure);
    
    // Make sure fixed_code exists
    if (!analysis.fixed_code) {
        analysis.fixed_code = originalCode;
    }
    
    return analysis;
}

// Create a default error response
function createDefaultErrorResponse(originalCode) {
    return {
        security_issues: [
            {
                question: "Milyen biztonsági sebezhetőségek vannak jelen a kódban?",
                answer: "Az AI válasz feldolgozásakor hiba történt. Kérjük, próbálja újra. A válasz nem volt megfelelő JSON formátumban."
            }
        ],
        quality_issues: [
            {
                question: "Milyen kódminőségi problémák vannak jelen?",
                answer: "Az AI válasz feldolgozásakor hiba történt. Kérjük, próbálja újra."
            }
        ],
        simplification_suggestions: [
            {
                question: "Hogyan egyszerűsíthető ez a kód?",
                answer: "Az AI válasz feldolgozásakor hiba történt. Kérjük, próbálja újra."
            }
        ],
        best_practices_violations: [
            {
                question: "Mely legjobb gyakorlatokat sérti ez a kód?",
                answer: "Az AI válasz feldolgozásakor hiba történt. Kérjük, próbálja újra."
            }
        ],
        fixed_code: originalCode // Return original code if parsing fails
    };
}

module.exports = {
    analyzeCode
}; 