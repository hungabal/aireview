const axios = require('axios');

async function fetchGitHubCommit(project, commit, token) {
    if (!project || !commit) {
        throw new Error('Project and commit are required parameters');
    }

    try {
        const [owner, repo] = project.split('/');
        if (!owner || !repo) {
            throw new Error('Invalid project format. Use "owner/repo" format for GitHub projects');
        }

        const headers = token ? { Authorization: `token ${token}` } : {};
        
        // First, get the commit details
        const commitResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits/${commit}`,
            { headers }
        ).catch(error => {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Repository or commit not found');
                } else if (error.response.status === 401) {
                    throw new Error('Invalid GitHub token or insufficient permissions');
                }
            }
            throw error;
        });

        // Then, get the files content
        const files = await Promise.all(
            commitResponse.data.files.map(async (file) => {
                try {
                    // For GitHub, we need to get the raw content URL
                    const rawUrl = file.raw_url || file.contents_url.replace('/contents/', '/raw/');
                    const contentResponse = await axios.get(rawUrl, { headers });
                    return {
                        filename: file.filename,
                        content: typeof contentResponse.data === 'string' ? contentResponse.data : JSON.stringify(contentResponse.data),
                        status: file.status
                    };
                } catch (error) {
                    console.error(`Error fetching file ${file.filename}:`, error);
                    return {
                        filename: file.filename,
                        content: '// Failed to fetch file content',
                        status: 'error'
                    };
                }
            })
        );

        return {
            commit: commitResponse.data.sha,
            message: commitResponse.data.commit.message,
            files: files.filter(file => file !== null)
        };
    } catch (error) {
        console.error('Error fetching GitHub commit:', error);
        throw new Error(error.message || 'Failed to fetch GitHub commit');
    }
}

async function fetchGitLabCommit(project, commit, token) {
    if (!project || !commit || !token) {
        throw new Error('Project, commit, and token are required parameters for GitLab');
    }

    try {
        const headers = { 'PRIVATE-TOKEN': token };
        const encodedProject = encodeURIComponent(project);
        
        // First, get the commit details
        const commitResponse = await axios.get(
            `https://gitlab.com/api/v4/projects/${encodedProject}/repository/commits/${commit}`,
            { headers }
        ).catch(error => {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Project or commit not found');
                } else if (error.response.status === 401) {
                    throw new Error('Invalid GitLab token or insufficient permissions');
                }
            }
            throw error;
        });

        // Get the list of changed files
        const diffResponse = await axios.get(
            `https://gitlab.com/api/v4/projects/${encodedProject}/repository/commits/${commit}/diff`,
            { headers }
        );

        // Fetch content for each changed file
        const files = await Promise.all(
            diffResponse.data.map(async (file) => {
                try {
                    const encodedFilePath = encodeURIComponent(file.new_path);
                    const contentResponse = await axios.get(
                        `https://gitlab.com/api/v4/projects/${encodedProject}/repository/files/${encodedFilePath}/raw?ref=${commit}`,
                        { headers }
                    );

                    return {
                        filename: file.new_path,
                        content: typeof contentResponse.data === 'string' ? contentResponse.data : JSON.stringify(contentResponse.data),
                        status: file.new_file ? 'added' : file.deleted_file ? 'removed' : 'modified'
                    };
                } catch (error) {
                    console.error(`Error fetching file ${file.new_path}:`, error);
                    return {
                        filename: file.new_path,
                        content: '// Failed to fetch file content',
                        status: 'error'
                    };
                }
            })
        );

        return {
            commit: commitResponse.data.id,
            message: commitResponse.data.message,
            files: files.filter(file => file !== null)
        };
    } catch (error) {
        console.error('Error fetching GitLab commit:', error);
        throw new Error(error.message || 'Failed to fetch GitLab commit');
    }
}

module.exports = {
    fetchGitHubCommit,
    fetchGitLabCommit
}; 