require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { analyzeCode } = require('./services/codeAnalyzer');
const { fetchGitHubCommit, fetchGitLabCommit } = require('./services/gitService');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/analyze', async (req, res) => {
    try {
        const { platform, project, commit, model, token } = req.body;
        
        // Fetch commit data based on platform
        let commitData;
        if (platform === 'github') {
            commitData = await fetchGitHubCommit(project, commit, token);
        } else {
            commitData = await fetchGitLabCommit(project, commit, token);
        }

        // Analyze each file in the commit
        const analysisResults = [];
        for (const file of commitData.files) {
            const analysis = await analyzeCode(file.content, model);
            analysisResults.push({
                filename: file.filename,
                content: file.content,
                analysis: analysis
            });
        }

        res.render('results', { results: analysisResults });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { error: error.message });
    }
});

app.post('/apply-fix', async (req, res) => {
    try {
        const { filename, originalCode, fixedCode } = req.body;
        // Here you would implement the logic to apply the fix
        // This could involve creating a new commit with the fixed code
        res.json({ success: true, message: 'Fix applied successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 