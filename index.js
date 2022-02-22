const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);

    console.log(octokit);
}

main()
